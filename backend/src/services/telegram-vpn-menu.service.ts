import prisma from '../config/database';
import {
  TelegramInlineKeyboardMarkup,
  TelegramUpdate,
  telegramService,
} from './telegram.service';
import { vpnWatchdogStatusService } from './vpn-watchdog-status.service';

interface TelegramAccess {
  enabled: boolean;
  allowed: boolean;
}

class TelegramVpnMenuService {
  private escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private normalizeCommand(text: string): string {
    return text.trim().split(/\s+/)[0].toLowerCase().replace(/@[^\s]+$/, '');
  }

  private parseIds(value?: string): Set<string> {
    return new Set(
      String(value || '')
        .split(/[\s,;]+/)
        .map(item => item.trim())
        .filter(Boolean),
    );
  }

  private async getAccess(userId: string, chatId: string): Promise<TelegramAccess> {
    const rows = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            'telegram_panel_enabled',
            'telegram_allowed_user_ids',
            'telegram_admin_user_ids',
            'telegram_chat_id',
          ],
        },
      },
    });
    const settings = new Map(rows.map(row => [row.key, row.value]));
    const enabled = settings.get('telegram_panel_enabled') !== 'false';
    const allowedIds = this.parseIds(settings.get('telegram_allowed_user_ids'));
    const adminIds = this.parseIds(settings.get('telegram_admin_user_ids'));
    const defaultChatId = settings.get('telegram_chat_id') || await telegramService.getDefaultChatId();
    const allowed = adminIds.has('*')
      || adminIds.has(userId)
      || allowedIds.has('*')
      || allowedIds.has(userId)
      || Boolean(defaultChatId && defaultChatId === chatId);
    return { enabled, allowed };
  }

  private formatDate(value?: string | Date | null): string {
    if (!value) return 'Nunca';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Data inválida';
    return date.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  private keyboard(): TelegramInlineKeyboardMarkup {
    return {
      inline_keyboard: [
        [
          { text: '🔴 Offline', callback_data: 'list:OFFLINE:0' },
          { text: '🟠 Instáveis', callback_data: 'list:UNSTABLE:0' },
        ],
        [
          { text: '🟢 Online', callback_data: 'list:ONLINE:0' },
          { text: '🔧 Manutenção', callback_data: 'list:MAINTENANCE:0' },
        ],
        [
          { text: '🏢 Clientes', callback_data: 'clients' },
          { text: '🔄 Atualizar', callback_data: 'menu' },
        ],
        [{ text: '📡 Varredura por contrato', callback_data: 'contract-scan:list' }],
        [
          { text: '🔐 Detalhes da VPN', callback_data: 'vpn-status' },
          { text: '❓ Ajuda', callback_data: 'help' },
        ],
      ],
    };
  }

  private async sendOrEdit(
    chatId: string,
    text: string,
    keyboard: TelegramInlineKeyboardMarkup,
    messageId?: number,
  ): Promise<void> {
    if (messageId) {
      const edited = await telegramService.editMessageText(chatId, messageId, text, keyboard);
      if (edited) return;
    }
    await telegramService.sendMessage(chatId, text, 'HTML', keyboard);
  }

  private async showMenu(chatId: string, messageId?: number): Promise<void> {
    const [online, offline, unstable, maintenance, total, vpn] = await Promise.all([
      prisma.equipment.count({ where: { monitoringEnabled: true, status: 'ONLINE' } }),
      prisma.equipment.count({ where: { monitoringEnabled: true, status: 'OFFLINE' } }),
      prisma.equipment.count({ where: { monitoringEnabled: true, status: 'UNSTABLE' } }),
      prisma.equipment.count({ where: { status: 'MAINTENANCE' } }),
      prisma.equipment.count({ where: { monitoringEnabled: true } }),
      vpnWatchdogStatusService.getPresentation(),
    ]);

    const profile = vpn.status?.profileName || 'USUARIOS-CR';
    const text = `📡 <b>VigiaPing — Painel de Monitoramento</b>\n\n` +
      `🟢 <b>Online:</b> ${online}\n` +
      `🔴 <b>Offline:</b> ${offline}\n` +
      `🟠 <b>Instáveis:</b> ${unstable}\n` +
      `🔧 <b>Manutenção:</b> ${maintenance}\n` +
      `📊 <b>Total monitorado:</b> ${total}\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🔐 <b>VPN ${this.escapeHtml(profile)}:</b> ${vpn.icon} ${this.escapeHtml(vpn.label)}\n` +
      `🕒 <b>VPN atualizada:</b> ${this.escapeHtml(vpn.ageText)}\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `Atualizado em ${this.formatDate(new Date())}`;

    await this.sendOrEdit(chatId, text, this.keyboard(), messageId);
  }

  private async showVpnDetails(chatId: string, messageId?: number): Promise<void> {
    const vpn = await vpnWatchdogStatusService.getPresentation();
    const status = vpn.status;
    const text = status
      ? `🔐 <b>Status da VPN ${this.escapeHtml(status.profileName || 'USUARIOS-CR')}</b>\n\n` +
        `${vpn.icon} <b>Situação:</b> ${this.escapeHtml(vpn.label)}\n` +
        `📝 <b>Mensagem:</b> ${this.escapeHtml(status.message || 'Não informada')}\n` +
        `⚠️ <b>Falhas consecutivas:</b> ${Number(status.consecutiveFailures || 0)}\n` +
        `🕒 <b>Último teste:</b> ${this.formatDate(status.lastCheck)}\n` +
        `🔄 <b>Última reconexão:</b> ${this.formatDate(status.lastReconnect)}\n` +
        `🎯 <b>IPs de teste:</b> ${this.escapeHtml((status.targets || []).join(', ') || 'Não informados')}\n\n` +
        `<i>Informação enviada pelo watchdog que roda no Windows.</i>`
      : `⚪ <b>Status da VPN indisponível</b>\n\n` +
        `O painel ainda não recebeu o arquivo de status do watchdog.`;

    await this.sendOrEdit(
      chatId,
      text,
      {
        inline_keyboard: [[
          { text: '🔄 Atualizar VPN', callback_data: 'vpn-status' },
          { text: '🏠 Menu', callback_data: 'menu' },
        ]],
      },
      messageId,
    );
  }

  canHandle(update: TelegramUpdate): boolean {
    if (update.message) {
      const command = this.normalizeCommand(update.message.text || '');
      return command === '/start' || command === '/menu' || command === '/status';
    }
    const data = update.callback_query?.data || '';
    return data === 'menu' || data === 'vpn-status';
  }

  async handleUpdate(update: TelegramUpdate): Promise<boolean> {
    if (!this.canHandle(update)) return false;

    const chatId = String(update.message?.chat.id || update.callback_query?.message?.chat.id || '');
    const userId = String(update.message?.from?.id || update.callback_query?.from.id || chatId);
    const access = await this.getAccess(userId, chatId);
    if (!access.enabled || !access.allowed) {
      if (update.callback_query) {
        await telegramService.answerCallbackQuery(update.callback_query.id, 'Acesso não autorizado');
      } else {
        await telegramService.sendMessage(chatId, `🔒 Acesso não autorizado. Seu Telegram User ID é <code>${this.escapeHtml(userId)}</code>.`);
      }
      return true;
    }

    if (update.callback_query?.message) {
      await telegramService.answerCallbackQuery(update.callback_query.id);
      const messageId = update.callback_query.message.message_id;
      if (update.callback_query.data === 'vpn-status') {
        await this.showVpnDetails(chatId, messageId);
      } else {
        await this.showMenu(chatId, messageId);
      }
      return true;
    }

    await this.showMenu(chatId);
    return true;
  }
}

export const telegramVpnMenuService = new TelegramVpnMenuService();
