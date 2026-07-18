'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard, Server, Users, Bell, ScrollText, UserCog,
  BarChart, Cable, Settings, Activity, Radar,
} from 'lucide-react';

const menuItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'TECH', 'CLIENT'] },
  { href: '/dashboard/equipments', icon: Server, label: 'Equipamentos', roles: ['ADMIN', 'TECH', 'CLIENT'] },
  { href: '/dashboard/scans', icon: Radar, label: 'Varredura', roles: ['ADMIN', 'TECH', 'CLIENT'] },
  { href: '/dashboard/clients', icon: Users, label: 'Clientes', roles: ['ADMIN', 'TECH'] },
  { href: '/dashboard/alerts', icon: Bell, label: 'Alertas', roles: ['ADMIN', 'TECH', 'CLIENT'] },
  { href: '/dashboard/history', icon: ScrollText, label: 'Histórico', roles: ['ADMIN', 'TECH', 'CLIENT'] },
  { href: '/dashboard/users', icon: UserCog, label: 'Usuários', roles: ['ADMIN'] },
  { href: '/dashboard/reports', icon: BarChart, label: 'Relatórios', roles: ['ADMIN', 'TECH'] },
  { href: '/dashboard/integrations', icon: Cable, label: 'Integrações', roles: ['ADMIN'] },
  { href: '/dashboard/settings', icon: Settings, label: 'Configurações', roles: ['ADMIN'] },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const filteredItems = menuItems.filter(item => user?.role ? item.roles.includes(user.role) : false);

  return (
    <>
      {open && <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 49, display: 'none' }} className="mobile-overlay" />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-alt))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'var(--shadow-neon-cyan)' }}>
            <Activity color="#000" size={24} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-text-primary)', letterSpacing: '0.5px' }}>PING<span style={{ color: 'var(--color-accent)' }}>ALERT</span></div>
            <div style={{ fontSize: 10, color: 'var(--color-accent-light)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Central de Monitoramento</div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
          {filteredItems.map(item => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return <Link key={item.href} href={item.href} className={`sidebar-link ${isActive ? 'active' : ''}`} onClick={onClose}><item.icon size={20} />{item.label}</Link>;
          })}
        </nav>

        <div style={{ borderTop: '1px solid var(--color-border)', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '8px 4px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-alt))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#000', boxShadow: 'var(--shadow-neon-purple)' }}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--color-text-primary)' }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--color-accent)' }}>{user?.role}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/dashboard/profile" className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onClose}>Perfil</Link>
            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={logout}>Sair</button>
          </div>
        </div>
      </aside>
      <style jsx global>{`@media (max-width:768px){.mobile-overlay{display:block!important}}`}</style>
    </>
  );
}
