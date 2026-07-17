// ==============================================
// PingAlert Pro — Telegram Bot Long Polling Worker
// ==============================================

import prisma from '../config/database';
import logger from '../config/logger';
import { telegramPanelService } from '../services/telegram-panel.service';
import { telegramService } from '../services/telegram.service';

class TelegramBotWorker {
  private isRunning = false;
  private offset = 0;

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Telegram bot worker already running');
      return;
    }

    if (!(await telegramService.hasBotToken())) {
      logger.info('Telegram bot worker disabled: token not configured');
      return;
    }

    if (!(await telegramPanelService.isEnabled())) {
      logger.info('Telegram bot worker disabled by system setting');
      return;
    }

    const savedOffset = await prisma.systemSetting.findUnique({
      where: { key: 'telegram_last_update_id' },
    });
    this.offset = Number.parseInt(savedOffset?.value || '0', 10) || 0;
    this.isRunning = true;

    // Long polling and webhook are mutually exclusive.
    await telegramService.deleteWebhook();
    await telegramService.setCommands([
      { command: 'menu', description: 'Abrir painel de monitoramento' },
      { command: 'status', description: 'Ver resumo geral' },
      { command: 'offline', description: 'Listar equipamentos offline' },
      { command: 'instaveis', description: 'Listar equipamentos instáveis' },
      { command: 'online', description: 'Listar equipamentos online' },
      { command: 'manutencao', description: 'Listar equipamentos em manutenção' },
      { command: 'clientes', description: 'Ver resumo por cliente' },
      { command: 'id', description: 'Mostrar seu Telegram User ID' },
      { command: 'ajuda', description: 'Ver ajuda do bot' },
    ]);

    logger.info('🤖 Telegram interactive panel started');
    void this.poll();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    logger.info('⏹️ Telegram bot worker stopped');
  }

  private async persistOffset(): Promise<void> {
    await prisma.systemSetting.upsert({
      where: { key: 'telegram_last_update_id' },
      update: { value: String(this.offset) },
      create: {
        key: 'telegram_last_update_id',
        value: String(this.offset),
        description: 'Próximo update_id do long polling do painel Telegram',
        updatedAt: new Date(),
      },
    });
  }

  private async poll(): Promise<void> {
    while (this.isRunning) {
      try {
        const updates = await telegramService.getUpdates(this.offset || undefined, 25);

        for (const update of updates) {
          try {
            await telegramPanelService.handleUpdate(update);
          } catch (error: any) {
            logger.error('Telegram update processing failed', {
              updateId: update.update_id,
              error: error.message,
            });
          } finally {
            this.offset = Math.max(this.offset, update.update_id + 1);
          }
        }

        if (updates.length > 0) {
          await this.persistOffset();
        }
      } catch (error: any) {
        if (!this.isRunning) break;
        logger.error('Telegram long polling failed', { error: error.message });
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }

  getStatus(): { running: boolean; offset: number } {
    return {
      running: this.isRunning,
      offset: this.offset,
    };
  }
}

export const telegramBotWorker = new TelegramBotWorker();
