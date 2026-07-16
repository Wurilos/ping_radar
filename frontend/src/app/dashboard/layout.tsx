// ==============================================
// PingAlert Pro — Dashboard Layout
// ==============================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 800ms linear infinite', margin: '0 auto 16px', boxShadow: 'var(--shadow-neon-cyan)' }} />
          <p style={{ color: 'var(--color-text-muted)', letterSpacing: '2px', textTransform: 'uppercase', fontSize: 12 }}>Iniciando Sistemas...</p>
        </div>
        <style jsx>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content" style={{ flex: 1, marginLeft: 292, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar (Sci-Fi Glass) */}
        <header style={{
          height: 72, margin: '16px 16px 0 0', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)',
          background: 'var(--color-bg-sidebar)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
          position: 'sticky', top: 16, zIndex: 40, boxShadow: 'var(--shadow-md)',
        }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              display: 'none', background: 'none', border: 'none', color: 'var(--color-text-primary)',
              cursor: 'pointer', fontSize: 24, padding: 4,
            }}
            className="mobile-menu-btn"
          >
            ☰
          </button>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, color: 'var(--color-text-primary)', fontWeight: 600 }}>
              {user.name}
            </span>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-alt))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: 14, fontWeight: 700, boxShadow: 'var(--shadow-neon-cyan)' }}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ padding: '32px 16px 32px 0', flex: 1, width: '100%' }} className="animate-fade-in">
          {children}
        </main>
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: block !important; }
          .main-content { margin-left: 0 !important; }
          .main-content > header { margin: 16px !important; top: 16px !important; }
          .main-content > main { padding: 24px 16px !important; }
        }
      `}</style>
    </div>
  );
}
