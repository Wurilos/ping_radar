// History Page
'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function HistoryPage() {
  const [equipments, setEquipments] = useState<any[]>([]);
  const [selectedEq, setSelectedEq] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getEquipments({ limit: '200' }).then(r => setEquipments(r.data || [])).catch(console.error);
  }, []);

  useEffect(() => { if (selectedEq) loadHistory(); }, [selectedEq]);

  async function loadHistory() {
    setLoading(true);
    try { const r = await api.getEquipmentHistory(selectedEq, { limit: '100' }); setHistory(r.data || []); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  }

  const statusMap: Record<string, { label: string; class: string }> = {
    ONLINE: { label: 'Online', class: 'status-online' }, OFFLINE: { label: 'Offline', class: 'status-offline' },
    UNSTABLE: { label: 'Instável', class: 'status-unstable' }, MAINTENANCE: { label: 'Manutenção', class: 'status-maintenance' },
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Histórico</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Histórico detalhado de verificações</p>
      </div>
      <select className="input" value={selectedEq} onChange={(e) => setSelectedEq(e.target.value)} style={{ maxWidth: 400, marginBottom: 20 }}>
        <option value="">Selecione um equipamento</option>
        {equipments.map((eq: any) => <option key={eq.id} value={eq.id}>{eq.name} ({eq.host})</option>)}
      </select>

      {!selectedEq ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📜</div><p>Selecione um equipamento para ver o histórico</p>
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Carregando...</div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Data/Hora</th><th>Resultado</th><th>Resposta</th><th>Erro</th><th>Status</th><th>Alerta</th></tr></thead>
            <tbody>
              {history.map((c: any) => (
                <tr key={c.id}>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(c.checkedAt).toLocaleString('pt-BR')}</td>
                  <td><span style={{ color: c.success ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600, fontSize: 13 }}>{c.success ? '✓ OK' : '✗ Falha'}</span></td>
                  <td>{c.responseTime ? `${c.responseTime.toFixed(1)}ms` : '-'}</td>
                  <td style={{ fontSize: 12, color: 'var(--color-danger)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.error || '-'}</td>
                  <td><span className={`status-badge ${statusMap[c.newStatus]?.class || ''}`} style={{ fontSize: 10, padding: '1px 6px' }}>{c.newStatus || '-'}</span></td>
                  <td>{c.alertSent ? `📨 ${c.alertChannel || ''}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
