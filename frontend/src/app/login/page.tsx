// ==============================================
// PingAlert Pro — Login Page
// ==============================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao entrar';
      const apiUnavailable = message.toLowerCase().includes('failed to fetch') || message.toLowerCase().includes('network');

      setError(
        apiUnavailable
          ? 'Não foi possível conectar à API. Aguarde a inicialização do backend e tente novamente.'
          : message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--gradient-hero)', position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative */}
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', top: -200, right: -200 }} />
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', bottom: -100, left: -100 }} />

      <div style={{ width: '100%', maxWidth: 420, padding: 24, position: 'relative', zIndex: 1 }} className="animate-slide-up">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--gradient-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 16, boxShadow: 'var(--shadow-glow)' }}>📡</div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>
            <span style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PingAlert Pro</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 8 }}>Acesse seu painel de monitoramento</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{
          background: 'rgba(26, 31, 53, 0.8)', backdropFilter: 'blur(20px)',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)',
          padding: 32,
        }}>
          {error && (
            <div style={{
              padding: '10px 16px', marginBottom: 20, borderRadius: 'var(--radius-md)',
              background: 'var(--color-danger-bg)', border: '1px solid rgba(239,68,68,0.3)',
              color: 'var(--color-danger)', fontSize: 13, fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label className="label">E-mail</label>
            <input
              type="email"
              className="input"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label className="label">Senha</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px 24px' }} disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />
                Entrando...
              </span>
            ) : 'Entrar'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Credenciais de teste:<br/>
            <span style={{ color: 'var(--color-text-secondary)' }}>admin@pingalert.pro / admin123</span>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
