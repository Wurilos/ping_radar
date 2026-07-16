// ==============================================
// PingAlert Pro — Client Service
// ==============================================

import prisma from '../config/database';
import logger from '../config/logger';

export class ClientService {
  async findAll(params: { page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 50, search } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { company: { contains: search } },
        { email: { contains: search } },
        { document: { contains: search } },
      ];
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          _count: { select: { equipments: true, users: true } },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.client.count({ where }),
    ]);

    return {
      data: clients,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        equipments: {
          select: { id: true, internalId: true, name: true, host: true, status: true, checkType: true, lastCheck: true },
          orderBy: { name: 'asc' },
        },
        users: {
          select: { id: true, name: true, email: true, role: true, active: true },
        },
        _count: { select: { equipments: true, users: true } },
      },
    });

    if (!client) throw new Error('Client not found');
    return client;
  }

  async create(data: {
    name: string;
    company?: string;
    document?: string;
    phone?: string;
    whatsapp?: string;
    telegramChatId?: string;
    email?: string;
    address?: string;
    notes?: string;
    plan?: string;
    maxEquipments?: number;
  }) {
    const client = await prisma.client.create({ data });
    logger.info(`Client created: ${client.name}`, { clientId: client.id });
    return client;
  }

  async update(id: string, data: any) {
    const client = await prisma.client.update({ where: { id }, data });
    logger.info(`Client updated: ${client.name}`, { clientId: client.id });
    return client;
  }

  async delete(id: string) {
    // Check for linked equipments
    const eqCount = await prisma.equipment.count({ where: { clientId: id } });
    if (eqCount > 0) {
      throw new Error(`Cannot delete client with ${eqCount} linked equipments. Remove equipments first.`);
    }
    const client = await prisma.client.delete({ where: { id } });
    logger.info(`Client deleted: ${client.name}`, { clientId: client.id });
    return client;
  }

  async deleteBulk(ids: string[]) {
    const result = await prisma.client.deleteMany({ where: { id: { in: ids } } });
    logger.info(`Bulk client delete executed`, { count: result.count, ids });
    return { success: true, count: result.count };
  }
}

export const clientService = new ClientService();
