import { readFile } from 'fs/promises';
import logger from '../config/logger';

const STATUS_PATH = process.env.VPN_WATCHDOG_STATUS_PATH || '/vpn-watchdog/status.json';
const STALE_AFTER_MS = 90_000;

export interface VpnWatchdogStatus {
  profileName?: string;
  watchdogProfileName?: string;
  state?: string;
  message?: string;
  consecutiveFailures?: number;
  lastCheck?: string;
  lastReconnect?: string | null;
  targets?: string[];
}

export interface VpnPresentation {
  icon: string;
  label: string;
  stale: boolean;
  ageText: string;
  status: VpnWatchdogStatus | null;
}

class VpnWatchdogStatusService {
  private formatAge(value?: string | null): string {
    if (!value) return 'sem atualização';
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return 'horário inválido';
    const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (seconds < 60) return `há ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `há ${minutes}min`;
    return `há ${Math.floor(minutes / 60)}h`;
  }

  private async readStatus(): Promise<VpnWatchdogStatus | null> {
    try {
      const content = await readFile(STATUS_PATH, 'utf8');
      return JSON.parse(content.replace(/^\uFEFF/, '')) as VpnWatchdogStatus;
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        logger.warn('Could not read VPN watchdog status', { path: STATUS_PATH, error: error.message });
      }
      return null;
    }
  }

  async getPresentation(): Promise<VpnPresentation> {
    const status = await this.readStatus();
    if (!status?.lastCheck) {
      return { icon: '⚪', label: 'Sem dados do watchdog', stale: true, ageText: 'sem atualização', status };
    }

    const ageMs = Date.now() - new Date(status.lastCheck).getTime();
    if (!Number.isFinite(ageMs) || ageMs > STALE_AFTER_MS) {
      return {
        icon: '⚪',
        label: 'Watchdog sem atualização',
        stale: true,
        ageText: this.formatAge(status.lastCheck),
        status,
      };
    }

    const states: Record<string, { icon: string; label: string }> = {
      ONLINE: { icon: '🟢', label: 'Operacional' },
      VPN_UNREACHABLE: { icon: '🟠', label: 'Destinos sem resposta' },
      RECONNECTING: { icon: '🟠', label: 'Reconectando' },
      COOLDOWN: { icon: '🟠', label: 'Aguardando nova tentativa' },
      INTERNET_OFFLINE: { icon: '🔴', label: 'Internet indisponível' },
      RECONNECT_FAILED: { icon: '🔴', label: 'Falha na reconexão' },
      ERROR: { icon: '🔴', label: 'Erro no watchdog' },
    };
    const mapped = states[String(status.state || '').toUpperCase()] || {
      icon: '⚪',
      label: status.state || 'Estado desconhecido',
    };

    return { ...mapped, stale: false, ageText: this.formatAge(status.lastCheck), status };
  }
}

export const vpnWatchdogStatusService = new VpnWatchdogStatusService();
