// ==============================================
// PingAlert Pro — Beautiful Telegram Alerts
// ==============================================

import prisma from '../config/database';
import { TelegramInlineKeyboardMarkup, telegramService } from './telegram.service';

class TelegramAlertService {
  private escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private formatDate(value?: Date | string | null): string {
    if (!value) return 'Não informado';

    return new Date(value).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  private equipmentKeyboard(equipmentId: string, status: string): TelegramInlineKeyboardMarkup {
    return {
      inline_keyboard: [
        [
          { text: '📋 Ver detalhes', callback_data: `eq:${equipmentId}:${status}:0` },
          { text: '🏠 Abrir painel', callback_data: 'menu' },
        ],
      ],
    };
  }

  private async getTargetChat(equipment: any, chatId?: string): Promise<string> {
    if (chatId) return chatId;
    if (equipment.client?.telegramChatId) return equipment.client.telegramChatId;
    return telegramService.getDefaultChatId();
  }

  formatOfflineAlert(equipment: any): string {
    const equipmentName = this.escapeHtml(equipment.name || 'Sem nome');
    const internalId = this.escapeHtml(equipment.internalId || 'N/A');
    const host = this.escapeHtml(equipment.host || 'N/A');
    const clientName = this.escapeHtml(equipment.client?.name || 'Sem cliente');
    const contractNumber = this.escapeHtml(equipment.contractNumber || 'Não informado');
    const location = this.escapeHtml(equipment.location || 'Não informado');
    const checkType = this.escapeHtml(equipment.checkType || 'PING');
    const failures = Number(equipment.consecutiveFailures || 0);

    return `🚨🚨 <b>ATENÇÃO: EQUIPAMENTO OFFLINE</b> 🚨🚨

━━━━━━━━━━━━━━━━━━
📟 <b>Equipamento:</b> ${equipmentName}
🆔 <b>Código:</b> ${internalId}
📑 <b>Contrato:</b> ${contractNumber}
🌐 <b>IP / Host:</b> <code>${host}</code>
🏢 <b>Cliente:</b> ${clientName}
📍 <b>Localização:</b> ${location}
🔎 <b>Tipo de teste:</b> ${checkType}
🔧 <b>Em manutenção:</b> NÃO
━━━━━━━━━━━━━━━━━━

❌ <b>Falhas consecutivas:</b> ${failures}
🕒 <b>Última resposta:</b> ${this.formatDate(equipment.lastOnline)}
⏱ <b>Queda detectada:</b> ${this.formatDate(new Date())}

🛠 <i>Verifique energia, enlace, equipamento e conectividade da VPN.</i>

🔴 <b>Status atual:</b> OFFLINE`;
  }

  formatOnlineAlert(equipment: any, offlineDuration?: string): string {
    const equipmentName = this.escapeHtml(equipment.name || 'Sem nome');
    const internalId = this.escapeHtml(equipment.internalId || 'N/A');
    const host = this.escapeHtml(equipment.host || 'N/A');
    const clientName = this.escapeHtml(equipment.client?.name || 'Sem cliente');
    const contractNumber = this.escapeHtml(equipment.contractNumber || 'Não informado');
    const location = this.escapeHtml(equipment.location || 'Não informado');
    const duration = this.escapeHtml(offlineDuration || 'Não informado');
    const latency = Number(equipment.avgResponseTime || 0);

    return `🟢✅ <b>CONEXÃO RESTABELECIDA</b> ✅🟢

━━━━━━━━━━━━━━━━━━
📟 <b>Equipamento:</b> ${equipmentName}
🆔 <b>Código:</b> ${internalId}
📑 <b>Contrato:</b> ${contractNumber}
🌐 <b>IP / Host:</b> <code>${host}</code>
🏢 <b>Cliente:</b> ${clientName}
📍 <b>Localização:</b> ${location}
🔧 <b>Em manutenção:</b> NÃO
━━━━━━━━━━━━━━━━━━

⏳ <b>Tempo indisponível:</b> ${duration}
⚡ <b>Latência média:</b> ${latency > 0 ? `${Math.round(latency)} ms` : 'Aguardando medição'}
🕒 <b>Retorno confirmado:</b> ${this.formatDate(new Date())}

🎉 <i>O equipamento voltou a responder normalmente.</i>

🟢 <b>Status atual:</b> ONLINE`;
  }

  formatUnstableAlert(equipment: any): string {
    const equipmentName = this.escapeHtml(equipment.name || 'Sem nome');
    const host = this.escapeHtml(equipment.host || 'N/A');
    const clientName = this.escapeHtml(equipment.client?.name || 'Sem cliente');
    const contractNumber = this.escapeHtml(equipment.contractNumber || 'Não informado');
    const location = this.escapeHtml(equipment.location || 'Não informado');

    return `🟠⚠️ <b>EQUIPAMENTO INSTÁVEL</b> ⚠️🟠

━━━━━━━━━━━━━━━━━━
📟 <b>Equipamento:</b> ${equipmentName}
📑 <b>Contrato:</b> ${contractNumber}
🌐 <b>IP / Host:</b> <code>${host}</code>
🏢 <b>Cliente:</b> ${clientName}
📍 <b>Localização:</b> ${location}
🔧 <b>Em manutenção:</b> NÃO
━━━━━━━━━━━━━━━━━━

📶 <b>Situação:</b> respostas intermitentes
❌ <b>Falhas atuais:</b> ${Number(equipment.consecutiveFailures || 0)}
🕒 <b>Detectado em:</b> ${this.formatDate(new Date())}

🔧 <i>A conexão pode estar oscilando. Acompanhe antes que o equipamento fique offline.</i>`;
  }

  async sendOfflineAlert(equipment: any, chatId?: string): Promise<boolean> {
    const message = this.formatOfflineAlert(equipment);
    const targetChat = await this.getTargetChat(equipment, chatId);
    const success = await telegramService.sendMessage(
      targetChat,
      message,
      'HTML',
      this.equipmentKeyboard(equipment.id, 'OFFLINE'),
    );

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
    const message = this.formatOnlineAlert(equipment, offlineDuration);
    const targetChat = await this.getTargetChat(equipment, chatId);
    const success = await telegramService.sendMessage(
      targetChat,
      message,
      'HTML',
      this.equipmentKeyboard(equipment.id, 'ONLINE'),
    );

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
}

export const telegramAlertService = new TelegramAlertService();
