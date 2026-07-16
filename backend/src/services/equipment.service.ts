// ==============================================
// PingAlert Pro — Equipment Service
// ==============================================

import prisma from '../config/database';
import logger from '../config/logger';
import { AuthPayload } from '../middleware/auth.middleware';

export class EquipmentService {
  // Apply client scope filter
  private scopeFilter(user?: AuthPayload) {
    if (!user || user.role === 'ADMIN' || user.role === 'TECH') return {};
    return { clientId: user.clientId || 'none' };
  }

  async findAll(params: {
    user?: AuthPayload;
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    clientId?: string;
    group?: string;
    checkType?: string;
  }) {
    const { user, page = 1, limit = 50, search, status, clientId, group, checkType } = params;
    const skip = (page - 1) * limit;
    const scope = this.scopeFilter(user);

    const where: any = { ...scope };
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (group) where.groupName = group;
    if (checkType) where.checkType = checkType;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { internalId: { contains: search } },
        { host: { contains: search } },
        { location: { contains: search } },
      ];
    }

    const [equipments, total] = await Promise.all([
      prisma.equipment.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, company: true } },
          _count: { select: { checks: true, alerts: true } },
        },
        orderBy: [
          { status: 'asc' },
          { name: 'asc' },
        ],
        skip,
        take: limit,
      }),
      prisma.equipment.count({ where }),
    ]);

    return {
      data: equipments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, user?: AuthPayload) {
    const scope = this.scopeFilter(user);
    const equipment = await prisma.equipment.findFirst({
      where: { id, ...scope },
      include: {
        client: true,
        escalationRules: { orderBy: { orderNum: 'asc' } },
        maintenanceWindows: { orderBy: { createdAt: 'desc' }, take: 5 },
        _count: { select: { checks: true, alerts: true } },
      },
    });

    if (!equipment) throw new Error('Equipment not found');
    return equipment;
  }

  async create(data: {
    internalId: string;
    name: string;
    host: string;
    checkType?: string;
    port?: number;
    location?: string;
    clientId?: string;
    groupName?: string;
    checkInterval?: number;
    failThreshold?: number;
    alertCooldown?: number;
    notes?: string;
    monitoringEnabled?: boolean;
    telegramAlertEnabled?: boolean;
    whatsappAlertEnabled?: boolean;
  }) {
    const existing = await prisma.equipment.findUnique({ where: { internalId: data.internalId } });
    if (existing) throw new Error('Internal ID already exists');

    const equipment = await prisma.equipment.create({
      data: {
        ...data,
        status: 'ONLINE',
        lastCheck: new Date(),
      },
      include: { client: { select: { id: true, name: true } } },
    });

    logger.info(`Equipment created: ${equipment.name}`, { equipmentId: equipment.id });
    return equipment;
  }

  async update(id: string, data: any) {
    const equipment = await prisma.equipment.update({
      where: { id },
      data,
      include: { client: { select: { id: true, name: true } } },
    });

    logger.info(`Equipment updated: ${equipment.name}`, { equipmentId: equipment.id });
    return equipment;
  }

  async delete(id: string) {
    const equipment = await prisma.equipment.delete({ where: { id } });
    logger.info(`Equipment deleted: ${equipment.name}`, { equipmentId: equipment.id });
    return equipment;
  }

  async deleteBulk(ids: string[]) {
    const result = await prisma.equipment.deleteMany({ where: { id: { in: ids } } });
    logger.info(`Bulk equipment delete executed`, { count: result.count, ids });
    return { success: true, count: result.count };
  }

  async setMaintenance(id: string, enabled: boolean, userId: string, reason?: string) {
    const equipment = await prisma.equipment.update({
      where: { id },
      data: {
        status: enabled ? 'MAINTENANCE' : 'ONLINE',
        monitoringEnabled: !enabled,
      },
    });

    if (enabled) {
      await prisma.maintenanceWindow.create({
        data: {
          equipmentId: id,
          reason: reason || 'Manual maintenance',
          startAt: new Date(),
          createdById: userId,
        },
      });
    } else {
      // Close open maintenance windows
      const openWindows = await prisma.maintenanceWindow.findMany({
        where: { equipmentId: id, endAt: null },
      });
      for (const w of openWindows) {
        await prisma.maintenanceWindow.update({
          where: { id: w.id },
          data: { endAt: new Date() },
        });
      }
    }

    logger.info(`Equipment ${enabled ? 'entered' : 'exited'} maintenance: ${equipment.name}`);
    return equipment;
  }

  async getStats(user?: AuthPayload) {
    const scope = this.scopeFilter(user);

    const [total, online, offline, unstable, maintenance] = await Promise.all([
      prisma.equipment.count({ where: scope }),
      prisma.equipment.count({ where: { ...scope, status: 'ONLINE' } }),
      prisma.equipment.count({ where: { ...scope, status: 'OFFLINE' } }),
      prisma.equipment.count({ where: { ...scope, status: 'UNSTABLE' } }),
      prisma.equipment.count({ where: { ...scope, status: 'MAINTENANCE' } }),
    ]);

    // Recent alerts (last 24h)
    const oneDayAgo = new Date(Date.now() - 86400000);
    const recentAlerts = await prisma.alert.count({
      where: {
        sentAt: { gte: oneDayAgo },
        equipment: scope.clientId ? { clientId: scope.clientId } : undefined,
      },
    });

    // Average uptime
    const equipments = await prisma.equipment.findMany({
      where: scope,
      select: { uptimePercent: true },
    });
    const avgUptime = equipments.length > 0
      ? equipments.reduce((sum, e) => sum + e.uptimePercent, 0) / equipments.length
      : 100;

    // Average response time
    const avgResponse = await prisma.equipment.aggregate({
      where: { ...scope, status: 'ONLINE' },
      _avg: { avgResponseTime: true },
    });

    return {
      total,
      online,
      offline,
      unstable,
      maintenance,
      recentAlerts,
      avgUptime: Math.round(avgUptime * 100) / 100,
      avgResponseTime: Math.round((avgResponse._avg.avgResponseTime || 0) * 100) / 100,
    };
  }

  async getGroups(user?: AuthPayload) {
    const scope = this.scopeFilter(user);
    const groups = await prisma.equipment.findMany({
      where: { ...scope, groupName: { not: null } },
      select: { groupName: true },
      distinct: ['groupName'],
    });
    return groups.map(g => g.groupName).filter(Boolean);
  }

  async getHistory(equipmentId: string, params: { page?: number; limit?: number; startDate?: string; endDate?: string }) {
    const { page = 1, limit = 100, startDate, endDate } = params;
    const skip = (page - 1) * limit;

    const where: any = { equipmentId };
    if (startDate || endDate) {
      where.checkedAt = {};
      if (startDate) where.checkedAt.gte = new Date(startDate);
      if (endDate) where.checkedAt.lte = new Date(endDate);
    }

    const [checks, total] = await Promise.all([
      prisma.equipmentCheck.findMany({
        where,
        orderBy: { checkedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.equipmentCheck.count({ where }),
    ]);

    return {
      data: checks,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getResponseTimeHistory(equipmentId: string, hours: number = 24) {
    const since = new Date(Date.now() - hours * 3600000);
    const checks = await prisma.equipmentCheck.findMany({
      where: {
        equipmentId,
        checkedAt: { gte: since },
        success: true,
      },
      select: { checkedAt: true, responseTime: true },
      orderBy: { checkedAt: 'asc' },
    });

    return checks.map(c => ({
      time: c.checkedAt,
      responseTime: c.responseTime,
    }));
  }
}

export const equipmentService = new EquipmentService();
