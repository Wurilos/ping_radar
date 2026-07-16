// ==============================================
// PingAlert Pro — Users, Settings, Integrations, History, Reports, Profile Pages
// ==============================================

// ---- Users Page ----
'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Plus, Pause, Play, Trash2 } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'TECH', clientId: '' });

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try { const r = await api.getUsers(); setUsers(r.data || []); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createUser(form);
      setShowModal(false);
      setForm({ name: '', email: '', password: '', role: 'TECH', clientId: '' });
      loadUsers();
    } catch (err: any) { alert(err.message); }
  }

  async function toggleActive(id: string, active: boolean) {
    try { await api.updateUser(id, { active: !active }); loadUsers(); }
    catch (err: any) { alert(err.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este usuário?')) return;
    try { await api.deleteUser(id); loadUsers(); }
    catch (err: any) { alert(err.message); }
  }

  const roleColors: Record<string, string> = {
    ADMIN: 'var(--color-danger)', TECH: 'var(--color-accent)', CLIENT: 'var(--color-success)',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Usuários</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Gerenciamento de acesso</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Novo Usuário
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th>Nome</th><th>E-mail</th><th>Função</th><th>Cliente</th><th>Status</th><th>Último Login</th><th>Ações</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>Carregando...</td></tr>
            ) : users.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.name}</td>
                <td>{u.email}</td>
                <td><span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 'var(--radius-full)', background: `${roleColors[u.role]}20`, color: roleColors[u.role] }}>{u.role}</span></td>
                <td>{u.client?.name || '-'}</td>
                <td><span className={`status-badge ${u.active ? 'status-online' : 'status-offline'}`} style={{ fontSize: 10 }}>{u.active ? 'Ativo' : 'Inativo'}</span></td>
                <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{u.lastLogin ? new Date(u.lastLogin).toLocaleString('pt-BR') : 'Nunca'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(u.id, u.active)} style={{ padding: '6px', borderRadius: '50%' }}>
                      {u.active ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(u.id)} style={{ padding: '6px', borderRadius: '50%', color: 'var(--color-danger)' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Novo Usuário</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: 24, cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gap: 16 }}>
                <div><label className="label">Nome *</label><input className="input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required /></div>
                <div><label className="label">E-mail *</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required /></div>
                <div><label className="label">Senha *</label><input className="input" type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required /></div>
                <div><label className="label">Função</label>
                  <select className="input" value={form.role} onChange={(e) => setForm({...form, role: e.target.value})}>
                    <option value="ADMIN">Administrador</option><option value="TECH">Técnico</option><option value="CLIENT">Cliente</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Criar Usuário</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
