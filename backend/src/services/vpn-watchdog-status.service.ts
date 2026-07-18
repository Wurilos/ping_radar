import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import logger from '../config/logger';

const STATUS_DIRECTORY = process.env.VPN_WATCHDOG_STATUS_DIR || '/vpn-watchdog/statuses';
const LEGACY_STATUS_PATH = process.env.VPN_WATCHDOG_STATUS_PATH || '/vpn-watchdog/status.json';
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

  private async readStatusFile(filePath: string): Promise<VpnWatchdogStatus | null> {
    try {
      const content = await readFile(filePath, 'utf8');
      return JSON.parse(content.replace(/^\uFEFF/, '')) as VpnWatchdogStatus;
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        logger.warn('Could not read VPN watchdog status', { path: filePath, error: error.message });
      }
      return null;
    }
  }

  private async readStatuses(): Promise<VpnWatchdogStatus[]> {
    const statuses: VpnWatchdogStatus[] = [];

    try {
      const entries = await readdir(STATUS_DIRECTORY, { withFileTypes: true });
      const files = entries
        .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
        .map(entry => join(STATUS_DIRECTORY, entry.name));

      const loaded = await Promise.all(files.map(filePath => this.readStatusFile(filePath)));
      statuses.push(...loaded.filter((item): item is VpnWatchdogStatus => Boolean(item)));
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        logger.warn('Could not list VPN watchdog statuses', {
          path: STATUS_DIRECTORY,
          error: error.message,
        });
      }
    }

    if (statuses.length === 0) {
      const legacyStatus = await this.readStatusFile(LEGACY_STATUS_PATH);
      if (legacyStatus) statuses.push(legacyStatus);
    }

    const unique = new Map<string, VpnWatchdogStatus>();
    for (const status of statuses) {
      const key = String(status.profileName || status.watchdogProfileName || 'VPN').toUpperCase();
      const existing = unique.get(key);
      const existingTime = existing?.lastCheck ? new Date(existing.lastCheck).getTime() : 0;
      const candidateTime = status.lastCheck ? new Date(status.lastCheck).getTime() : 0;
      if (!existing || candidateTime >= existingTime) {
        unique.set(key, status);
      }
    }

    return Array.from(unique.values()).sort((left, right) =>
      String(left.profileName || left.watchdogProfileName || '').localeCompare(
        String(right.profileName || right.watchdogProfileName || ''),
        'pt-BR',
      ),
    );
  }

  private toPresentation(status: VpnWatchdogStatus): VpnPresentation {
    if (!status.lastCheck) {
      return {
        icon: '⚪',
        label: 'Sem dados do watchdog',
        stale: true,
        ageText: 'sem atualização',
        status,
      };
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

  async getPresentations(): Promise<VpnPresentation[]> {
    const statuses = await this.readStatuses();
    return statuses.map(status => this.toPresentation(status));
  }

  async getPresentation(): Promise<VpnPresentation> {
    const presentations = await this.getPresentations();
    return presentations[0] || {
      icon: '⚪',
      label: 'Sem dados do watchdog',
      stale: true,
      ageText: 'sem atualização',
      status: null,
    };
  }
}

export const vpnWatchdogStatusService = new VpnWatchdogStatusService();
