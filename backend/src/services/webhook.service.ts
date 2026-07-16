// ==============================================
// PingAlert Pro — Webhook Dispatch Service
// ==============================================

import crypto from 'crypto';
import prisma from '../config/database';
import logger from '../config/logger';

export type WebhookEvent =
  | 'equipment.offline'
  | 'equipment.online'
  | 'equipment.unstable'
  | 'alert.sent'
  | 'maintenance.started'
  | 'maintenance.finished';

export class WebhookService {
  async dispatch(event: WebhookEvent, payload: any): Promise<void> {
    try {
      const webhooks = await prisma.webhook.findMany({
        where: { active: true },
      });

      for (const webhook of webhooks) {
        const events = JSON.parse(webhook.events || '[]') as string[];
        if (!events.includes(event) && !events.includes('*')) continue;

        this.sendWebhook(webhook, event, payload).catch((err) => {
          logger.error('Webhook dispatch failed', { webhookId: webhook.id, error: err.message });
        });
      }
    } catch (error: any) {
      logger.error('Webhook dispatch error', { error: error.message });
    }
  }

  private async sendWebhook(webhook: any, event: string, payload: any): Promise<void> {
    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-PingAlert-Event': event,
      'X-PingAlert-Timestamp': new Date().toISOString(),
    };

    // HMAC signature if secret is configured
    if (webhook.secret) {
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(body)
        .digest('hex');
      headers['X-PingAlert-Signature'] = `sha256=${signature}`;
    }

    // Add custom headers
    if (webhook.headers) {
      try {
        const customHeaders = JSON.parse(webhook.headers);
        Object.assign(headers, customHeaders);
      } catch {}
    }

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await prisma.webhook.update({
        where: { id: webhook.id },
        data: { lastTriggered: new Date(), failCount: 0 },
      });

      logger.info('Webhook sent', { webhookId: webhook.id, event });
    } catch (error: any) {
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: { failCount: { increment: 1 } },
      });

      // Disable webhook after 10 consecutive failures
      if (webhook.failCount >= 9) {
        await prisma.webhook.update({
          where: { id: webhook.id },
          data: { active: false },
        });
        logger.warn('Webhook disabled after 10 failures', { webhookId: webhook.id });
      }

      throw error;
    }
  }
}

export const webhookService = new WebhookService();
