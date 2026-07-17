// ==============================================
// PingAlert Pro — Alert, User, Settings, Integration Routes
// ==============================================

import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authenticate, authorize, clientScope } from '../middleware/auth.middleware';
import { notificationService } from '../services/notification.service';
import { telegramService } from '../services/telegram.service';
import { whatsappService } from '../services/whatsapp.service';
import { monitoringWorker } from '../workers/monitoring.worker';
import { telegramBotWorker } from '../workers/telegram-bot.worker';
import { getRouteParam } from '../utils/request';
import bcrypt from 'bcryptjs';
import { config } from '../config';

// ===================== ALERT ROUTES =====================
export const alertRoutes = Router();

alertRoutes.get('/', authenticate, clientScope, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (req.query.type) where.type = req.query.type;
    if (req.query.channel) where.channel = req.query.channel;
    if (req.query.equipmentId) where.equipmentId = req.query.equipmentId;

    if (req.user?.role === 'CLIENT' && req.user.clientId) {
      where.equipment = { clientId: req.user.clientId };
    }

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        include: {
          equipment: { select: { id: true, name: true, internalId: true, host: true } },
        },
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.alert.count({ where }),
    ]);

    res.json({ data: alerts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

alertRoutes.post('/send', authenticate, authorize('ADMIN', 'TECH'), async (req: Request, res: Response) => {
  try {
    const { equipmentId, message, channels } = req.body;
    const result = await notificationService.sendManualAlert(equipmentId, message, channels || ['TELEGRAM']);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ===================== USER ROUTES =====================
export const userRoutes = Router();

userRoutes.get('/', authenticate, authorize('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true, active: true,
        clientId: true, lastLogin: true, createdAt: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ data: users });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

userRoutes.post('/', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, clientId } = req.body;
    const hashedPassword = await bcrypt.hash(password || 'temp123', config.bcryptRounds);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: role || 'TECH', clientId },
      select: { id: true, name: true, email: true, role: true },
    });
    res.status(201).json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

userRoutes.put('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { name, email, role, active, clientId } = req.body;
    const user = await prisma.user.update({
      where: { id: getRouteParam(req.params.id, 'id') },
      data: { name, email, role, active, clientId },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

userRoutes.delete('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    await prisma.user.delete({ where: { id: getRouteParam(req.params.id, 'id') } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ===================== SETTINGS ROUTES =====================
export const settingsRoutes = Router();

settingsRoutes.get('/', authenticate, authorize('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.systemSetting.findMany({ orderBy: { key: 'asc' } });
    const result: any = {};
    settings.forEach(s => { result[s.key] = s.value; });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

settingsRoutes.put('/', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const telegramRestartKeys = new Set([
      'telegram_bot_token',
      'telegram_panel_enabled',
    ]);
    let restartTelegramWorker = false;

    for (const [key, value] of Object.entries(updates)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value), updatedAt: new Date() },
      });
      if (telegramRestartKeys.has(key)) restartTelegramWorker = true;
    }

    if (restartTelegramWorker) {
      await telegramBotWorker.restart();
    }

    res.json({ success: true, telegramWorker: telegramBotWorker.getStatus() });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ===================== INTEGRATION ROUTES =====================
export const integrationRoutes = Router();

integrationRoutes.get('/', authenticate, authorize('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const integrations = await prisma.integration.findMany({ orderBy: { name: 'asc' } });
    const safe = integrations.map(i => ({
      ...i,
      apiKey: i.apiKey ? '••••••••' + (i.apiKey.slice(-4) || '') : null,
    }));
    res.json({ data: safe });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

integrationRoutes.post('/', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const integration = await prisma.integration.create({ data: req.body });
    res.status(201).json(integration);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

integrationRoutes.put('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const integration = await prisma.integration.update({
      where: { id: getRouteParam(req.params.id, 'id') },
      data: req.body,
    });
    res.json(integration);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

integrationRoutes.delete('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    await prisma.integration.delete({ where: { id: getRouteParam(req.params.id, 'id') } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

integrationRoutes.post('/telegram/test', authenticate, authorize('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const result = await telegramService.testConnection();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

integrationRoutes.get('/whatsapp/status', authenticate, authorize('ADMIN'), async (_req: Request, res: Response) => {
  res.json({
    configured: whatsappService.isConfigured(),
    provider: whatsappService.getProviderName(),
  });
});

// ===================== WEBHOOK ROUTES =====================
export const webhookRoutes = Router();

webhookRoutes.get('/', authenticate, authorize('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const webhooks = await prisma.webhook.findMany({ orderBy: { name: 'asc' } });
    const safe = webhooks.map(w => ({ ...w, secret: w.secret ? '••••••••' : null }));
    res.json({ data: safe });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

webhookRoutes.post('/', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { name, url, secret, events, headers } = req.body;
    const webhook = await prisma.webhook.create({
      data: {
        name,
        url,
        secret,
        events: JSON.stringify(events || []),
        headers: headers ? JSON.stringify(headers) : null,
      },
    });
    res.status(201).json(webhook);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

webhookRoutes.put('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { name, url, secret, events, headers, active } = req.body;
    const data: any = { name, url, active };
    if (secret !== undefined) data.secret = secret;
    if (events) data.events = JSON.stringify(events);
    if (headers) data.headers = JSON.stringify(headers);

    const webhook = await prisma.webhook.update({
      where: { id: getRouteParam(req.params.id, 'id') },
      data,
    });
    res.json(webhook);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

webhookRoutes.delete('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    await prisma.webhook.delete({ where: { id: getRouteParam(req.params.id, 'id') } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ===================== HEALTH & WORKER ROUTES =====================
export const healthRoutes = Router();

healthRoutes.get('/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const workerStatus = monitoringWorker.getStatus();
    const telegramPanelStatus = telegramBotWorker.getStatus();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      worker: workerStatus,
      telegramPanel: telegramPanelStatus,
    });
  } catch {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});
