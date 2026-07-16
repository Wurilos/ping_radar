// ==============================================
// PingAlert Pro — Telegram Service
// ==============================================

import { config } from '../config';
import logger from '../config/logger';
import prisma from '../config/database';

interface TelegramApiResponse<T = unknown> {
  ok: boolean;
  result?: T;
  description?: string;
}

interface TelegramBotInfo {
  first_name?: string;
  username?: string;
}

export class TelegramService {
  private async getSettings() {
    const tokenSetting = await prisma.systemSetting.findUnique({ where: { key: 'telegram_bot_token' } });
    const chatSetting = await prisma.systemSetting.findUnique({ where: { key: 'telegram_chat_id' } });

    return {
      botToken: tokenSetting?.value || config.telegram.botToken,
      defaultChatId: chatSetting?.value || config.telegram.defaultChatId,
    };
  }

  async isConfigured(): Promise<boolean> {
    const settings = await this.getSettings();
    return Boolean(settings.botToken && settings.defaultChatId);
  }

  async sendMessage(chatId: string, message: string, parseMode: string = 'HTML'): Promise<boolean> {
    const settings = await this.getSettings();
    if (!settings.botToken) {
      logger.warn('Telegram bot token not configured');
      return false;
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${settings.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId || settings.defaultChatId,
          text: message,
          parse_mode: parseMode,
          disable_web_page_preview: true,
        }),
      });

      const result = await response.json() as TelegramApiResponse;

      if (!result.ok) {
        logger.error('Telegram send failed', { error: result.description || 'Unknown Telegram error' });
        return false;
      }

      logger.info('Telegram message sent', { chatId });
      return true;
    } catch (error: any) {
      logger.error('Telegram send error', { error: error.message });
      return false;
    }
  }

  formatOfflineAlert(equipment: any): string {
    return `🚨 <b>ALERTA DE EQUIPAMENTO OFFLINE</b>

<b>Equipamento:</b> ${equipment.name}
<b>ID:</b> ${equipment.internalId}
<b>IP/Host:</b> ${equipment.host}
<b>Cliente:</b> ${equipment.client?.name || 'N/A'}
<b>Local:</b> ${equipment.location || 'N/A'}
<b>Falhas consecutivas:</b> ${equipment.consecutiveFailures}
<b>Última resposta:</b> ${equipment.lastOnline ? new Date(equipment.lastOnline).toLocaleString('pt-BR') : 'N/A'}
<b>Horário da queda:</b> ${new Date().toLocaleString('pt-BR')}

⚠️ Verifique o equipamento imediatamente.`;
  }

  formatOnlineAlert(equipment: any, offlineDuration?: string): string {
    return `✅ <b>EQUIPAMENTO RESTABELECIDO</b>

<b>Equipamento:</b> ${equipment.name}
<b>ID:</b> ${equipment.internalId}
<b>IP/Host:</b> ${equipment.host}
<b>Cliente:</b> ${equipment.client?.name || 'N/A'}
<b>Local:</b> ${equipment.location || 'N/A'}
<b>Tempo offline:</b> ${offlineDuration || 'N/A'}
<b>Horário de retorno:</b> ${new Date().toLocaleString('pt-BR')}`;
  }

  formatUnstableAlert(equipment: any): string {
    return `⚠️ <b>EQUIPAMENTO INSTÁVEL</b>

<b>Equipamento:</b> ${equipment.name}
<b>ID:</b> ${equipment.internalId}
<b>IP/Host:</b> ${equipment.host}
<b>Cliente:</b> ${equipment.client?.name || 'N/A'}
<b>Local:</b> ${equipment.location || 'N/A'}
<b>Respondendo intermitentemente</b>
<b>Horário:</b> ${new Date().toLocaleString('pt-BR')}`;
  }

  async sendOfflineAlert(equipment: any, chatId?: string): Promise<boolean> {
    const settings = await this.getSettings();
    const message = this.formatOfflineAlert(equipment);
    const targetChat = chatId || equipment.client?.telegramChatId || settings.defaultChatId;
    const success = await this.sendMessage(targetChat, message);

    await prisma.alert.create({
      data: {
        equipmentId: equipment.id,
        type: 'OFFLINE',
        channel: 'TELEGRAM',
        recipient: targetChat,
        message,
        delivered: success,
      },
    });

    return success;
  }

  async sendOnlineAlert(equipment: any, offlineDuration?: string, chatId?: string): Promise<boolean> {
    const settings = await this.getSettings();
    const message = this.formatOnlineAlert(equipment, offlineDuration);
    const targetChat = chatId || equipment.client?.telegramChatId || settings.defaultChatId;
    const success = await this.sendMessage(targetChat, message);

    await prisma.alert.create({
      data: {
        equipmentId: equipment.id,
        type: 'ONLINE',
        channel: 'TELEGRAM',
        recipient: targetChat,
        message,
        delivered: success,
      },
    });

    return success;
  }

  async testConnection(): Promise<{ success: boolean; botName?: string; error?: string }> {
    const settings = await this.getSettings();
    if (!settings.botToken) {
      return { success: false, error: 'Bot token not configured' };
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${settings.botToken}/getMe`);
      const result = await response.json() as TelegramApiResponse<TelegramBotInfo>;

      if (result.ok && result.result) {
        return {
          success: true,
          botName: result.result.first_name || result.result.username || 'Telegram Bot',
        };
      }

      return { success: false, error: result.description || 'Telegram connection failed' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export const telegramService = new TelegramService();
