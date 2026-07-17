// ==============================================
// PingAlert Pro — Telegram Interactive Panel
// ==============================================

import prisma from '../config/database';
import logger from '../config/logger';
import { monitoringWorker } from '../workers/monitoring.worker';
import {
  TelegramInlineKeyboardMarkup,
  TelegramMessage,
  TelegramUpdate,
  telegramService,
} from './telegram.service';

const PAGE_SIZE = 6;
const PANEL_SETTING_KEYS = [
  'telegram_panel_enabled',
  'telegram_allowed_user_ids',
  'telegram_admin_user_ids',
  'telegram_chat_id',
] as const;

interface TelegramPanelAccess {
  enabled: boolean;
  allowed: boolean;
  admin: boolean;
}

interface EquipmentListContext {
  status: string;
  page: number;
}

class TelegramPanelService {
  async isEnabled(): Promise<boolean> {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'telegram_panel_enabled' } });
    return setting?.value !== 'false';
  }

  private escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private parseIds(value?: string): Set<string> {
    return new Set(
      String(value || '')
        .split(/[\s,;]+/)
        .map(item => item.trim())
        .filter(Boolean),
    );
  }

  private async getAccess(userId: string, chatId: string): Promise<TelegramPanelAccess> {
    const rows = await prisma.systemSetting.findMany({
      where: { key: { in: [...PANEL_SETTING_KEYS] } },
    });
    const settings = new Map(rows.map(row => [row.key, row.value]));

    const enabled = settings.get('telegram_panel_enabled') !== 'false';
    const allowedIds = this.parseIds(settings.get('telegram_allowed_user_ids'));
    const adminIds = this.parseIds(settings.get('telegram_admin_user_ids'));
    const defaultChatId = settings.get('telegram_chat_id') || await telegramService.getDefaultChatId();

    const admin = adminIds.has('*') || adminIds.has(userId);
    const allowed = admin
      || allowedIds.has('*')
      || allowedIds.has(userId)
      || Boolean(defaultChatId && defaultChatId === chatId);

    return { enabled, allowed, admin };
  }

  private formatDate(value?: Date | string | null): string {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private formatDuration(value?: Date | string | null): string {
    if (!value) return 'N/A';
    const elapsedMs = Math.max(0, Date.now() - new Date(value).getTime());
    const totalMinutes = Math.floor(elapsedMs / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}min`;
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  }

  private statusIcon(status: string): string {
    switch (status) {
      case 'ONLINE': return '🟢';
      case 'OFFLINE': return '🔴';
      case 'UNSTABLE': return '🟠';
      case 'MAINTENANCE': return '🔧';
      default: return '⚪';
    }
  }

  private statusLabel(status: string): string {
    switch (status) {
      case 'ONLINE': return 'Online';
      case 'OFFLINE': return 'Offline';
      case 'UNSTABLE': return 'Instáveis';
      case 'MAINTENANCE': return 'Manutenção';
      default: return status;
    }
  }

  private async sendOrEdit(
    chatId: string,
    text: string,
    keyboard?: TelegramInlineKeyboardMarkup,
    messageId?: number,
  ): Promise<void> {
    if (messageId) {
      const edited = await telegramService.editMessageText(chatId, messageId, text, keyboard);
      if (edited) return;
    }
    await telegramService.sendMessage(chatId, text, 'HTML', keyboard);
  }

  private menuKeyboard(): TelegramInlineKeyboardMarkup {
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
        [{ text: '❓ Ajuda', callback_data: 'help' }],
      ],
    };
  }

  private async showMenu(chatId: string, messageId?: number): Promise<void> {
    const [online, offline, unstable, maintenance, total] = await Promise.all([
      prisma.equipment.count({ where: { monitoringEnabled: true, status: 'ONLINE' } }),
      prisma.equipment.count({ where: { monitoringEnabled: true, status: 'OFFLINE' } }),
      prisma.equipment.count({ where: { monitoringEnabled: true, status: 'UNSTABLE' } }),
      prisma.equipment.count({ where: { monitoringEnabled: true, status: 'MAINTENANCE' } }),
      prisma.equipment.count({ where: { monitoringEnabled: true } }),
    ]);

    const text = `📡 <b>VigiaPing — Painel de Monitoramento</b>

🟢 <b>Online:</b> ${online}
🔴 <b>Offline:</b> ${offline}
🟠 <b>Instáveis:</b> ${unstable}
🔧 <b>Manutenção:</b> ${maintenance}
📊 <b>Total monitorado:</b> ${total}

Atualizado em ${this.formatDate(new Date())}`;

    await this.sendOrEdit(chatId, text, this.menuKeyboard(), messageId);
  }

  private async showEquipmentList(
    chatId: string,
    context: EquipmentListContext,
    messageId?: number,
  ): Promise<void> {
    const validStatuses = new Set(['ONLINE', 'OFFLINE', 'UNSTABLE', 'MAINTENANCE']);
    const status = validStatuses.has(context.status) ? context.status : 'OFFLINE';
    const total = await prisma.equipment.count({
      where: { monitoringEnabled: true, status },
    });
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(Math.max(context.page, 0), totalPages - 1);

    const equipments = await prisma.equipment.findMany({
      where: { monitoringEnabled: true, status },
      include: { client: { select: { name: true } } },
      orderBy: [{ lastOffline: 'desc' }, { name: 'asc' }],
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    });

    const lines = equipments.map((equipment, index) => {
      const position = page * PAGE_SIZE + index + 1;
      const clientName = this.escapeHtml(equipment.client?.name || 'Sem cliente');
      const offlineTime = status === 'OFFLINE'
        ? ` • ${this.formatDuration(equipment.lastOffline)}`
        : '';
      return `${position}. <b>${this.escapeHtml(equipment.name)}</b>\n   ${this.escapeHtml(equipment.host)} • ${clientName}${offlineTime}`;
    });

    const text = `${this.statusIcon(status)} <b>Equipamentos ${this.statusLabel(status).toLowerCase()}</b>

${lines.length ? lines.join('\n\n') : 'Nenhum equipamento encontrado.'}

Página ${page + 1}/${totalPages} • Total: ${total}`;

    const equipmentRows = equipments.map(equipment => ([{
      text: `${this.statusIcon(status)} ${equipment.name.slice(0, 34)}`,
      callback_data: `eq:${equipment.id}:${status}:${page}`,
    }]));

    const navigation = [] as Array<{ text: string; callback_data: string }>;
    if (page > 0) navigation.push({ text: '⬅️ Anterior', callback_data: `list:${status}:${page - 1}` });
    if (page < totalPages - 1) navigation.push({ text: 'Próxima ➡️', callback_data: `list:${status}:${page + 1}` });

    const keyboard: TelegramInlineKeyboardMarkup = {
      inline_keyboard: [
        ...equipmentRows,
        ...(navigation.length ? [navigation] : []),
        [
          { text: '🔄 Atualizar', callback_data: `list:${status}:${page}` },
          { text: '🏠 Menu', callback_data: 'menu' },
        ],
      ],
    };

    await this.sendOrEdit(chatId, text, keyboard, messageId);
  }

  private async showEquipmentDetails(
    chatId: string,
    equipmentId: string,
    backStatus: string,
    backPage: number,
    admin: boolean,
    messageId?: number,
    notice?: string,
  ): Promise<void> {
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      include: {
        client: { select: { name: true } },
        checks: { orderBy: { checkedAt: 'desc' }, take: 5 },
      },
    });

    if (!equipment) {
      await this.sendOrEdit(
        chatId,
        '❌ Equipamento não encontrado.',
        { inline_keyboard: [[{ text: '🏠 Menu', callback_data: 'menu' }]] },
        messageId,
      );
      return;
    }

    const recentSuccesses = equipment.checks.filter(check => check.success).length;
    const recentChecks = equipment.checks.length
      ? `${recentSuccesses}/${equipment.checks.length} responderam`
      : 'Sem histórico';

    const text = `${this.statusIcon(equipment.status)} <b>${this.escapeHtml(equipment.name)}</b>
${notice ? `\n${this.escapeHtml(notice)}\n` : ''}
<b>Status:</b> ${this.statusLabel(equipment.status)}
<b>ID:</b> ${this.escapeHtml(equipment.internalId)}
<b>IP/Host:</b> <code>${this.escapeHtml(equipment.host)}</code>
<b>Tipo:</b> ${this.escapeHtml(equipment.checkType)}${equipment.port ? `:${equipment.port}` : ''}
<b>Cliente:</b> ${this.escapeHtml(equipment.client?.name || 'N/A')}
<b>Local:</b> ${this.escapeHtml(equipment.location || 'N/A')}
<b>Último teste:</b> ${this.formatDate(equipment.lastCheck)}
<b>Última resposta:</b> ${this.formatDate(equipment.lastOnline)}
<b>Última queda:</b> ${this.formatDate(equipment.lastOffline)}
<b>Falhas consecutivas:</b> ${equipment.consecutiveFailures}
<b>Latência média:</b> ${Math.round(equipment.avgResponseTime)} ms
<b>Últimos testes:</b> ${recentChecks}`;

    const rows: TelegramInlineKeyboardMarkup['inline_keyboard'] = [];
    if (admin) {
      rows.push([{ text: '🔄 Testar agora', callback_data: `test:${equipment.id}:${backStatus}:${backPage}` }]);
    }
    rows.push([
      { text: '⬅️ Voltar', callback_data: `list:${backStatus}:${backPage}` },
      { text: '🏠 Menu', callback_data: 'menu' },
    ]);

    await this.sendOrEdit(chatId, text, { inline_keyboard: rows }, messageId);
  }

  private async showClients(chatId: string, messageId?: number): Promise<void> {
    const equipments = await prisma.equipment.findMany({
      where: { monitoringEnabled: true },
      include: { client: { select: { id: true, name: true } } },
    });

    const clients = new Map<string, { name: string; total: number; offline: number; unstable: number }>();
    for (const equipment of equipments) {
      const key = equipment.client?.id || 'none';
      const current = clients.get(key) || {
        name: equipment.client?.name || 'Sem cliente',
        total: 0,
        offline: 0,
        unstable: 0,
      };
      current.total += 1;
      if (equipment.status === 'OFFLINE') current.offline += 1;
      if (equipment.status === 'UNSTABLE') current.unstable += 1;
      clients.set(key, current);
    }

    const ordered = [...clients.values()]
      .sort((a, b) => b.offline - a.offline || b.unstable - a.unstable || a.name.localeCompare(b.name))
      .slice(0, 20);

    const lines = ordered.map(client =>
      `🏢 <b>${this.escapeHtml(client.name)}</b>\n   🔴 ${client.offline} • 🟠 ${client.unstable} • 📡 ${client.total}`,
    );

    const text = `🏢 <b>Resumo por cliente</b>

${lines.length ? lines.join('\n\n') : 'Nenhum cliente com equipamento monitorado.'}`;
    const keyboard: TelegramInlineKeyboardMarkup = {
      inline_keyboard: [[
        { text: '🔄 Atualizar', callback_data: 'clients' },
        { text: '🏠 Menu', callback_data: 'menu' },
      ]],
    };
    await this.sendOrEdit(chatId, text, keyboard, messageId);
  }

  private async showHelp(chatId: string, messageId?: number): Promise<void> {
    const text = `❓ <b>Comandos do VigiaPing</b>

/start ou /menu — abre o painel
/status — resumo geral
/offline — equipamentos offline
/instaveis — equipamentos instáveis
/online — equipamentos online
/manutencao — equipamentos em manutenção
/clientes — resumo por cliente
/id — mostra seu ID do Telegram
/ajuda — mostra esta ajuda

Os botões atualizam a mesma mensagem para manter a conversa organizada.`;

    await this.sendOrEdit(
      chatId,
      text,
      { inline_keyboard: [[{ text: '🏠 Abrir painel', callback_data: 'menu' }]] },
      messageId,
    );
  }

  private async showAccessDenied(message: TelegramMessage, userId: string): Promise<void> {
    const userName = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(' ')
      || message.from?.username
      || 'Usuário';
    await telegramService.sendMessage(
      String(message.chat.id),
      `🔒 <b>Acesso pendente</b>\n\nUsuário: ${this.escapeHtml(userName)}\nTelegram User ID: <code>${this.escapeHtml(userId)}</code>\n\nPeça ao administrador para adicionar esse número em <b>Integrações → Telegram → IDs autorizados</b>.`,
    );
  }

  private normalizeCommand(text: string): string {
    return text.trim().split(/\s+/)[0].toLowerCase().replace(/@[^\s]+$/, '');
  }

  async handleUpdate(update: TelegramUpdate): Promise<void> {
    if (update.message) {
      const message = update.message;
      const chatId = String(message.chat.id);
      const userId = String(message.from?.id || message.chat.id);
      const command = this.normalizeCommand(message.text || '');

      if (command === '/id') {
        await telegramService.sendMessage(
          chatId,
          `🪪 Seu Telegram User ID é: <code>${this.escapeHtml(userId)}</code>\nChat ID atual: <code>${this.escapeHtml(chatId)}</code>`,
        );
        return;
      }

      const access = await this.getAccess(userId, chatId);
      if (!access.enabled) {
        await telegramService.sendMessage(chatId, '⏸️ O painel interativo está desativado pelo administrador.');
        return;
      }
      if (!access.allowed) {
        await this.showAccessDenied(message, userId);
        return;
      }

      switch (command) {
        case '/start':
        case '/menu':
        case '/status':
        case '':
          await this.showMenu(chatId);
          break;
        case '/offline':
          await this.showEquipmentList(chatId, { status: 'OFFLINE', page: 0 });
          break;
        case '/instaveis':
        case '/instavel':
          await this.showEquipmentList(chatId, { status: 'UNSTABLE', page: 0 });
          break;
        case '/online':
          await this.showEquipmentList(chatId, { status: 'ONLINE', page: 0 });
          break;
        case '/manutencao':
          await this.showEquipmentList(chatId, { status: 'MAINTENANCE', page: 0 });
          break;
        case '/clientes':
          await this.showClients(chatId);
          break;
        case '/ajuda':
        case '/help':
          await this.showHelp(chatId);
          break;
        default:
          await telegramService.sendMessage(
            chatId,
            'Comando não reconhecido. Use /menu para abrir o painel ou /ajuda para ver os comandos.',
          );
      }
      return;
    }

    const callback = update.callback_query;
    if (!callback?.message) return;

    const chatId = String(callback.message.chat.id);
    const userId = String(callback.from.id);
    const messageId = callback.message.message_id;
    const access = await this.getAccess(userId, chatId);

    if (!access.enabled || !access.allowed) {
      await telegramService.answerCallbackQuery(callback.id, 'Acesso não autorizado');
      return;
    }

    const data = callback.data || 'menu';

    try {
      if (data === 'menu') {
        await telegramService.answerCallbackQuery(callback.id);
        await this.showMenu(chatId, messageId);
        return;
      }
      if (data === 'clients') {
        await telegramService.answerCallbackQuery(callback.id);
        await this.showClients(chatId, messageId);
        return;
      }
      if (data === 'help') {
        await telegramService.answerCallbackQuery(callback.id);
        await this.showHelp(chatId, messageId);
        return;
      }
      if (data.startsWith('list:')) {
        const [, status, pageValue] = data.split(':');
        await telegramService.answerCallbackQuery(callback.id);
        await this.showEquipmentList(chatId, {
          status,
          page: Number.parseInt(pageValue || '0', 10) || 0,
        }, messageId);
        return;
      }
      if (data.startsWith('eq:')) {
        const [, equipmentId, status, pageValue] = data.split(':');
        await telegramService.answerCallbackQuery(callback.id);
        await this.showEquipmentDetails(
          chatId,
          equipmentId,
          status || 'OFFLINE',
          Number.parseInt(pageValue || '0', 10) || 0,
          access.admin,
          messageId,
        );
        return;
      }
      if (data.startsWith('test:')) {
        if (!access.admin) {
          await telegramService.answerCallbackQuery(callback.id, 'Apenas administradores podem testar equipamentos');
          return;
        }

        const [, equipmentId, status, pageValue] = data.split(':');
        await telegramService.answerCallbackQuery(callback.id, 'Executando teste...');
        const result = await monitoringWorker.testEquipment(equipmentId);
        const notice = result
          ? `Teste concluído: ${result.success ? 'respondeu normalmente' : `falhou (${result.error || 'sem resposta'})`}`
          : 'O teste não pôde ser executado.';
        await this.showEquipmentDetails(
          chatId,
          equipmentId,
          status || 'OFFLINE',
          Number.parseInt(pageValue || '0', 10) || 0,
          access.admin,
          messageId,
          notice,
        );
        return;
      }

      await telegramService.answerCallbackQuery(callback.id, 'Ação não reconhecida');
    } catch (error: any) {
      logger.error('Telegram panel callback failed', { error: error.message, data });
      await telegramService.answerCallbackQuery(callback.id, 'Erro ao processar a ação');
    }
  }
}

export const telegramPanelService = new TelegramPanelService();
