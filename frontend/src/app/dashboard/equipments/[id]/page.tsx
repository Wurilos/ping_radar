// ==============================================
// PingAlert Pro — Equipment Detail Page
// ==============================================

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

const statusMap: Record<string, { label: string; class: string }> = {
  ONLINE: { label: 'Online', class: 'status-online' },
  OFFLINE: { label: 'Offline', class: 'status-offline' },
  UNSTABLE: { label: 'Instável', class: 'status-unstable' },
  MAINTENANCE: { label: 'Manutenção', class: 'status-maintenance' },
};

export default function EquipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [equipment, setEquipment] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [responseData, setResponseData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) loadData();
  }, [params.id]);

  async function loadData() {
    try {
      const [eq, hist, resp] = await Promise.all([
        api.getEquipment(params.id as string),
        api.getEquipmentHistory(params.id as string, { limit: '20' }),
        api.getResponseTimeData(params.id as string, 24),
      ]);
      setEquipment(eq);
      setHistory(hist.data || []);
      setResponseData(resp || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleTest() {
    try {
      const result = await api.testEquipment(params.id as string);
      alert(`Resultado: ${result?.success ? '✅ Online' : '❌ Offline'}${result?.responseTime ? ` (${result.responseTime}ms)` : ''}${result?.error ? `\nErro: ${result.error}` : ''}`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 800ms linear infinite' }} />
        <style jsx>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!equipment) {
    return <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>Equipamento não encontrado</div>;
  }

  const status = statusMap[equipment.status] || statusMap.ONLINE;
  const maxResponse = Math.max(...responseData.map((d: any) => d.responseTime || 0), 1);

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 13, color: 'var(--color-text-muted)' }}>
        <Link href="/dashboard/equipments" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>Equipamentos</Link>
        <span>→</span>
        <span>{equipment.name}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800 }}>{equipment.name}</h1>
            <span className={`status-badge ${status.class}`}>{status.label}</span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            {equipment.internalId} • {equipment.host}{equipment.port ? `:${equipment.port}` : ''} • {equipment.checkType}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={handleTest}>🔍 Testar Agora</button>
          <button className="btn btn-ghost btn-sm" onClick={() => router.back()}>← Voltar</button>
        </div>
      </div>

      {/* Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Uptime', value: `${equipment.uptimePercent.toFixed(2)}%`, color: equipment.uptimePercent >= 99 ? 'var(--color-success)' : 'var(--color-warning)' },
          { label: 'Resp. Média', value: `${equipment.avgResponseTime}ms`, color: 'var(--color-accent-light)' },
          { label: 'Falhas Consec.', value: equipment.consecutiveFailures, color: equipment.consecutiveFailures > 0 ? 'var(--color-danger)' : 'var(--color-success)' },
          { label: 'Verificações', value: equipment._count?.checks || 0, color: 'var(--color-info)' },
          { label: 'Alertas', value: equipment._count?.alerts || 0, color: 'var(--color-warning)' },
          { label: 'Intervalo', value: `${equipment.checkInterval}s`, color: 'var(--color-text-secondary)' },
        ].map((card, i) => (
          <div key={i} className="kpi-card" style={{ padding: 20 }}>
            <div className="kpi-label">{card.label}</div>
            <div className="kpi-value" style={{ color: card.color, fontSize: 24 }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginBottom: 32 }}>
        {/* Equipment Info */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📋 Informações</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              { label: 'Cliente', value: equipment.client?.name || 'Sem cliente' },
              { label: 'Localização', value: equipment.location || '-' },
              { label: 'Grupo', value: equipment.groupName || '-' },
              { label: 'Última Verificação', value: equipment.lastCheck ? new Date(equipment.lastCheck).toLocaleString('pt-BR') : '-' },
              { label: 'Último Online', value: equipment.lastOnline ? new Date(equipment.lastOnline).toLocaleString('pt-BR') : '-' },
              { label: 'Último Offline', value: equipment.lastOffline ? new Date(equipment.lastOffline).toLocaleString('pt-BR') : '-' },
              { label: 'Threshold', value: `${equipment.failThreshold} falhas consecutivas` },
              { label: 'Cooldown Alertas', value: `${equipment.alertCooldown}s` },
              { label: 'Notas', value: equipment.notes || '-' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(42,49,84,0.3)' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Response Time Chart */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>⚡ Tempo de Resposta (24h)</h2>
          {responseData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Sem dados disponíveis</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 200 }}>
              {responseData.slice(-60).map((d: any, i: number) => (
                <div key={i} style={{
                  flex: 1,
                  height: `${((d.responseTime || 0) / maxResponse) * 100}%`,
                  minHeight: 2,
                  background: (d.responseTime || 0) > equipment.avgResponseTime * 2 ? 'var(--color-warning)' : 'var(--color-accent)',
                  borderRadius: '2px 2px 0 0',
                  opacity: 0.7,
                  transition: 'height 300ms ease',
                }} title={`${d.responseTime?.toFixed(1)}ms`} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📜 Histórico de Verificações</h2>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Resultado</th>
                <th>Resposta</th>
                <th>Erro</th>
                <th>Status Anterior</th>
                <th>Novo Status</th>
                <th>Alerta</th>
              </tr>
            </thead>
            <tbody>
              {history.map((check: any) => (
                <tr key={check.id}>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(check.checkedAt).toLocaleString('pt-BR')}</td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      color: check.success ? 'var(--color-success)' : 'var(--color-danger)',
                      fontWeight: 600, fontSize: 13,
                    }}>
                      {check.success ? '✓ OK' : '✗ Falha'}
                    </span>
                  </td>
                  <td>{check.responseTime ? `${check.responseTime.toFixed(1)}ms` : '-'}</td>
                  <td style={{ fontSize: 12, color: 'var(--color-danger)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{check.error || '-'}</td>
                  <td><span className={`status-badge ${statusMap[check.previousStatus]?.class || ''}`} style={{ fontSize: 10, padding: '1px 6px' }}>{check.previousStatus || '-'}</span></td>
                  <td><span className={`status-badge ${statusMap[check.newStatus]?.class || ''}`} style={{ fontSize: 10, padding: '1px 6px' }}>{check.newStatus || '-'}</span></td>
                  <td>{check.alertSent ? `📨 ${check.alertChannel || ''}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
