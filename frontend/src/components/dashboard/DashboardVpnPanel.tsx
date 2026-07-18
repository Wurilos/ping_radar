'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Shield } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface VpnStatus {
  profileName?: string;
  watchdogProfileName?: string;
  state?: string;
  message?: string;
  consecutiveFailures?: number;
  lastReconnect?: string | null;
  targets?: string[];
}

interface VpnItem {
  icon: string;
  label: string;
  stale: boolean;
  ageText: string;
  status: VpnStatus | null;
}

function colorFor(vpn: VpnItem) {
  if (vpn.stale) return 'var(--color-text-muted)';
  const state = String(vpn.status?.state || '').toUpperCase();
  if (state === 'ONLINE') return 'var(--color-success)';
  if (['VPN_UNREACHABLE', 'RECONNECTING', 'COOLDOWN'].includes(state)) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

export default function DashboardVpnPanel() {
  const [items, setItems] = useState<VpnItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const token = localStorage.getItem('pingalert_token');
      const response = await fetch(`${API_URL}/api/equipments/vpn-status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      if (!response.ok) return;
      const payload = await response.json();
      setItems(Array.isArray(payload.data) ? payload.data : payload.status ? [payload] : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="glass-card chart-card">
      <div className="card-heading">
        <h2><Shield size={18} color="var(--color-accent)" /> Túneis VPN ({items.length})</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => void load()} disabled={loading}><RefreshCw size={14} /> Atualizar</button>
      </div>
      {items.length === 0 ? <div className="empty-state">Aguardando dados dos watchdogs das VPNs.</div> : (
        <div className="health-list">
          {items.map((vpn, index) => {
            const color = colorFor(vpn);
            const profile = vpn.status?.profileName || vpn.status?.watchdogProfileName || `VPN ${index + 1}`;
            return (
              <div key={`${profile}-${index}`} style={{ padding: 16, border: `1px solid ${color}`, borderRadius: 14, background: 'rgba(127,127,127,.035)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, boxShadow: `0 0 12px ${color}` }} />
                  <div style={{ flex: 1 }}><strong style={{ color: 'var(--color-text-primary)' }}>{profile}</strong><div style={{ color, fontSize: 12, marginTop: 3 }}>{vpn.icon} {vpn.label}</div></div>
                  <Shield size={27} color={color} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8, marginTop: 13, fontSize: 11 }}>
                  <div><span style={{ color: 'var(--color-text-muted)' }}>Último teste</span><strong style={{ display: 'block', color: 'var(--color-text-primary)' }}>{vpn.ageText}</strong></div>
                  <div><span style={{ color: 'var(--color-text-muted)' }}>Falhas</span><strong style={{ display: 'block', color: 'var(--color-text-primary)' }}>{vpn.status?.consecutiveFailures ?? 0}</strong></div>
                  <div><span style={{ color: 'var(--color-text-muted)' }}>Mensagem</span><strong style={{ display: 'block', color: 'var(--color-text-primary)' }}>{vpn.status?.message || '-'}</strong></div>
                  <div><span style={{ color: 'var(--color-text-muted)' }}>IPs de teste</span><strong style={{ display: 'block', color: 'var(--color-text-primary)' }}>{(vpn.status?.targets || []).join(', ') || '-'}</strong></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
