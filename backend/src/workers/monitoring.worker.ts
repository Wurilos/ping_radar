// ==============================================
// PingAlert Pro — Monitoring Worker
// ==============================================

import cron from 'node-cron';
import prisma from '../config/database';
import logger from '../config/logger';
import { config } from '../config';
import { pingCheck, CheckResult } from '../checks/ping.check';
import { httpCheck } from '../checks/http.check';
import { tcpCheck } from '../checks/tcp.check';
import { openVpnCheck } from '../checks/vpn.check';
import { notificationService } from '../services/notification.service';

class MonitoringWorker {
  private isRunning = false;
  private checkTimers: Map<string, NodeJS.Timeout> = new Map();
  private activeChecks: Set<string> = new Set();

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Monitoring worker already running');
      return;
    }

    this.isRunning = true;
    logger.info('🔄 Monitoring worker started');

    // Initial load of all equipment schedules
    await this.loadSchedules();

    // Refresh schedules every 30 seconds to pick up new/updated equipment
    cron.schedule('*/30 * * * * *', async () => {
      await this.loadSchedules();
    });
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    for (const [id, timer] of this.checkTimers.entries()) {
      clearInterval(timer);
    }
    this.checkTimers.clear();
    this.activeChecks.clear();
    logger.info('⏹️ Monitoring worker stopped');
  }

  private async loadSchedules(): Promise<void> {
    try {
      const equipments = await prisma.equipment.findMany({
        where: { monitoringEnabled: true },
        select: { id: true, checkInterval: true },
      });

      const activeIds = new Set(equipments.map(e => e.id));

      // Remove timers for equipment no longer being monitored
      for (const [id, timer] of this.checkTimers.entries()) {
        if (!activeIds.has(id)) {
          clearInterval(timer);
          this.checkTimers.delete(id);
          logger.debug(`Removed schedule for equipment ${id}`);
        }
      }

      // Add timers for new equipment
      for (const eq of equipments) {
        if (!this.checkTimers.has(eq.id)) {
          const intervalMs = (eq.checkInterval || config.monitoring.defaultCheckInterval) * 1000;
          
          // Stagger initial checks to avoid thundering herd
          const delay = Math.random() * Math.min(intervalMs, 5000);
          setTimeout(() => {
            if (!this.isRunning) return;
            
            // Run immediately, then schedule
            this.performCheck(eq.id);
            
            const timer = setInterval(() => {
              if (this.isRunning) this.performCheck(eq.id);
            }, intervalMs);
            
            this.checkTimers.set(eq.id, timer);
          }, delay);

          logger.debug(`Scheduled equipment ${eq.id} every ${eq.checkInterval}s`);
        }
      }
    } catch (error: any) {
      logger.error('Failed to load schedules', { error: error.message });
    }
  }

  async performCheck(equipmentId: string): Promise<CheckResult | null> {
    // Prevent concurrent checks for the same equipment
    if (this.activeChecks.has(equipmentId)) {
      return null;
    }

    this.activeChecks.add(equipmentId);

    try {
      const equipment = await prisma.equipment.findUnique({
        where: { id: equipmentId },
        include: { client: true },
      });

      if (!equipment || !equipment.monitoringEnabled) {
        this.activeChecks.delete(equipmentId);
        return null;
      }

      // Check if in maintenance
      if (equipment.status === 'MAINTENANCE') {
        this.activeChecks.delete(equipmentId);
        return null;
      }

      // Perform the appropriate check
      let result: CheckResult;

      switch (equipment.checkType) {
        case 'HTTP':
          result = await httpCheck(equipment.host);
          break;
        case 'TCP':
          result = await tcpCheck(equipment.host, equipment.port || 80);
          break;
        case 'OPENVPN':
          result = await openVpnCheck(equipment.host);
          break;
        case 'PING':
        default:
          result = await pingCheck(equipment.host);
          break;
      }

      // Process the result
      await this.processResult(equipment, result);

      return result;
    } catch (error: any) {
      logger.error(`Check failed for equipment ${equipmentId}`, { error: error.message });
      return null;
    } finally {
      this.activeChecks.delete(equipmentId);
    }
  }

  private async processResult(equipment: any, result: CheckResult): Promise<void> {
    const previousStatus = equipment.status;
    let newStatus = previousStatus;
    let alertSent = false;
    let alertChannel: string | undefined;
    let alertMessage: string | undefined;

    if (result.success) {
      // ---- SUCCESS ----
      const newConsecutiveFailures = 0;

      // Calculate running average response time
      const newAvgResponse = equipment.avgResponseTime > 0
        ? (equipment.avgResponseTime * 0.8 + (result.responseTime || 0) * 0.2)
        : (result.responseTime || 0);

      if (previousStatus === 'OFFLINE' || previousStatus === 'UNSTABLE') {
        // RECOVERY: Equipment came back online
        newStatus = 'ONLINE';

        logger.info(`✅ Equipment ${equipment.name} is BACK ONLINE`, {
          equipmentId: equipment.id,
          previousStatus,
        });

        // Send recovery alert
        try {
          await notificationService.sendOnlineAlert(equipment);
          alertSent = true;
          alertChannel = 'TELEGRAM,WHATSAPP';
          alertMessage = `Equipment ${equipment.name} recovered`;
        } catch (err: any) {
          logger.error('Recovery alert failed', { error: err.message });
        }
      } else {
        newStatus = 'ONLINE';
      }

      await prisma.equipment.update({
        where: { id: equipment.id },
        data: {
          status: newStatus,
          consecutiveFailures: newConsecutiveFailures,
          lastCheck: new Date(),
          lastOnline: new Date(),
          avgResponseTime: Math.round(newAvgResponse * 100) / 100,
        },
      });
    } else {
      // ---- FAILURE ----
      const newConsecutiveFailures = equipment.consecutiveFailures + 1;

      if (newConsecutiveFailures >= equipment.failThreshold && previousStatus !== 'OFFLINE') {
        // THRESHOLD REACHED: Mark as offline and send alert
        newStatus = 'OFFLINE';

        logger.warn(`🚨 Equipment ${equipment.name} is OFFLINE after ${newConsecutiveFailures} failures`, {
          equipmentId: equipment.id,
          error: result.error,
        });

        // Send offline alert
        try {
          await notificationService.sendOfflineAlert({
            ...equipment,
            consecutiveFailures: newConsecutiveFailures,
          });
          alertSent = true;
          alertChannel = 'TELEGRAM,WHATSAPP';
          alertMessage = `Equipment ${equipment.name} went offline`;
        } catch (err: any) {
          logger.error('Offline alert failed', { error: err.message });
        }
      } else if (newConsecutiveFailures > 0 && newConsecutiveFailures < equipment.failThreshold) {
        // Some failures but not enough for offline
        if (newConsecutiveFailures >= Math.ceil(equipment.failThreshold / 2)) {
          newStatus = 'UNSTABLE';
        }
      }

      await prisma.equipment.update({
        where: { id: equipment.id },
        data: {
          status: newStatus,
          consecutiveFailures: newConsecutiveFailures,
          lastCheck: new Date(),
          lastOffline: newStatus === 'OFFLINE' ? new Date() : equipment.lastOffline,
        },
      });
    }

    // Log the check result
    await prisma.equipmentCheck.create({
      data: {
        equipmentId: equipment.id,
        success: result.success,
        responseTime: result.responseTime,
        statusCode: result.statusCode,
        error: result.error,
        previousStatus,
        newStatus,
        alertSent,
        alertChannel,
        alertMessage,
      },
    });
  }

  // Manual test (single check, returns result immediately)
  async testEquipment(equipmentId: string): Promise<CheckResult | null> {
    return this.performCheck(equipmentId);
  }

  getStatus(): { running: boolean; monitoredCount: number; activeChecks: number } {
    return {
      running: this.isRunning,
      monitoredCount: this.checkTimers.size,
      activeChecks: this.activeChecks.size,
    };
  }
}

export const monitoringWorker = new MonitoringWorker();
