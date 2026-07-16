// ==============================================
// PingAlert Pro — Alerts Page
// ==============================================

'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { BellOff, CheckCircle, AlertTriangle, AlertOctagon, Send, Megaphone } from 'lucide-react';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');

  useEffect(() => { loadAlerts(); }, [typeFilter, channelFilter]);

  async function loadAlerts() {
    try {
      const params: Record<string, string> = { limit: '100' };
      if (typeFilter) params.type = typeFilter;
      if (channelFilter) params.channel = channelFilter;
      const result = await api.getAlerts(params);
      setAlerts(result.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'OFFLINE': return <AlertOctagon size={28} color="var(--color-danger)" />;
      case 'ONLINE': return <CheckCircle size={28} color="var(--color-success)" />;
      case 'UNSTABLE': return <AlertTriangle size={28} color="var(--color-warning)" />;
      case 'ESCALATION': return <Megaphone size={28} color="var(--color-accent)" />;
      case 'MANUAL': return <Send size={28} color="var(--color-info)" />;
      default: return <Send size={28} color="var(--color-text-muted)" />;
    }
  };

  const channelColors: Record<string, { bg: string; color: string }> = {
    TELEGRAM: { bg: 'rgba(59,130,246,0.15)', color: 'var(--color-info)' },
    WHATSAPP: { bg: 'rgba(16,185,129,0.15)', color: 'var(--color-success)' },
    WEBHOOK: { bg: 'rgba(139,92,246,0.15)', color: 'var(--color-accent-light)' },
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Alertas</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Histórico de todos os alertas enviados</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="">Todos os tipos</option>
          <option value="OFFLINE">Offline</option>
          <option value="ONLINE">Online</option>
          <option value="UNSTABLE">Instável</option>
          <option value="MANUAL">Manual</option>
        </select>
        <select className="input" value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="">Todos os canais</option>
          <option value="TELEGRAM">Telegram</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="WEBHOOK">Webhook</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Carregando...</div>
        ) : alerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
            <BellOff size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p>Nenhum alerta encontrado</p>
          </div>
        ) : alerts.map((alert) => {
          const ch = channelColors[alert.channel] || { bg: 'var(--color-muted-bg)', color: 'var(--color-text-muted)' };
          return (
            <div key={alert.id} className="glass-card" style={{ padding: 20, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0, marginTop: 4 }}>{getTypeIcon(alert.type)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{alert.equipment?.name || 'Equipamento'}</span>
                  <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 'var(--radius-full)', background: ch.bg, color: ch.color, fontWeight: 600 }}>{alert.channel}</span>
                  <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 'var(--radius-full)', background: alert.delivered ? 'var(--color-success-bg)' : 'var(--color-danger-bg)', color: alert.delivered ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                    {alert.delivered ? '✓ Entregue' : '✗ Falhou'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                  {alert.equipment?.host} • {new Date(alert.sentAt).toLocaleString('pt-BR')}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 80, overflow: 'hidden', lineHeight: 1.5 }}>
                  {alert.message?.substring(0, 200)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
