// ==============================================
// PingAlert Pro — Configuration
// ==============================================

import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  // App
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:3001',

  // Auth
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),

  // Database
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  useRedis: process.env.USE_REDIS === 'true',

  // Telegram
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    defaultChatId: process.env.TELEGRAM_DEFAULT_CHAT_ID || '',
  },

  // WhatsApp
  whatsapp: {
    provider: process.env.WHATSAPP_PROVIDER || 'none',
    cloudApi: {
      token: process.env.WHATSAPP_CLOUD_API_TOKEN || '',
      phoneId: process.env.WHATSAPP_CLOUD_PHONE_ID || '',
    },
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      from: process.env.TWILIO_WHATSAPP_FROM || '',
    },
    evolution: {
      apiUrl: process.env.EVOLUTION_API_URL || '',
      apiKey: process.env.EVOLUTION_API_KEY || '',
      instance: process.env.EVOLUTION_INSTANCE || '',
    },
    custom: {
      apiUrl: process.env.CUSTOM_WHATSAPP_API_URL || '',
      apiKey: process.env.CUSTOM_WHATSAPP_API_KEY || '',
    },
  },

  // Monitoring defaults
  monitoring: {
    defaultCheckInterval: parseInt(process.env.DEFAULT_CHECK_INTERVAL || '60', 10),
    defaultFailThreshold: parseInt(process.env.DEFAULT_FAIL_THRESHOLD || '3', 10),
    defaultAlertCooldown: parseInt(process.env.DEFAULT_ALERT_COOLDOWN || '300', 10),
    pingTimeout: parseInt(process.env.DEFAULT_PING_TIMEOUT || '5000', 10),
    httpTimeout: parseInt(process.env.DEFAULT_HTTP_TIMEOUT || '10000', 10),
    tcpTimeout: parseInt(process.env.DEFAULT_TCP_TIMEOUT || '5000', 10),
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Quiet hours
  quietHours: {
    enabled: process.env.QUIET_HOURS_ENABLED === 'true',
    start: process.env.QUIET_HOURS_START || '22:00',
    end: process.env.QUIET_HOURS_END || '07:00',
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
} as const;
