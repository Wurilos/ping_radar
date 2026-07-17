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

export interface TelegramBotInfo {
  id?: number;
  first_name?: string;
  username?: string;
}

export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

interface TelegramBotCommand {
  command: string;
  description: string;
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

  private async apiRequest<T>(method: string, payload: Record<string, unknown> = {}): Promise<T> {
    const settings = await this.getSettings();
    if (!settings.botToken) {
      throw new Error('Telegram bot token not configured');
    }

    const response = await fetch(`https://api.telegram.org/bot${settings.botToken}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json() as TelegramApiResponse<T>;
    if (!response.ok || !result.ok) {
      throw new Error(result.description || `Telegram API error (${response.status})`);
    }

    return result.result as T;
  }

  async isConfigured(): Promise<boolean> {
    const settings = await this.getSettings();
    return Boolean(settings.botToken && settings.defaultChatId);
  }

  async hasBotToken(): Promise<boolean> {
    const settings = await this.getSettings();
    return Boolean(settings.botToken);
  }

  async getDefaultChatId(): Promise<string> {
    const settings = await this.getSettings();
    return settings.defaultChatId;
  }

  async sendMessage(
    chatId: string,
    message: string,
    parseMode: string = 'HTML',
    replyMarkup?: TelegramInlineKeyboardMarkup,
  ): Promise<boolean> {
    const settings = await this.getSettings();
    if (!settings.botToken) {
      logger.warn('Telegram bot token not configured');
      return false;
    }

    const targetChat = chatId || settings.defaultChatId;
    if (!targetChat) {
      logger.warn('Telegram chat ID not configured');
      return false;
    }

    try {
      await this.apiRequest('sendMessage', {
        chat_id: targetChat,
        text: message,
        parse_mode: parseMode,
        disable_web_page_preview: true,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      });

      logger.info('Telegram message sent', { chatId: targetChat });
      return true;
    } catch (error: any) {
      logger.error('Telegram send failed', { error: error.message });
      return false;
    }
  }

  async editMessageText(
    chatId: string,
    messageId: number,
    message: string,
    replyMarkup?: TelegramInlineKeyboardMarkup,
  ): Promise<boolean> {
    try {
      await this.apiRequest('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      });
      return true;
    } catch (error: any) {
      // "message is not modified" is harmless when the user refreshes quickly.
      if (!String(error.message).includes('message is not modified')) {
        logger.error('Telegram edit message failed', { error: error.message });
      }
      return false;
    }
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
    try {
      await this.apiRequest('answerCallbackQuery', {
        callback_query_id: callbackQueryId,
        ...(text ? { text } : {}),
      });
    } catch (error: any) {
      logger.debug('Telegram callback acknowledgement failed', { error: error.message });
    }
  }

  async getUpdates(offset?: number, timeout: number = 25): Promise<TelegramUpdate[]> {
    return this.apiRequest<TelegramUpdate[]>('getUpdates', {
      timeout,
      allowed_updates: ['message', 'callback_query'],
      ...(offset !== undefined ? { offset } : {}),
    });
  }

  async deleteWebhook(): Promise<boolean> {
    try {
      await this.apiRequest('deleteWebhook', { drop_pending_updates: false });
      return true;
    } catch (error: any) {
      logger.warn('Could not disable Telegram webhook for polling', { error: error.message });
      return false;
    }
  }

  async setCommands(commands: TelegramBotCommand[]): Promise<boolean> {
    try {
      await this.apiRequest('setMyCommands', { commands });
      return true;
    } catch (error: any) {
      logger.warn('Could not register Telegram commands', { error: error.message });
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

  async testConnection(): Promise<{ success: boolean; botName?: string; messageSent?: boolean; error?: string }> {
    const settings = await this.getSettings();
    if (!settings.botToken) {
      return { success: false, error: 'Bot token not configured' };
    }

    if (!settings.defaultChatId) {
      return { success: false, error: 'Chat ID padrão não configurado' };
    }

    try {
      const result = await this.apiRequest<TelegramBotInfo>('getMe');
      const botName = result.first_name || result.username || 'Telegram Bot';
      const messageSent = await this.sendMessage(
        settings.defaultChatId,
        `✅ <b>PingAlert Pro conectado</b>\n\nBot: ${botName}\nO envio de alertas para este chat foi confirmado.`,
      );

      if (!messageSent) {
        return { success: false, botName, messageSent: false, error: 'Token válido, mas não foi possível enviar para o Chat ID informado' };
      }

      return { success: true, botName, messageSent: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export const telegramService = new TelegramService();
