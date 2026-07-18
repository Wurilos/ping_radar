'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { getReportOverview, ReportOverview } from '@/lib/report-api';
import ReportKpis from './ReportKpis';
import ReportTrend from './ReportTrend';
import ReportTable from './ReportTable';
import ContractHealth from './ContractHealth';

export default function ReportsDashboard() {
  const [report, setReport] = useState<ReportOverview | null>(null);
  const [contract, setContract] = useState('');
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function load(manual = false) {
    try {
      if (manual) setRefreshing(true);
      setError('');
      setReport(await getReportOverview({ contractNumber: contract, days }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível gerar o relatório.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { void load(); }, [contract, days]);

  if (loading) return <div className="empty-state">Gerando relatório com dados reais do monitoramento...</div>;
  if (!report) return <div className="glass-card empty-state"><h2>Relatório indisponível</h2><p>{error}</p><button className="btn btn-primary" onClick={() => void load(true)}>Tentar novamente</button></div>;

  return (
    <div>
      <div className="page-heading">
        <div><h1>Relatórios</h1><p>Disponibilidade, desempenho e incidentes filtrados por contrato.</p></div>
      </div>

      <div className="filter-bar">
        <div className="filter-field">
          <label className="label">Contrato</label>
          <select className="input" value={contract} onChange={event => setContract(event.target.value)}>
            <option value="">Todos os contratos</option>
            {report.contractBreakdown.map(item => <option key={item.name} value={item.name}>{item.name} ({item.total})</option>)}
          </select>
        </div>
        <div className="filter-field" style={{ maxWidth: 220 }}>
          <label className="label">Período</label>
          <select className="input" value={days} onChange={event => setDays(Number(event.target.value))}>
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={60}>Últimos 60 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
        </div>
        <button className="btn btn-ghost" disabled={refreshing} onClick={() => void load(true)}>
          <RefreshCw size={16} className={refreshing ? 'dashboard-spin' : ''} /> Atualizar
        </button>
        <span style={{ marginLeft: 'auto', alignSelf: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
          Gerado em {new Date(report.generatedAt).toLocaleString('pt-BR')}
        </span>
      </div>

      {error && <p style={{ color: 'var(--color-danger)', marginBottom: 16 }}>{error}</p>}
      <ReportKpis report={report} contract={contract} days={days} />
      <ReportTrend report={report} />
      {!contract && <ContractHealth contracts={report.contractBreakdown} onSelect={setContract} />}
      <ReportTable report={report} />
      <style jsx global>{`.dashboard-spin{animation:dashboard-spin 800ms linear infinite}@keyframes dashboard-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
