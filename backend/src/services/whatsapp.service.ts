// ==============================================
// PingAlert Pro — WhatsApp Service (Modular)
// ==============================================

import { config } from '../config';
import logger from '../config/logger';
import prisma from '../config/database';

// ---- Provider Interface ----
interface WhatsAppProvider {
  name: string;
  sendMessage(to: string, message: string): Promise<boolean>;
  isConfigured(): boolean;
}

// ---- WhatsApp Cloud API Provider ----
class CloudApiProvider implements WhatsAppProvider {
  name = 'WhatsApp Cloud API (Meta)';

  isConfigured(): boolean {
    return Boolean(config.whatsapp.cloudApi.token && config.whatsapp.cloudApi.phoneId);
  }

  async sendMessage(to: string, message: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${config.whatsapp.cloudApi.phoneId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.whatsapp.cloudApi.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: message },
          }),
        }
      );
      const result = await response.json();
      return response.ok;
    } catch (error: any) {
      logger.error('WhatsApp Cloud API error', { error: error.message });
      return false;
    }
  }
}

// ---- Twilio Provider ----
class TwilioProvider implements WhatsAppProvider {
  name = 'Twilio WhatsApp';

  isConfigured(): boolean {
    return Boolean(config.whatsapp.twilio.accountSid && config.whatsapp.twilio.authToken);
  }

  async sendMessage(to: string, message: string): Promise<boolean> {
    try {
      const auth = Buffer.from(`${config.whatsapp.twilio.accountSid}:${config.whatsapp.twilio.authToken}`).toString('base64');
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${config.whatsapp.twilio.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: `whatsapp:${config.whatsapp.twilio.from}`,
            To: `whatsapp:${to}`,
            Body: message,
          }),
        }
      );
      return response.ok;
    } catch (error: any) {
      logger.error('Twilio WhatsApp error', { error: error.message });
      return false;
    }
  }
}

// ---- Evolution API Provider ----
class EvolutionProvider implements WhatsAppProvider {
  name = 'Evolution API';

  isConfigured(): boolean {
    return Boolean(config.whatsapp.evolution.apiUrl && config.whatsapp.evolution.apiKey);
  }

  async sendMessage(to: string, message: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${config.whatsapp.evolution.apiUrl}/message/sendText/${config.whatsapp.evolution.instance}`,
        {
          method: 'POST',
          headers: {
            'apikey': config.whatsapp.evolution.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            number: to,
            text: message,
          }),
        }
      );
      return response.ok;
    } catch (error: any) {
      logger.error('Evolution API error', { error: error.message });
      return false;
    }
  }
}

// ---- Custom Webhook Provider ----
class CustomProvider implements WhatsAppProvider {
  name = 'Custom WhatsApp API';

  isConfigured(): boolean {
    return Boolean(config.whatsapp.custom.apiUrl);
  }

  async sendMessage(to: string, message: string): Promise<boolean> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (config.whatsapp.custom.apiKey) {
        headers['Authorization'] = `Bearer ${config.whatsapp.custom.apiKey}`;
      }

      const response = await fetch(config.whatsapp.custom.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ to, message }),
      });
      return response.ok;
    } catch (error: any) {
      logger.error('Custom WhatsApp API error', { error: error.message });
      return false;
    }
  }
}

// ---- WhatsApp Service (Factory) ----
export class WhatsAppService {
  private provider: WhatsAppProvider | null = null;

  constructor() {
    this.initProvider();
  }

  private initProvider() {
    switch (config.whatsapp.provider) {
      case 'cloud_api':
        this.provider = new CloudApiProvider();
        break;
      case 'twilio':
        this.provider = new TwilioProvider();
        break;
      case 'evolution':
        this.provider = new EvolutionProvider();
        break;
      case 'custom':
        this.provider = new CustomProvider();
        break;
      default:
        this.provider = null;
    }
  }

  isConfigured(): boolean {
    return this.provider?.isConfigured() || false;
  }

  getProviderName(): string {
    return this.provider?.name || 'Not configured';
  }

  async sendMessage(to: string, message: string): Promise<boolean> {
    if (!this.provider || !this.provider.isConfigured()) {
      logger.warn('WhatsApp provider not configured');
      return false;
    }

    return this.provider.sendMessage(to, message);
  }

  formatOfflineAlert(equipment: any): string {
    return `🚨 *ALERTA DE EQUIPAMENTO OFFLINE*

*Equipamento:* ${equipment.name}
*ID:* ${equipment.internalId}
*IP/Host:* ${equipment.host}
*Cliente:* ${equipment.client?.name || 'N/A'}
*Local:* ${equipment.location || 'N/A'}
*Falhas consecutivas:* ${equipment.consecutiveFailures}
*Última resposta:* ${equipment.lastOnline ? new Date(equipment.lastOnline).toLocaleString('pt-BR') : 'N/A'}
*Horário da queda:* ${new Date().toLocaleString('pt-BR')}

⚠️ Verifique o equipamento imediatamente.`;
  }

  formatOnlineAlert(equipment: any, offlineDuration?: string): string {
    return `✅ *EQUIPAMENTO RESTABELECIDO*

*Equipamento:* ${equipment.name}
*ID:* ${equipment.internalId}
*IP/Host:* ${equipment.host}
*Cliente:* ${equipment.client?.name || 'N/A'}
*Local:* ${equipment.location || 'N/A'}
*Tempo offline:* ${offlineDuration || 'N/A'}
*Horário de retorno:* ${new Date().toLocaleString('pt-BR')}`;
  }

  async sendOfflineAlert(equipment: any, to?: string): Promise<boolean> {
    const message = this.formatOfflineAlert(equipment);
    const recipient = to || equipment.client?.whatsapp;
    if (!recipient) return false;

    const success = await this.sendMessage(recipient, message);

    await prisma.alert.create({
      data: {
        equipmentId: equipment.id,
        type: 'OFFLINE',
        channel: 'WHATSAPP',
        recipient,
        message,
        delivered: success,
      },
    });

    return success;
  }

  async sendOnlineAlert(equipment: any, offlineDuration?: string, to?: string): Promise<boolean> {
    const message = this.formatOnlineAlert(equipment, offlineDuration);
    const recipient = to || equipment.client?.whatsapp;
    if (!recipient) return false;

    const success = await this.sendMessage(recipient, message);

    await prisma.alert.create({
      data: {
        equipmentId: equipment.id,
        type: 'ONLINE',
        channel: 'WHATSAPP',
        recipient,
        message,
        delivered: success,
      },
    });

    return success;
  }
}

export const whatsappService = new WhatsAppService();
