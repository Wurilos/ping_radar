'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Clock,
  FileText,
  MapPin,
  Radar,
  RefreshCw,
  Search,
  Server,
  Wifi,
  WifiOff,
  Wrench,
} from 'lucide-react';
import { api } from '@/lib/api';

type ScanStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';

interface ContractSummary {
  name: string;
  total: number;
  online: number;
  offline: number;
  maintenance: number;
  clients: string[];
}

interface ScanEquipment {
  id: string;
  internalId: string;
  name: string;
  host: string;
  port: number | null;
  checkType: string;
  location: string | null;
  clientName: string | null;
  status: ScanStatus;
  responseTime: number | null;
  error: string | null;
  maintenanceReason: string | null;
  maintenanceStartedAt: string | null;
  monitoringEnabled: boolean;
}

interface ScanResult {
  contractName: string;
  scannedAt: string;
  clients: string[];
  summary: {
    total: number;
    online: number;
    offline: number;
    maintenance: number;
  };
  equipments: ScanEquipment[];
}

const statusInfo: Record<ScanStatus, {
  label: string;
  icon: typeof Wifi;
  className: string;
  description: string;
}> = {
  ONLINE: {
    label: 'Online',
    icon: Wifi,
    className: 'status-online',
    description: 'Respondeu ao teste executado agora',
  },
  OFFLINE: {
    label: 'Offline',
    icon: WifiOff,
    className: 'status-offline',
    description: 'Não respondeu ao teste executado agora',
  },
  MAINTENANCE: {
    label: 'Manutenção',
    icon: Wrench,
    className: 'status-maintenance',
    description: 'Teste pausado por manutenção cadastrada',
  },
};

function formatDate(value?: string | null) {
  if (!value) return 'Não informado';
  return new Date(value).toLocaleString('pt-BR');
}

export default function ContractScanPage() {
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [selectedContract, setSelectedContract] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ScanStatus>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    void loadContracts();
  }, []);

  async function loadContracts() {
    try {
      setLoadingContracts(true);
      setError('');
      const response = await api.getContracts();
      const data = response.data || [];
      setContracts(data);

      if (!selectedContract && data.length) {
        const emdurb = data.find((contract: ContractSummary) =>
          contract.name.toLocaleLowerCase('pt-BR') === 'emdurb',
        );
        setSelectedContract(emdurb?.name || data[0].name);
      }
    } catch (err: any) {
      setError(err.message || 'Não foi possível carregar os contratos.');
    } finally {
      setLoadingContracts(false);
    }
  }

  async function runScan() {
    if (!selectedContract) return;

    try {
      setScanning(true);
      setError('');
      setStatusFilter('ALL');
      setSearch('');
      const scan = await api.scanContract(selectedContract);
      setResult(scan);
      await loadContracts();
    } catch (err: any) {
      setError(err.message || 'Não foi possível executar a varredura.');
    } finally {
      setScanning(false);
    }
  }

  const selectedSummary = contracts.find(contract => contract.name === selectedContract);

  const filteredEquipments = useMemo(() => {
    if (!result) return [];
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');

    return result.equipments.filter(equipment => {
      const matchesStatus = statusFilter === 'ALL' || equipment.status === statusFilter;
      const matchesSearch = !normalizedSearch || [
        equipment.name,
        equipment.internalId,
        equipment.host,
        equipment.location,
        equipment.clientName,
        equipment.maintenanceReason,
      ].some(value => String(value || '').toLocaleLowerCase('pt-BR').includes(normalizedSearch));

      return matchesStatus && matchesSearch;
    });
  }, [result, search, statusFilter]);

  const summaryCards = result ? [
    { label: 'Total verificado', value: result.summary.total, icon: Server, status: 'ALL' as const },
    { label: 'Online', value: result.summary.online, icon: Wifi, status: 'ONLINE' as const },
    { label: 'Offline', value: result.summary.offline, icon: WifiOff, status: 'OFFLINE' as const },
    { label: 'Em manutenção', value: result.summary.maintenance, icon: Wrench, status: 'MAINTENANCE' as const },
  ] : [];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 229, 255, 0.1)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-neon-cyan)' }}>
              <Radar size={25} color="var(--color-accent)" />
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>Varredura por Contrato</h1>
          </div>
          <p style={{ color: 'var(--color-text-muted)', margin: 0, maxWidth: 720 }}>
            Execute testes atualizados em todos os equipamentos de um contrato e veja imediatamente quais estão online, offline ou em manutenção.
          </p>
        </div>

        <button className="btn btn-ghost" onClick={loadContracts} disabled={loadingContracts || scanning}>
          <RefreshCw size={16} className={loadingContracts ? 'spin-icon' : ''} /> Atualizar contratos
        </button>
      </div>

      <div className="glass-card" style={{ padding: 22, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) auto', gap: 16, alignItems: 'end' }} className="scan-controls">
          <div>
            <label className="label">Nome do contrato</label>
            <div style={{ position: 'relative' }}>
              <FileText size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-accent)', pointerEvents: 'none' }} />
              <select
                className="input"
                value={selectedContract}
                onChange={(event) => {
                  setSelectedContract(event.target.value);
                  setResult(null);
                  setError('');
                }}
                disabled={loadingContracts || scanning}
                style={{ paddingLeft: 42 }}
              >
                {!contracts.length && <option value="">Nenhum contrato cadastrado</option>}
                {contracts.map(contract => (
                  <option key={contract.name} value={contract.name}>
                    {contract.name} — {contract.total} equipamento(s)
                  </option>
                ))}
              </select>
            </div>
            {selectedSummary && (
              <div style={{ marginTop: 9, color: 'var(--color-text-muted)', fontSize: 12 }}>
                Cliente: {selectedSummary.clients.join(', ') || 'Não informado'} · {selectedSummary.total} equipamento(s) cadastrado(s)
              </div>
            )}
          </div>

          <button
            className="btn btn-primary"
            onClick={runScan}
            disabled={!selectedContract || scanning || loadingContracts}
            style={{ minWidth: 210, height: 44 }}
          >
            {scanning ? <RefreshCw size={18} className="spin-icon" /> : <Radar size={18} />}
            {scanning ? 'VERIFICANDO...' : 'EXECUTAR VARREDURA'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18, alignItems: 'flex-start', color: 'var(--color-text-muted)', fontSize: 12 }}>
          <Activity size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>A varredura executa testes novos, mas não altera o histórico e não dispara alertas individuais no Telegram.</span>
        </div>
      </div>

      {error && (
        <div className="glass-card" style={{ padding: 16, marginBottom: 22, border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
          {error}
        </div>
      )}

      {!loadingContracts && contracts.length === 0 && !error && (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
          <FileText size={38} style={{ marginBottom: 14, color: 'var(--color-text-muted)' }} />
          <h2 style={{ margin: '0 0 8px' }}>Nenhum contrato cadastrado</h2>
          <p style={{ color: 'var(--color-text-muted)', margin: '0 0 18px' }}>
            Edite os equipamentos e preencha o campo “Nome do Contrato”.
          </p>
          <Link href="/dashboard/equipments" className="btn btn-primary">ABRIR EQUIPAMENTOS</Link>
        </div>
      )}

      {scanning && (
        <div className="glass-card" style={{ padding: 42, textAlign: 'center' }}>
          <div style={{ width: 58, height: 58, border: '4px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', margin: '0 auto 18px' }} className="spin-icon" />
          <h2 style={{ margin: '0 0 8px' }}>Varredura em andamento</h2>
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
            Testando os equipamentos do contrato {selectedContract} em lotes seguros. Aguarde alguns instantes.
          </p>
        </div>
      )}

      {result && !scanning && (
        <>
          <div className="glass-card" style={{ padding: 18, marginBottom: 18, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '1.4px', color: 'var(--color-accent)', marginBottom: 5 }}>Resultado atualizado</div>
              <h2 style={{ margin: 0, fontSize: 22 }}>Contrato {result.contractName}</h2>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 5 }}>
                {result.clients.join(', ') || 'Cliente não informado'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)', fontSize: 13 }}>
              <Clock size={16} /> {formatDate(result.scannedAt)}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginBottom: 22 }} className="scan-summary-grid">
            {summaryCards.map(card => (
              <button
                key={card.label}
                type="button"
                className="glass-card"
                onClick={() => setStatusFilter(card.status)}
                style={{ padding: 18, textAlign: 'left', cursor: 'pointer', border: statusFilter === card.status ? '1px solid var(--color-accent)' : '1px solid var(--color-border)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{card.label}</div>
                    <div style={{ fontSize: 32, fontWeight: 800, marginTop: 7 }}>{card.value}</div>
                  </div>
                  <card.icon size={26} color="var(--color-accent)" />
                </div>
              </button>
            ))}
          </div>

          <div className="glass-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['ALL', 'ONLINE', 'OFFLINE', 'MAINTENANCE'] as const).map(status => (
                  <button
                    key={status}
                    className={statusFilter === status ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                    onClick={() => setStatusFilter(status)}
                  >
                    {status === 'ALL' ? `Todos (${result.summary.total})` : `${statusInfo[status].label} (${result.summary[status === 'MAINTENANCE' ? 'maintenance' : status.toLowerCase() as 'online' | 'offline']})`}
                  </button>
                ))}
              </div>

              <div style={{ position: 'relative', width: '100%', maxWidth: 310 }}>
                <Search size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  className="input"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar equipamento, IP ou local..."
                  style={{ paddingLeft: 39 }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {filteredEquipments.map(equipment => {
                const info = statusInfo[equipment.status];
                const StatusIcon = info.icon;

                return (
                  <div key={equipment.id} style={{ padding: 16, border: '1px solid var(--color-border)', borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.4fr) minmax(180px, 1fr) minmax(180px, 1fr)', gap: 16, alignItems: 'center' }} className="scan-equipment-row">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                          <StatusIcon size={18} />
                          <Link href={`/dashboard/equipments/${equipment.id}`} style={{ color: 'var(--color-text-primary)', fontWeight: 700, textDecoration: 'none' }}>
                            {equipment.name}
                          </Link>
                          <span className={`status-badge ${info.className}`}>{info.label}</span>
                        </div>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 6 }}>
                          {equipment.internalId} · {equipment.checkType}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>{equipment.host}{equipment.port ? `:${equipment.port}` : ''}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)', fontSize: 12, marginTop: 6 }}>
                          <MapPin size={13} /> {equipment.location || 'Local não informado'}
                        </div>
                      </div>

                      <div style={{ fontSize: 13 }}>
                        {equipment.status === 'ONLINE' && (
                          <>
                            <div style={{ fontWeight: 700 }}>⚡ {equipment.responseTime != null ? `${Math.round(equipment.responseTime)} ms` : 'Respondendo'}</div>
                            <div style={{ color: 'var(--color-text-muted)', marginTop: 5 }}>{info.description}</div>
                          </>
                        )}
                        {equipment.status === 'OFFLINE' && (
                          <>
                            <div style={{ fontWeight: 700, color: 'var(--color-danger)' }}>❌ {equipment.error || 'Sem resposta'}</div>
                            <div style={{ color: 'var(--color-text-muted)', marginTop: 5 }}>{info.description}</div>
                          </>
                        )}
                        {equipment.status === 'MAINTENANCE' && (
                          <>
                            <div style={{ fontWeight: 700 }}>🛠 {equipment.maintenanceReason || 'Motivo não informado'}</div>
                            <div style={{ color: 'var(--color-text-muted)', marginTop: 5 }}>Desde {formatDate(equipment.maintenanceStartedAt)}</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredEquipments.length === 0 && (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Nenhum equipamento corresponde aos filtros selecionados.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        .spin-icon { animation: scan-spin 900ms linear infinite; }
        @keyframes scan-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .scan-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .scan-equipment-row { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .scan-controls { grid-template-columns: 1fr !important; }
          .scan-summary-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
