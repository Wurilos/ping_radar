// ==============================================
// PingAlert Pro — Express Server Entry Point
// ==============================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import logger from './config/logger';
import prisma from './config/database';

// Routes
import authRoutes from './routes/auth.routes';
import equipmentRoutes from './routes/equipment.routes';
import clientRoutes from './routes/client.routes';
import {
  alertRoutes,
  userRoutes,
  settingsRoutes,
  integrationRoutes,
  webhookRoutes,
  healthRoutes,
} from './routes/additional.routes';

// Worker
import { monitoringWorker } from './workers/monitoring.worker';

const app = express();

// ---- Security Middleware ----
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ---- Rate Limiting ----
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ---- Body Parsing ----
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- Request Logging ----
app.use((req, _res, next) => {
  if (req.path !== '/health' && req.path !== '/api/health') {
    logger.debug(`${req.method} ${req.path}`);
  }
  next();
});

// ---- API Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/equipments', equipmentRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/', healthRoutes);

// ---- 404 Handler ----
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ---- Global Error Handler ----
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
  });
});

// ---- Start Server ----
async function start() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected');

    // Start Express server
    app.listen(config.port, () => {
      logger.info(`🚀 PingAlert Pro API running on port ${config.port}`);
      logger.info(`📊 Environment: ${config.nodeEnv}`);
      logger.info(`🔗 Frontend URL: ${config.frontendUrl}`);
    });

    // Start monitoring worker
    await monitoringWorker.start();
    logger.info('🔄 Monitoring worker started');

  } catch (error: any) {
    logger.error('❌ Failed to start server', { error: error.message });
    process.exit(1);
  }
}

// ---- Graceful Shutdown ----
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await monitoringWorker.stop();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await monitoringWorker.stop();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled rejection', { error: reason?.message || reason });
});

start();

export default app;
