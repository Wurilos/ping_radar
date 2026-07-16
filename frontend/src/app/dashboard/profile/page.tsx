// Profile Page
'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

export default function ProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const data: any = { name, email };
      if (newPassword) { data.currentPassword = currentPassword; data.newPassword = newPassword; }
      await api.updateProfile(data);
      alert('✅ Perfil atualizado!');
      setCurrentPassword(''); setNewPassword('');
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Perfil</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Suas informações pessoais</p>
      </div>

      <div style={{ maxWidth: 500 }}>
        <div className="glass-card" style={{ padding: 24, marginBottom: 24, textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, color: '#fff', marginBottom: 16 }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>{user?.name}</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{user?.email}</p>
          <span style={{ display: 'inline-block', marginTop: 8, fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 'var(--radius-full)', background: 'rgba(99,102,241,0.15)', color: 'var(--color-accent)' }}>{user?.role}</span>
        </div>

        <form onSubmit={handleSave} className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Editar Perfil</h3>
          <div style={{ display: 'grid', gap: 16 }}>
            <div><label className="label">Nome</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><label className="label">E-mail</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Alterar Senha</h4>
              <div style={{ display: 'grid', gap: 12 }}>
                <div><label className="label">Senha Atual</label><input className="input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></div>
                <div><label className="label">Nova Senha</label><input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
              </div>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 20 }} disabled={saving}>
            {saving ? 'Salvando...' : '💾 Salvar Alterações'}
          </button>
        </form>
      </div>
    </div>
  );
}
