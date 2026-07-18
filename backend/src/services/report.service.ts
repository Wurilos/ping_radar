import prisma from '../config/database';
import { AuthPayload } from '../middleware/auth.middleware';

interface ReportFilters {
  user?: AuthPayload;
  contractNumber?: string;
  days?: number;
}

interface DailyBucket {
  date: string;
  label: string;
  checks: number;
  successes: number;
  responseTotal: number;
  responseCount: number;
}

export class ReportService {
  private scopeFilter(user?: AuthPayload) {
    if (!user || user.role === 'ADMIN' || user.role === 'TECH') return {};
    return { clientId: user.clientId || 'none' };
  }

  private normalizeDays(value?: number): number {
    const parsed = Number(value || 30);
    if (!Number.isFinite(parsed)) return 30;
    return Math.min(90, Math.max(1, Math.trunc(parsed)));
  }

  private startOfDay(value: Date): Date {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private dateKey(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDay(value: Date): string {
    return value.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  async getOverview(filters: ReportFilters) {
    const days = this.normalizeDays(filters.days);
    const contractNumber = String(filters.contractNumber || '').trim();
    const scope = this.scopeFilter(filters.user);
    const equipmentWhere: any = {
      ...scope,
      ...(contractNumber ? { contractNumber } : {}),
    };

    const startDate = this.startOfDay(new Date(Date.now() - (days - 1) * 86_400_000));

    const [equipments, scopedContracts] = await Promise.all([
      prisma.equipment.findMany({
        where: equipmentWhere,
        include: {
          client: { select: { id: true, name: true, company: true } },
          maintenanceWindows: {
            where: { endAt: null },
            orderBy: { startAt: 'desc' },
            take: 1,
          },
        },
        orderBy: [{ uptimePercent: 'asc' }, { name: 'asc' }],
      }),
      prisma.equipment.findMany({
        where: { ...scope, contractNumber: { not: null } },
        select: {
          contractNumber: true,
          status: true,
          uptimePercent: true,
          avgResponseTime: true,
          client: { select: { name: true } },
        },
        orderBy: { contractNumber: 'asc' },
      }),
    ]);

    const equipmentIds = equipments.map(item => item.id);

    const [checks, alerts] = equipmentIds.length
      ? await Promise.all([
          prisma.equipmentCheck.findMany({
            where: {
              equipmentId: { in: equipmentIds },
              checkedAt: { gte: startDate },
            },
            select: {
              equipmentId: true,
              success: true,
              responseTime: true,
              checkedAt: true,
            },
            orderBy: { checkedAt: 'asc' },
          }),
          prisma.alert.findMany({
            where: {
              equipmentId: { in: equipmentIds },
              sentAt: { gte: startDate },
            },
            include: {
              equipment: {
                select: {
                  id: true,
                  name: true,
                  host: true,
                  contractNumber: true,
                  location: true,
                },
              },
            },
            orderBy: { sentAt: 'desc' },
          }),
        ])
      : [[], []];

    const daily = new Map<string, DailyBucket>();
    for (let offset = 0; offset < days; offset += 1) {
      const date = new Date(startDate.getTime() + offset * 86_400_000);
      const key = this.dateKey(date);
      daily.set(key, {
        date: key,
        label: this.formatDay(date),
        checks: 0,
        successes: 0,
        responseTotal: 0,
        responseCount: 0,
      });
    }

    for (const check of checks) {
      const bucket = daily.get(this.dateKey(check.checkedAt));
      if (!bucket) continue;
      bucket.checks += 1;
      if (check.success) bucket.successes += 1;
      if (check.responseTime != null && Number.isFinite(check.responseTime)) {
        bucket.responseTotal += check.responseTime;
        bucket.responseCount += 1;
      }
    }

    const dailyTrend = [...daily.values()].map(bucket => ({
      date: bucket.date,
      label: bucket.label,
      checks: bucket.checks,
      availability: bucket.checks > 0
        ? Number(((bucket.successes / bucket.checks) * 100).toFixed(2))
        : null,
      avgResponse: bucket.responseCount > 0
        ? Number((bucket.responseTotal / bucket.responseCount).toFixed(2))
        : null,
    }));

    const statusCounts = {
      total: equipments.length,
      online: equipments.filter(item => item.status === 'ONLINE').length,
      offline: equipments.filter(item => item.status === 'OFFLINE').length,
      unstable: equipments.filter(item => item.status === 'UNSTABLE').length,
      maintenance: equipments.filter(item => item.status === 'MAINTENANCE').length,
    };

    const avgUptime = equipments.length
      ? equipments.reduce((total, item) => total + item.uptimePercent, 0) / equipments.length
      : 100;
    const respondingEquipments = equipments.filter(item => item.avgResponseTime > 0);
    const avgResponseTime = respondingEquipments.length
      ? respondingEquipments.reduce((total, item) => total + item.avgResponseTime, 0) / respondingEquipments.length
      : 0;
    const successRate = checks.length
      ? (checks.filter(check => check.success).length / checks.length) * 100
      : 100;

    const alertSummary = {
      total: alerts.length,
      offline: alerts.filter(alert => alert.type === 'OFFLINE').length,
      online: alerts.filter(alert => alert.type === 'ONLINE').length,
      unstable: alerts.filter(alert => alert.type === 'UNSTABLE').length,
      delivered: alerts.filter(alert => alert.delivered).length,
      failed: alerts.filter(alert => !alert.delivered).length,
    };

    const contracts = new Map<string, {
      name: string;
      total: number;
      online: number;
      offline: number;
      unstable: number;
      maintenance: number;
      uptimeTotal: number;
      responseTotal: number;
      responseCount: number;
      clients: Set<string>;
    }>();

    for (const row of scopedContracts) {
      const name = String(row.contractNumber || '').trim();
      if (!name) continue;
      const current = contracts.get(name) || {
        name,
        total: 0,
        online: 0,
        offline: 0,
        unstable: 0,
        maintenance: 0,
        uptimeTotal: 0,
        responseTotal: 0,
        responseCount: 0,
        clients: new Set<string>(),
      };
      current.total += 1;
      current.uptimeTotal += row.uptimePercent;
      if (row.avgResponseTime > 0) {
        current.responseTotal += row.avgResponseTime;
        current.responseCount += 1;
      }
      if (row.status === 'ONLINE') current.online += 1;
      else if (row.status === 'OFFLINE') current.offline += 1;
      else if (row.status === 'UNSTABLE') current.unstable += 1;
      else if (row.status === 'MAINTENANCE') current.maintenance += 1;
      if (row.client?.name) current.clients.add(row.client.name);
      contracts.set(name, current);
    }

    const contractBreakdown = [...contracts.values()]
      .map(item => ({
        name: item.name,
        total: item.total,
        online: item.online,
        offline: item.offline,
        unstable: item.unstable,
        maintenance: item.maintenance,
        avgUptime: Number((item.uptimeTotal / Math.max(1, item.total)).toFixed(2)),
        avgResponseTime: item.responseCount
          ? Number((item.responseTotal / item.responseCount).toFixed(2))
          : 0,
        clients: [...item.clients].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      }))
      .sort((left, right) =>
        right.offline - left.offline
        || right.unstable - left.unstable
        || left.name.localeCompare(right.name, 'pt-BR'),
      );

    const ranking = equipments.map(item => ({
      id: item.id,
      internalId: item.internalId,
      name: item.name,
      host: item.host,
      status: item.status,
      contractNumber: item.contractNumber,
      clientName: item.client?.name || null,
      location: item.location,
      uptimePercent: Number(item.uptimePercent.toFixed(2)),
      avgResponseTime: Number(item.avgResponseTime.toFixed(2)),
      consecutiveFailures: item.consecutiveFailures,
      lastCheck: item.lastCheck,
      lastOnline: item.lastOnline,
      lastOffline: item.lastOffline,
      maintenanceReason: item.maintenanceWindows[0]?.reason || null,
    }));

    const criticalEquipments = ranking
      .filter(item => item.status === 'OFFLINE' || item.status === 'UNSTABLE')
      .sort((left, right) =>
        right.consecutiveFailures - left.consecutiveFailures
        || left.name.localeCompare(right.name, 'pt-BR'),
      )
      .slice(0, 8);

    return {
      generatedAt: new Date(),
      period: { days, startDate, endDate: new Date() },
      filter: { contractNumber: contractNumber || null },
      current: {
        ...statusCounts,
        avgUptime: Number(avgUptime.toFixed(2)),
        avgResponseTime: Number(avgResponseTime.toFixed(2)),
        successRate: Number(successRate.toFixed(2)),
        checks: checks.length,
        alerts: alerts.length,
      },
      alerts: alertSummary,
      dailyTrend,
      contractBreakdown,
      ranking,
      criticalEquipments,
      recentAlerts: alerts.slice(0, 8).map(alert => ({
        id: alert.id,
        type: alert.type,
        channel: alert.channel,
        delivered: alert.delivered,
        sentAt: alert.sentAt,
        message: alert.message,
        equipment: alert.equipment,
      })),
    };
  }
}

export const reportService = new ReportService();
