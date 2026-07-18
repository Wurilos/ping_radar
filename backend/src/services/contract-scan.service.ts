// ==============================================
// PingAlert Pro — Contract Scan Service
// ==============================================

import prisma from '../config/database';
import { pingCheck, CheckResult } from '../checks/ping.check';
import { httpCheck } from '../checks/http.check';
import { tcpCheck } from '../checks/tcp.check';
import { openVpnCheck } from '../checks/vpn.check';
import { AuthPayload } from '../middleware/auth.middleware';

type ContractScanStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';

interface ContractScanEquipment {
  id: string;
  internalId: string;
  name: string;
  host: string;
  port: number | null;
  checkType: string;
  location: string | null;
  clientName: string | null;
  contractName: string;
  status: ContractScanStatus;
  responseTime: number | null;
  error: string | null;
  maintenanceReason: string | null;
  maintenanceStartedAt: Date | null;
  monitoringEnabled: boolean;
}

export class ContractScanService {
  private scopeFilter(user?: AuthPayload) {
    if (!user || user.role === 'ADMIN' || user.role === 'TECH') return {};
    return { clientId: user.clientId || 'none' };
  }

  private async probeEquipment(equipment: {
    host: string;
    port: number | null;
    checkType: string;
  }): Promise<CheckResult> {
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

  async listContracts(user?: AuthPayload): Promise<Array<{
    name: string;
    total: number;
    online: number;
    offline: number;
    maintenance: number;
    clients: string[];
  }>> {
    const rows = await prisma.equipment.findMany({
      where: {
        ...this.scopeFilter(user),
        contractNumber: { not: null },
      },
      select: {
        contractNumber: true,
        status: true,
        client: { select: { name: true } },
      },
      orderBy: { contractNumber: 'asc' },
    });

    const contracts = new Map<string, {
      name: string;
      total: number;
      online: number;
      offline: number;
      maintenance: number;
      clients: Set<string>;
    }>();

    for (const row of rows) {
      const name = String(row.contractNumber || '').trim();
      if (!name) continue;

      const current = contracts.get(name) || {
        name,
        total: 0,
        online: 0,
        offline: 0,
        maintenance: 0,
        clients: new Set<string>(),
      };

      current.total += 1;
      if (row.status === 'MAINTENANCE') current.maintenance += 1;
      else if (row.status === 'OFFLINE' || row.status === 'UNSTABLE') current.offline += 1;
      else current.online += 1;
      if (row.client?.name) current.clients.add(row.client.name);
      contracts.set(name, current);
    }

    return [...contracts.values()]
      .map(contract => ({
        ...contract,
        clients: [...contract.clients].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  async scanContract(requestedName: string, user?: AuthPayload): Promise<{
    contractName: string;
    scannedAt: Date;
    clients: string[];
    summary: { total: number; online: number; offline: number; maintenance: number };
    equipments: ContractScanEquipment[];
  }> {
    const contracts = await this.listContracts(user);
    const matched = contracts.find(contract =>
      contract.name.toLocaleLowerCase('pt-BR') === requestedName.trim().toLocaleLowerCase('pt-BR'),
    );

    if (!matched) {
      throw new Error(`Contrato ${requestedName} não encontrado`);
    }

    const equipments = await prisma.equipment.findMany({
      where: {
        ...this.scopeFilter(user),
        contractNumber: matched.name,
      },
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

    const results: ContractScanEquipment[] = [];
    const batchSize = 5;

    for (let index = 0; index < equipments.length; index += batchSize) {
      const batch = equipments.slice(index, index + batchSize);
      const batchResults = await Promise.all(batch.map(async equipment => {
        const maintenance = equipment.maintenanceWindows[0];

        if (equipment.status === 'MAINTENANCE') {
          return {
            id: equipment.id,
            internalId: equipment.internalId,
            name: equipment.name,
            host: equipment.host,
            port: equipment.port,
            checkType: equipment.checkType,
            location: equipment.location,
            clientName: equipment.client?.name || null,
            contractName: matched.name,
            status: 'MAINTENANCE' as const,
            responseTime: null,
            error: null,
            maintenanceReason: maintenance?.reason || 'Motivo não informado',
            maintenanceStartedAt: maintenance?.startAt || null,
            monitoringEnabled: equipment.monitoringEnabled,
          };
        }

        try {
          const probe = await this.probeEquipment(equipment);
          return {
            id: equipment.id,
            internalId: equipment.internalId,
            name: equipment.name,
            host: equipment.host,
            port: equipment.port,
            checkType: equipment.checkType,
            location: equipment.location,
            clientName: equipment.client?.name || null,
            contractName: matched.name,
            status: probe.success ? 'ONLINE' as const : 'OFFLINE' as const,
            responseTime: probe.responseTime ?? null,
            error: probe.success ? null : probe.error || 'Sem resposta',
            maintenanceReason: null,
            maintenanceStartedAt: null,
            monitoringEnabled: equipment.monitoringEnabled,
          };
        } catch (error: any) {
          return {
            id: equipment.id,
            internalId: equipment.internalId,
            name: equipment.name,
            host: equipment.host,
            port: equipment.port,
            checkType: equipment.checkType,
            location: equipment.location,
            clientName: equipment.client?.name || null,
            contractName: matched.name,
            status: 'OFFLINE' as const,
            responseTime: null,
            error: error.message || 'Falha ao executar teste',
            maintenanceReason: null,
            maintenanceStartedAt: null,
            monitoringEnabled: equipment.monitoringEnabled,
          };
        }
      }));

      results.push(...batchResults);
    }

    const summary = {
      total: results.length,
      online: results.filter(item => item.status === 'ONLINE').length,
      offline: results.filter(item => item.status === 'OFFLINE').length,
      maintenance: results.filter(item => item.status === 'MAINTENANCE').length,
    };

    return {
      contractName: matched.name,
      scannedAt: new Date(),
      clients: [...new Set(results.map(item => item.clientName).filter((name): name is string => Boolean(name)))],
      summary,
      equipments: results,
    };
  }
}

export const contractScanService = new ContractScanService();
