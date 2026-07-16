// ==============================================
// PingAlert Pro — Dashboard Page
// ==============================================

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { 
  Server, CheckCircle, AlertTriangle, AlertOctagon, Wrench, Bell, 
  Activity, Zap, PartyPopper, BellOff, Shield
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface Stats {
  total: number;
  online: number;
  offline: number;
  unstable: number;
  maintenance: number;
  recentAlerts: number;
  avgUptime: number;
  avgResponseTime: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [offlineEquipments, setOfflineEquipments] = useState<any[]>([]);
  const [vpnEquipments, setVpnEquipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data for the AreaChart
  const chartData = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      name: `${i}h`,
      availability: 85 + Math.random() * 15,
      response: 10 + Math.random() * 50
    }));
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [statsData, alertsData, eqData, vpnData] = await Promise.all([
        api.getEquipmentStats(),
        api.getAlerts({ limit: '5' }),
        api.getEquipments({ status: 'OFFLINE', limit: '10' }),
        api.getEquipments({ checkType: 'OPENVPN', limit: '10' }),
      ]);
      setStats(statsData);
      setAlerts(alertsData.data || []);
      setOfflineEquipments(eqData.data || []);
      setVpnEquipments(vpnData.data || []);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 800ms linear infinite', boxShadow: 'var(--shadow-neon-cyan)' }} />
        <style jsx>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const kpis = [
    { label: 'Total Equipamentos', value: stats?.total || 0, icon: <Server size={24} />, color: 'var(--color-accent)', bg: 'rgba(0,240,255,0.15)' },
    { label: 'Online', value: stats?.online || 0, icon: <CheckCircle size={24} />, color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
    { label: 'Offline', value: stats?.offline || 0, icon: <AlertOctagon size={24} />, color: 'var(--color-danger)', bg: 'var(--color-danger-bg)' },
    { label: 'Instáveis', value: stats?.unstable || 0, icon: <AlertTriangle size={24} />, color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
    { label: 'Manutenção', value: stats?.maintenance || 0, icon: <Wrench size={24} />, color: 'var(--color-text-primary)', bg: 'rgba(255,255,255,0.1)' },
    { label: 'Alertas (24h)', value: stats?.recentAlerts || 0, icon: <Bell size={24} />, color: 'var(--color-accent-alt)', bg: 'rgba(176,38,255,0.15)' },
    { label: 'Uptime Médio', value: `${stats?.avgUptime || 0}%`, icon: <Activity size={24} />, color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
    { label: 'Resp. Média', value: `${stats?.avgResponseTime || 0}ms`, icon: <Zap size={24} />, color: 'var(--color-accent)', bg: 'rgba(0,240,255,0.15)' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 4, background: 'linear-gradient(90deg, #fff, var(--color-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Dashboard</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, letterSpacing: '1px', textTransform: 'uppercase' }}>Centro de Comando e Monitoramento Global</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 40 }}>
        {kpis.map((kpi, i) => (
          <div key={i} className="kpi-card" style={{ animationDelay: `${i * 50}ms`, '--kpi-bg': kpi.bg, '--kpi-color': kpi.color } as React.CSSProperties}>
            <div className="kpi-icon">
              {kpi.icon}
            </div>
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-label">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 32 }}>
        {/* Offline Equipment */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid var(--color-border)', paddingBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '1px', textTransform: 'uppercase' }}>
              <div style={{ padding: 6, background: 'var(--color-danger-bg)', borderRadius: 8, color: 'var(--color-danger)', boxShadow: '0 0 10px var(--color-danger-bg)' }}>
                <AlertOctagon size={16} />
              </div>
              Sistemas Críticos
            </h2>
            <Link href="/dashboard/equipments?status=OFFLINE" className="btn btn-ghost btn-sm" style={{ border: 'none' }}>Ver todos</Link>
          </div>

          {offlineEquipments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-success)', textShadow: '0 0 10px rgba(0,255,136,0.3)' }}>
              <CheckCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.8 }} />
              <p style={{ fontWeight: 600, letterSpacing: '1px' }}>TODOS OS SISTEMAS ONLINE</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {offlineEquipments.map((eq: any) => (
                <Link key={eq.id} href={`/dashboard/equipments/${eq.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '16px',
                  background: 'linear-gradient(90deg, rgba(255,0,68,0.05), transparent)', borderRadius: 'var(--radius-md)',
                  borderLeft: '2px solid var(--color-danger)', borderBottom: '1px solid var(--color-border-subtle)',
                  textDecoration: 'none', color: 'inherit',
                  transition: 'all var(--transition-fast)',
                }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--color-danger)', boxShadow: '0 0 10px var(--color-danger)', animation: 'pulse-led-fast 1s infinite alternate' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', textShadow: '0 0 4px rgba(255,0,68,0.5)' }}>{eq.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>{eq.host} • {eq.client?.name || 'Local'}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-danger)', fontWeight: 700, padding: '4px 12px', background: 'rgba(255,0,68,0.1)', borderRadius: 12 }}>
                    {eq.consecutiveFailures} FALHAS
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Alerts */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid var(--color-border)', paddingBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '1px', textTransform: 'uppercase' }}>
              <div style={{ padding: 6, background: 'rgba(176,38,255,0.15)', borderRadius: 8, color: 'var(--color-accent-alt)', boxShadow: '0 0 10px rgba(176,38,255,0.2)' }}>
                <Bell size={16} />
              </div>
              Transmissões (Logs)
            </h2>
            <Link href="/dashboard/alerts" className="btn btn-ghost btn-sm" style={{ border: 'none' }}>Ver histórico</Link>
          </div>

          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
              <BellOff size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <p style={{ letterSpacing: '1px' }}>SEM TRANSMISSÕES RECENTES</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {alerts.map((alert: any) => (
                <div key={alert.id} style={{
                  padding: '16px', background: 'rgba(255,255,255,0.02)',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)',
                  display: 'flex', gap: 12
                }}>
                  <div style={{ paddingTop: 2 }}>
                    {alert.type === 'OFFLINE' ? <AlertOctagon size={16} color="var(--color-danger)" /> : 
                     alert.type === 'ONLINE' ? <CheckCircle size={16} color="var(--color-success)" /> : 
                     <AlertTriangle size={16} color="var(--color-warning)" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{alert.equipment?.name || 'Equipamento'}</span>
                      <span style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: '4px',
                        background: 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontWeight: 700,
                        letterSpacing: '0.5px'
                      }}>
                        {alert.channel}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{new Date(alert.sentAt).toLocaleString('pt-BR')}</span>
                      <span style={{ color: alert.delivered ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {alert.delivered ? 'ENVIADO' : 'FALHA'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* VPN Status */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid var(--color-border)', paddingBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '1px', textTransform: 'uppercase' }}>
              <div style={{ padding: 6, background: 'rgba(0, 240, 255, 0.15)', borderRadius: 8, color: 'var(--color-accent)', boxShadow: '0 0 10px rgba(0, 240, 255, 0.2)' }}>
                <Shield size={16} />
              </div>
              Túneis VPN (Status)
            </h2>
            <Link href="/dashboard/equipments" className="btn btn-ghost btn-sm" style={{ border: 'none' }}>Gerenciar</Link>
          </div>

          {vpnEquipments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
              <Shield size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <p style={{ letterSpacing: '1px' }}>NENHUMA VPN MONITORADA</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {vpnEquipments.map((vpn: any) => (
                <Link key={vpn.id} href={`/dashboard/equipments/${vpn.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '16px',
                  background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)',
                  borderLeft: `2px solid ${vpn.status === 'ONLINE' ? 'var(--color-success)' : 'var(--color-danger)'}`, 
                  borderBottom: '1px solid var(--color-border-subtle)',
                  textDecoration: 'none', color: 'inherit',
                  transition: 'all var(--transition-fast)',
                }}>
                  <div style={{ 
                    width: 12, height: 12, borderRadius: '50%', 
                    background: vpn.status === 'ONLINE' ? 'var(--color-success)' : 'var(--color-danger)', 
                    boxShadow: `0 0 10px ${vpn.status === 'ONLINE' ? 'var(--color-success)' : 'var(--color-danger)'}`,
                    animation: vpn.status === 'ONLINE' ? 'pulse-led 2s infinite alternate' : 'pulse-led-fast 1s infinite alternate' 
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', textShadow: vpn.status === 'ONLINE' ? '0 0 4px rgba(0,255,136,0.3)' : '0 0 4px rgba(255,0,68,0.5)' }}>{vpn.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>CN: {vpn.host} • {vpn.client?.name || 'Local'}</div>
                  </div>
                  <div style={{ 
                    fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 12,
                    color: vpn.status === 'ONLINE' ? 'var(--color-success)' : 'var(--color-danger)',
                    background: vpn.status === 'ONLINE' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)' 
                  }}>
                    {vpn.status}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Availability bar chart */}
      <div className="glass-card" style={{ padding: 32, marginTop: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, letterSpacing: '1px', textTransform: 'uppercase' }}>
          <div style={{ padding: 8, background: 'rgba(0,240,255,0.15)', borderRadius: 8, color: 'var(--color-accent)', boxShadow: '0 0 15px rgba(0,240,255,0.3)' }}>
            <Activity size={20} />
          </div>
          Telemetria de Disponibilidade
        </h2>
        
        <div style={{ width: '100%', height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAvailability" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.6}/>
                  <stop offset="50%" stopColor="#b026ff" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#b026ff" stopOpacity={0}/>
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} domain={[50, 100]} />
              <Tooltip 
                contentStyle={{ background: 'rgba(10,15,25,0.8)', border: '1px solid var(--color-accent)', borderRadius: '8px', boxShadow: '0 0 15px rgba(0,240,255,0.2)', backdropFilter: 'blur(16px)' }}
                itemStyle={{ color: 'var(--color-accent)', fontWeight: 700 }}
                labelStyle={{ color: '#fff', marginBottom: 8 }}
              />
              <Area 
                type="monotone" 
                dataKey="availability" 
                stroke="#00f0ff" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorAvailability)" 
                filter="url(#glow)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
