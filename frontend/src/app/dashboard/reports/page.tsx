// Reports Page
'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function ReportsPage() {
  const [stats, setStats] = useState<any>(null);
  const [equipments, setEquipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [s, e] = await Promise.all([api.getEquipmentStats(), api.getEquipments({ limit: '200' })]);
      setStats(s);
      setEquipments((e.data || []).sort((a: any, b: any) => a.uptimePercent - b.uptimePercent));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>Carregando...</div>;

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Relatórios</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Análise de disponibilidade e desempenho</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Uptime Médio', value: `${stats?.avgUptime || 0}%`, color: 'var(--color-success)' },
          { label: 'Equipamentos', value: stats?.total || 0, color: 'var(--color-accent)' },
          { label: 'Offline Agora', value: stats?.offline || 0, color: 'var(--color-danger)' },
          { label: 'Alertas (24h)', value: stats?.recentAlerts || 0, color: 'var(--color-warning)' },
        ].map((card, i) => (
          <div key={i} className="kpi-card" style={{ padding: 20 }}>
            <div className="kpi-label">{card.label}</div>
            <div className="kpi-value" style={{ color: card.color, fontSize: 28 }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Availability Ranking */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>📊 Ranking de Disponibilidade</h2>
        <div className="table-container">
          <table className="table">
            <thead><tr><th>#</th><th>Equipamento</th><th>Cliente</th><th>Status</th><th>Uptime</th><th>Resp. Média</th><th style={{ width: 200 }}>Barra</th></tr></thead>
            <tbody>
              {equipments.map((eq: any, i: number) => (
                <tr key={eq.id}>
                  <td style={{ fontWeight: 700, color: 'var(--color-text-muted)' }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{eq.name}</td>
                  <td>{eq.client?.name || '-'}</td>
                  <td><span className={`status-badge status-${eq.status.toLowerCase()}`} style={{ fontSize: 10, padding: '1px 6px' }}>{eq.status}</span></td>
                  <td style={{ fontWeight: 600, color: eq.uptimePercent >= 99 ? 'var(--color-success)' : eq.uptimePercent >= 95 ? 'var(--color-warning)' : 'var(--color-danger)' }}>{eq.uptimePercent.toFixed(2)}%</td>
                  <td>{eq.avgResponseTime > 0 ? `${eq.avgResponseTime}ms` : '-'}</td>
                  <td>
                    <div style={{ width: '100%', height: 8, background: 'var(--color-bg-input)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        width: `${eq.uptimePercent}%`, height: '100%', borderRadius: 4,
                        background: eq.uptimePercent >= 99 ? 'var(--color-success)' : eq.uptimePercent >= 95 ? 'var(--color-warning)' : 'var(--color-danger)',
                        transition: 'width 500ms ease',
                      }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>📥 Exportar Relatório</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 16 }}>Exporte relatórios em formato CSV ou PDF (funcionalidade backend já preparada)</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost btn-sm">📄 Exportar CSV</button>
          <button className="btn btn-ghost btn-sm">📋 Exportar PDF</button>
        </div>
      </div>
    </div>
  );
}
