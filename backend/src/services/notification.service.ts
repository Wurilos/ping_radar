// ==============================================
// PingAlert Pro — Notification Service
// ==============================================

import prisma from '../config/database';
import logger from '../config/logger';
import { config } from '../config';
import { telegramService } from './telegram.service';
import { whatsappService } from './whatsapp.service';
import { webhookService } from './webhook.service';

export class NotificationService {
  isQuietHours(): boolean {
    if (!config.quietHours.enabled) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = config.quietHours.start.split(':').map(Number);
    const [endH, endM] = config.quietHours.end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  isInCooldown(equipment: any): boolean {
    if (!equipment.lastAlertSentAt) return false;
    const elapsed = (Date.now() - new Date(equipment.lastAlertSentAt).getTime()) / 1000;
    return elapsed < equipment.alertCooldown;
  }

  formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}min`;
    if (hours > 0) return `${hours}h ${minutes % 60}min`;
    if (minutes > 0) return `${minutes}min ${seconds % 60}s`;
    return `${seconds}s`;
  }

  async sendOfflineAlert(equipment: any): Promise<void> {
    if (this.isQuietHours()) {
      logger.info(`Quiet hours active, skipping alert for ${equipment.name}`);
      return;
    }

    if (this.isInCooldown(equipment)) {
      logger.info(`Alert cooldown active for ${equipment.name}`);
      return;
    }

    logger.info(`Sending OFFLINE alert for ${equipment.name}`);

    const promises: Promise<void>[] = [];

    if (equipment.telegramAlertEnabled) {
      promises.push(
        telegramService.sendOfflineAlert(equipment)
          .then(() => undefined)
          .catch(err => {
            logger.error('Telegram offline alert failed', { error: err.message });
          })
      );
    }

    if (equipment.whatsappAlertEnabled && whatsappService.isConfigured()) {
      promises.push(
        whatsappService.sendOfflineAlert(equipment)
          .then(() => undefined)
          .catch(err => {
            logger.error('WhatsApp offline alert failed', { error: err.message });
          })
      );
    }

    if (equipment.webhookAlertEnabled) {
      promises.push(
        webhookService.dispatch('equipment.offline', {
          equipmentId: equipment.id,
          internalId: equipment.internalId,
          name: equipment.name,
          host: equipment.host,
          client: equipment.client?.name,
          location: equipment.location,
          consecutiveFailures: equipment.consecutiveFailures,
        }).then(() => undefined).catch(err => {
          logger.error('Webhook offline dispatch failed', { error: err.message });
        })
      );
    }

    await Promise.allSettled(promises);

    await prisma.equipment.update({
      where: { id: equipment.id },
      data: { lastAlertSentAt: new Date() },
    });
  }

  async sendOnlineAlert(equipment: any): Promise<void> {
    const offlineDuration = equipment.lastOffline
      ? this.formatDuration(Date.now() - new Date(equipment.lastOffline).getTime())
      : 'N/A';

    logger.info(`Sending ONLINE alert for ${equipment.name}`);

    const promises: Promise<void>[] = [];

    if (equipment.telegramAlertEnabled) {
      promises.push(
        telegramService.sendOnlineAlert(equipment, offlineDuration)
          .then(() => undefined)
          .catch(err => {
            logger.error('Telegram online alert failed', { error: err.message });
          })
      );
    }

    if (equipment.whatsappAlertEnabled && whatsappService.isConfigured()) {
      promises.push(
        whatsappService.sendOnlineAlert(equipment, offlineDuration)
          .then(() => undefined)
          .catch(err => {
            logger.error('WhatsApp online alert failed', { error: err.message });
          })
      );
    }

    if (equipment.webhookAlertEnabled) {
      promises.push(
        webhookService.dispatch('equipment.online', {
          equipmentId: equipment.id,
          internalId: equipment.internalId,
          name: equipment.name,
          host: equipment.host,
          client: equipment.client?.name,
          offlineDuration,
        }).then(() => undefined).catch(err => {
          logger.error('Webhook online dispatch failed', { error: err.message });
        })
      );
    }

    await Promise.allSettled(promises);
  }

  async sendManualAlert(equipmentId: string, message: string, channels: string[]): Promise<{ results: any[] }> {
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      include: { client: true },
    });

    if (!equipment) throw new Error('Equipment not found');

    const results: any[] = [];

    for (const channel of channels) {
      try {
        let success = false;
        if (channel === 'TELEGRAM') {
          const chatId = equipment.client?.telegramChatId || config.telegram.defaultChatId;
          success = await telegramService.sendMessage(chatId, message);
        } else if (channel === 'WHATSAPP') {
          const to = equipment.client?.whatsapp || '';
          success = await whatsappService.sendMessage(to, message);
        }

        await prisma.alert.create({
          data: {
            equipmentId,
            type: 'MANUAL',
            channel,
            message,
            delivered: success,
          },
        });

        results.push({ channel, success });
      } catch (error: any) {
        results.push({ channel, success: false, error: error.message });
      }
    }

    return { results };
  }
}

export const notificationService = new NotificationService();
