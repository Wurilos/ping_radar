// ==============================================
// PingAlert Pro — Telegram Contract Scanner
// ==============================================

import prisma from '../config/database';
import logger from '../config/logger';
import { pingCheck, CheckResult } from '../checks/ping.check';
import { httpCheck } from '../checks/http.check';
import { tcpCheck } from '../checks/tcp.check';
import { openVpnCheck } from '../checks/vpn.check';
import {
  TelegramInlineKeyboardMarkup,
  TelegramUpdate,
  telegramService,
} from './telegram.service';

interface ContractAccess {
  enabled: boolean;
  allowed: boolean;
}

interface ContractScanItem {
  equipment: any;
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
  result?: CheckResult;
  maintenanceReason?: string;
}

class TelegramContractService {
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

  private encodeContract(value: string): string {
    return Buffer.from(value, 'utf8').toString('base64url');
  }

  private decodeContract(value: string): string {
    return Buffer.from(value, 'base64url').toString('utf8');
  }

  private parseIds(value?: string): Set<string> {
    return new Set(
      String(value || '')
        .split(/[\s,;]+/)
        .map(item => item.trim())
        .filter(Boolean),
    );
  }

  private async getAccess(userId: string, chatId: string): Promise<ContractAccess> {
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

  canHandle(update: TelegramUpdate): boolean {
    if (update.message) {
      const command = this.normalizeCommand(update.message.text || '');
      return command === '/contrato' || command === '/contratos';
    }

    return Boolean(update.callback_query?.data?.startsWith('contract-scan:'));
  }

  private async probeEquipment(equipment: any): Promise<CheckResult> {
    switch (equipment.checkType) {
      case 'HTTP':
        return httpCheck(equipment.host);
      case 'TCP':
        return tcpCheck(equipment.host, equipment.port || 80);
      case 'OPENVPN':
        return openVpnCheck(equipment.host);
      case 'PING':
      default:
        return pingCheck(equipment.host);
    }
  }

  private async getContracts(): Promise<Array<{ code: string; total: number }>> {
    const rows = await prisma.equipment.findMany({
      where: { contractNumber: { not: null } },
      select: { contractNumber: true },
      orderBy: { contractNumber: 'asc' },
    });

    const counts = new Map<string, number>();
    for (const row of rows) {
      const code = String(row.contractNumber || '').trim();
      if (!code) continue;
      counts.set(code, (counts.get(code) || 0) + 1);
    }

    return [...counts.entries()]
      .map(([code, total]) => ({ code, total }))
      .sort((a, b) => a.code.localeCompare(b.code, 'pt-BR'));
  }

  private async showContracts(chatId: string): Promise<void> {
    const contracts = await this.getContracts();
    if (contracts.length === 0) {
      await telegramService.sendMessage(
        chatId,
        '📑 <b>Nenhum contrato cadastrado</b>\n\nCadastre o número do contrato nos equipamentos para habilitar a varredura.',
      );
      return;
    }

    const rows: TelegramInlineKeyboardMarkup['inline_keyboard'] = [];
    for (let index = 0; index < contracts.length; index += 2) {
      rows.push(contracts.slice(index, index + 2).map(contract => ({
        text: `📑 ${contract.code} (${contract.total})`,
        callback_data: `contract-scan:${this.encodeContract(contract.code)}`,
      })));
    }
    rows.push([{ text: '🏠 Voltar ao painel', callback_data: 'menu' }]);

    const lines = contracts.map(contract =>
      `📄 <b>${this.escapeHtml(contract.code)}</b> — ${contract.total} equipamento(s)`,
    );

    await telegramService.sendMessage(
      chatId,
      `📑 <b>Contratos disponíveis</b>\n\n${lines.join('\n')}\n\nToque em um contrato para iniciar uma varredura em tempo real.`,
      'HTML',
      { inline_keyboard: rows },
    );
  }

  private formatEquipmentBlock(item: ContractScanItem): string {
    const equipment = item.equipment;
    const name = this.escapeHtml(equipment.name);
    const host = this.escapeHtml(equipment.host);
    const location = this.escapeHtml(equipment.location || 'Local não informado');

    if (item.status === 'MAINTENANCE') {
      return `🔧 <b>${name}</b> — <code>${host}</code>\n   📍 ${location}\n   🛠 ${this.escapeHtml(item.maintenanceReason || 'Motivo não informado')}`;
    }

    if (item.status === 'ONLINE') {
      const latency = item.result?.responseTime != null
        ? ` • ⚡ ${Math.round(item.result.responseTime)} ms`
        : '';
      return `🟢 <b>${name}</b> — <code>${host}</code>${latency}\n   📍 ${location}`;
    }

    return `🔴 <b>${name}</b> — <code>${host}</code>\n   📍 ${location}\n   ❌ ${this.escapeHtml(item.result?.error || 'Sem resposta')}`;
  }

  private async sendReport(
    chatId: string,
    contractCode: string,
    items: ContractScanItem[],
  ): Promise<void> {
    const online = items.filter(item => item.status === 'ONLINE');
    const offline = items.filter(item => item.status === 'OFFLINE');
    const maintenance = items.filter(item => item.status === 'MAINTENANCE');
    const clients = [...new Set(items.map(item => item.equipment.client?.name).filter(Boolean))];

    const header = `📡 <b>VARREDURA DO CONTRATO ${this.escapeHtml(contractCode)}</b>\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🏢 <b>Cliente:</b> ${this.escapeHtml(clients.join(', ') || 'Não informado')}\n` +
      `📟 <b>Total:</b> ${items.length}\n` +
      `🟢 <b>Online:</b> ${online.length}\n` +
      `🔴 <b>Offline:</b> ${offline.length}\n` +
      `🔧 <b>Em manutenção:</b> ${maintenance.length}\n` +
      `🕒 <b>Executado:</b> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n` +
      `━━━━━━━━━━━━━━━━━━\n\n`;

    const sections: string[] = [];
    if (offline.length) {
      sections.push(`🚨 <b>EQUIPAMENTOS OFFLINE</b>\n\n${offline.map(item => this.formatEquipmentBlock(item)).join('\n\n')}`);
    }
    if (maintenance.length) {
      sections.push(`🔧 <b>EQUIPAMENTOS EM MANUTENÇÃO</b>\n\n${maintenance.map(item => this.formatEquipmentBlock(item)).join('\n\n')}`);
    }
    if (online.length) {
      sections.push(`✅ <b>EQUIPAMENTOS ONLINE</b>\n\n${online.map(item => this.formatEquipmentBlock(item)).join('\n\n')}`);
    }

    const footer = '\n\nℹ️ <i>A varredura faz testes novos, mas não altera o histórico nem dispara alertas individuais.</i>';
    const blocks = sections.length ? sections : ['Nenhum equipamento encontrado.'];
    const messages: string[] = [];
    let current = header;

    for (const block of blocks) {
      const addition = `${current === header ? '' : '\n\n'}${block}`;
      if ((current + addition + footer).length > 3600 && current !== header) {
        messages.push(current);
        current = block;
      } else {
        current += addition;
      }
    }
    messages.push(current + footer);

    const keyboard: TelegramInlineKeyboardMarkup = {
      inline_keyboard: [
        [{
          text: '🔄 Executar nova varredura',
          callback_data: `contract-scan:${this.encodeContract(contractCode)}`,
        }],
        [
          { text: '📑 Outros contratos', callback_data: 'contract-scan:list' },
          { text: '🏠 Painel', callback_data: 'menu' },
        ],
      ],
    };

    for (let index = 0; index < messages.length; index += 1) {
      await telegramService.sendMessage(
        chatId,
        messages[index],
        'HTML',
        index === messages.length - 1 ? keyboard : undefined,
      );
    }
  }

  private async scanContract(chatId: string, requestedCode: string): Promise<void> {
    const contracts = await this.getContracts();
    const matched = contracts.find(contract =>
      contract.code.toLocaleLowerCase('pt-BR') === requestedCode.trim().toLocaleLowerCase('pt-BR'),
    );

    if (!matched) {
      await telegramService.sendMessage(
        chatId,
        `❌ Contrato <b>${this.escapeHtml(requestedCode)}</b> não encontrado.\n\nUse /contratos para ver os códigos disponíveis.`,
      );
      return;
    }

    const equipments = await prisma.equipment.findMany({
      where: { contractNumber: matched.code },
      include: {
        client: { select: { name: true } },
        maintenanceWindows: {
          where: { endAt: null },
          orderBy: { startAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    await telegramService.sendMessage(
      chatId,
      `🔎 <b>Varredura iniciada</b>\n\n📑 Contrato: <b>${this.escapeHtml(matched.code)}</b>\n📟 Equipamentos: ${equipments.length}\n\nAguarde enquanto cada conexão é testada...`,
    );

    const items: ContractScanItem[] = [];
    const batchSize = 5;

    for (let index = 0; index < equipments.length; index += batchSize) {
      const batch = equipments.slice(index, index + batchSize);
      const batchResults = await Promise.all(batch.map(async equipment => {
        if (equipment.status === 'MAINTENANCE') {
          return {
            equipment,
            status: 'MAINTENANCE' as const,
            maintenanceReason: equipment.maintenanceWindows[0]?.reason || 'Motivo não informado',
          };
        }

        try {
          const result = await this.probeEquipment(equipment);
          return {
            equipment,
            status: result.success ? 'ONLINE' as const : 'OFFLINE' as const,
            result,
          };
        } catch (error: any) {
          return {
            equipment,
            status: 'OFFLINE' as const,
            result: {
              success: false,
              responseTime: null,
              error: error.message || 'Falha ao executar teste',
            },
          };
        }
      }));
      items.push(...batchResults);
    }

    await this.sendReport(chatId, matched.code, items);
  }

  async handleUpdate(update: TelegramUpdate): Promise<boolean> {
    if (!this.canHandle(update)) return false;

    if (update.message) {
      const message = update.message;
      const chatId = String(message.chat.id);
      const userId = String(message.from?.id || message.chat.id);
      const access = await this.getAccess(userId, chatId);

      if (!access.enabled) {
        await telegramService.sendMessage(chatId, '⏸️ O painel interativo está desativado pelo administrador.');
        return true;
      }
      if (!access.allowed) {
        await telegramService.sendMessage(
          chatId,
          `🔒 <b>Acesso não autorizado</b>\n\nSeu Telegram User ID é <code>${this.escapeHtml(userId)}</code>. Peça ao administrador para liberar esse número.`,
        );
        return true;
      }

      const text = message.text || '';
      const command = this.normalizeCommand(text);
      if (command === '/contratos') {
        await this.showContracts(chatId);
        return true;
      }

      const requestedCode = text.trim().replace(/^\/contrato(?:@[^\s]+)?\s*/i, '').trim();
      if (!requestedCode) {
        await telegramService.sendMessage(
          chatId,
          '📑 <b>Como varrer um contrato</b>\n\nUse: <code>/contrato NUMERO_DO_CONTRATO</code>\n\nExemplo: <code>/contrato EMDURB-2026</code>\n\nOu use /contratos para escolher em uma lista.',
        );
        return true;
      }

      await this.scanContract(chatId, requestedCode);
      return true;
    }

    const callback = update.callback_query;
    if (!callback?.message) return true;

    const chatId = String(callback.message.chat.id);
    const userId = String(callback.from.id);
    const access = await this.getAccess(userId, chatId);
    if (!access.enabled || !access.allowed) {
      await telegramService.answerCallbackQuery(callback.id, 'Acesso não autorizado');
      return true;
    }

    const data = callback.data || '';
    if (data === 'contract-scan:list') {
      await telegramService.answerCallbackQuery(callback.id);
      await this.showContracts(chatId);
      return true;
    }

    const encoded = data.replace(/^contract-scan:/, '');
    try {
      const contractCode = this.decodeContract(encoded);
      await telegramService.answerCallbackQuery(callback.id, 'Varredura iniciada...');
      await this.scanContract(chatId, contractCode);
    } catch (error: any) {
      logger.error('Contract scan callback failed', { error: error.message, data });
      await telegramService.answerCallbackQuery(callback.id, 'Não foi possível iniciar a varredura');
    }

    return true;
  }
}

export const telegramContractService = new TelegramContractService();
