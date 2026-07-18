'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart3, RefreshCw } from 'lucide-react';
import { getReportOverview, ReportOverview } from '@/lib/report-api';
import ReportKpis from '@/components/reports/ReportKpis';
import ReportTrend from '@/components/reports/ReportTrend';
import ContractHealth from '@/components/reports/ContractHealth';
import DashboardCritical from './DashboardCritical';
import DashboardVpnPanel from './DashboardVpnPanel';

export default function ModernDashboard() {
  const [report, setReport] = useState<ReportOverview | null>(null);
  const [contract, setContract] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(manual = false) {
    try {
      if (manual) setRefreshing(true);
      setError('');
      setReport(await getReportOverview({ contractNumber: contract, days: 7 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => clearInterval(timer);
  }, [contract]);

  if (loading) return <div className="empty-state">Carregando centro de monitoramento...</div>;
  if (!report) return <div className="glass-card empty-state"><h2>Dashboard indisponível</h2><p>{error}</p><button className="btn btn-primary" onClick={() => void load(true)}>Tentar novamente</button></div>;

  return (
    <div>
      <div className="page-heading">
        <div><h1>Dashboard</h1><p>Visão operacional em tempo real por contrato, equipamento e VPN.</p></div>
        <div className="report-actions">
          <Link className="btn btn-ghost" href="/dashboard/reports"><BarChart3 size={16} /> Relatórios</Link>
          <button className="btn btn-primary" onClick={() => void load(true)} disabled={refreshing}><RefreshCw size={16} className={refreshing ? 'dashboard-spin' : ''} /> Atualizar</button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-field">
          <label className="label">Filtrar dashboard por contrato</label>
          <select className="input" value={contract} onChange={event => setContract(event.target.value)}>
            <option value="">Todos os contratos</option>
            {report.contractBreakdown.map(item => <option key={item.name} value={item.name}>{item.name} ({item.total})</option>)}
          </select>
        </div>
        <div style={{ alignSelf: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
          Atualização automática a cada 30 segundos
        </div>
      </div>

      {error && <p style={{ color: 'var(--color-danger)', marginBottom: 16 }}>{error}</p>}
      <ReportKpis report={report} contract={contract} days={7} />
      <ReportTrend report={report} />

      <div className="dashboard-grid" style={{ marginBottom: 20 }}>
        <DashboardCritical items={report.criticalEquipments} />
        <DashboardVpnPanel />
      </div>

      {!contract && <ContractHealth contracts={report.contractBreakdown} onSelect={setContract} />}

      <section className="glass-card chart-card">
        <div className="card-heading"><h2>Alertas recentes</h2><Link className="btn btn-ghost btn-sm" href="/dashboard/alerts">Ver histórico</Link></div>
        {report.recentAlerts.length === 0 ? <div className="empty-state">Nenhum alerta no período.</div> : (
          <div className="health-list">
            {report.recentAlerts.map(alert => (
              <div key={alert.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 13, border: '1px solid var(--color-border-subtle)', borderRadius: 12, background: 'rgba(127,127,127,.035)' }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: alert.type === 'OFFLINE' ? 'var(--color-danger)' : alert.type === 'ONLINE' ? 'var(--color-success)' : 'var(--color-warning)' }} />
                <div style={{ flex: 1 }}><strong style={{ color: 'var(--color-text-primary)' }}>{alert.equipment.name}</strong><div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{alert.equipment.contractNumber || 'Sem contrato'} • {alert.channel}</div></div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 11, textAlign: 'right' }}>{new Date(alert.sentAt).toLocaleString('pt-BR')}<br />{alert.delivered ? 'Entregue' : 'Falha no envio'}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <style jsx global>{`.dashboard-spin{animation:dashboard-spin 800ms linear infinite}@keyframes dashboard-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
