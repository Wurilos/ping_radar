// ==============================================
// PingAlert Pro — Clients Page
// ==============================================

'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Plus, Search, Trash2, Edit2, Mail, Phone, MessageCircle } from 'lucide-react';

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: '', company: '', document: '', phone: '', whatsapp: '',
    telegramChatId: '', email: '', address: '', notes: '', plan: 'BASIC', maxEquipments: '10',
  });

  useEffect(() => { loadClients(); }, [search]);

  async function loadClients() {
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      const result = await api.getClients(params);
      setClients(result.data || []);
      setSelectedIds([]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      const data = { ...form, maxEquipments: parseInt(form.maxEquipments) };
      if (editing) await api.updateClient(editing.id, data);
      else await api.createClient(data);
      setShowModal(false);
      resetForm();
      loadClients();
    } catch (err: any) { alert(err.message); }
  }

  function resetForm() {
    setForm({ name: '', company: '', document: '', phone: '', whatsapp: '', telegramChatId: '', email: '', address: '', notes: '', plan: 'BASIC', maxEquipments: '10' });
    setEditing(null);
  }

  function editClient(c: any) {
    setForm({
      name: c.name, company: c.company || '', document: c.document || '', phone: c.phone || '',
      whatsapp: c.whatsapp || '', telegramChatId: c.telegramChatId || '', email: c.email || '',
      address: c.address || '', notes: c.notes || '', plan: c.plan, maxEquipments: c.maxEquipments.toString(),
    });
    setEditing(c);
    setShowModal(true);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir cliente "${name}"?`)) return;
    try { await api.deleteClient(id); loadClients(); }
    catch (err: any) { alert(err.message); }
  }

  function toggleSelectAll(checked: boolean) {
    if (checked) setSelectedIds(clients.map(c => c.id));
    else setSelectedIds([]);
  }

  function toggleSelect(id: string, checked: boolean) {
    if (checked) setSelectedIds(prev => [...prev, id]);
    else setSelectedIds(prev => prev.filter(i => i !== id));
  }

  async function handleBulkDelete() {
    if (!confirm(`Atenção: A exclusão de clientes apagará TODOS os seus equipamentos atrelados! Deseja realmente excluir os ${selectedIds.length} clientes selecionados?`)) return;
    try {
      await api.deleteClients(selectedIds);
      setSelectedIds([]);
      loadClients();
    } catch (err: any) {
      alert(err.message);
    }
  }

  const planColors: Record<string, string> = { BASIC: 'var(--color-info)', PRO: 'var(--color-accent)', ENTERPRISE: 'var(--color-warning)' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Clientes</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>{clients.length} clientes cadastrados</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <input className="input" placeholder="🔍 Buscar clientes..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 400, width: '100%' }} />
        
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
          <input type="checkbox" checked={clients.length > 0 && selectedIds.length === clients.length} onChange={(e) => toggleSelectAll(e.target.checked)} />
          Selecionar Todos
        </label>
      </div>

      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--color-bg-sidebar)', borderRadius: 'var(--radius-lg)', marginBottom: 16, border: '1px solid var(--color-primary)' }}>
          <span style={{ fontWeight: 600 }}>{selectedIds.length} clientes selecionados</span>
          <button className="btn btn-sm" style={{ background: 'var(--color-danger)', color: 'white', border: 'none' }} onClick={handleBulkDelete}>
            <Trash2 size={14} /> Excluir Selecionados
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
        {loading ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Carregando...</div>
        ) : clients.map((client) => (
          <div key={client.id} className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <input type="checkbox" style={{ marginTop: 4 }} checked={selectedIds.includes(client.id)} onChange={(e) => toggleSelect(client.id, e.target.checked)} />
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{client.name}</h3>
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{client.company || ''}</p>
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 'var(--radius-full)', background: `${planColors[client.plan] || 'var(--color-info)'}20`, color: planColors[client.plan] || 'var(--color-info)' }}>
                {client.plan}
              </span>
            </div>
            <div style={{ display: 'grid', gap: 8, fontSize: 13, marginBottom: 16 }}>
              {client.email && <div style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={14} /> {client.email}</div>}
              {client.phone && <div style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={14} /> {client.phone}</div>}
              {client.whatsapp && <div style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}><MessageCircle size={14} /> {client.whatsapp}</div>}
            </div>
            <div style={{ display: 'flex', gap: 16, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 12 }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Equipamentos: </span>
                <span style={{ fontWeight: 600 }}>{client._count?.equipments || 0}</span>
              </div>
              <div style={{ fontSize: 12 }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Usuários: </span>
                <span style={{ fontWeight: 600 }}>{client._count?.users || 0}</span>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => editClient(client)} style={{ padding: '6px', borderRadius: '50%' }}>
                  <Edit2 size={16} />
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(client.id, client.name)} style={{ padding: '6px', borderRadius: '50%', color: 'var(--color-danger)' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-content" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: 24, cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div><label className="label">Nome *</label><input className="input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required /></div>
                <div><label className="label">Empresa</label><input className="input" value={form.company} onChange={(e) => setForm({...form, company: e.target.value})} /></div>
                <div><label className="label">Documento</label><input className="input" value={form.document} onChange={(e) => setForm({...form, document: e.target.value})} /></div>
                <div><label className="label">Telefone</label><input className="input" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} /></div>
                <div><label className="label">WhatsApp</label><input className="input" value={form.whatsapp} onChange={(e) => setForm({...form, whatsapp: e.target.value})} placeholder="5511999999999" /></div>
                <div><label className="label">Telegram Chat ID</label><input className="input" value={form.telegramChatId} onChange={(e) => setForm({...form, telegramChatId: e.target.value})} /></div>
                <div><label className="label">E-mail</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} /></div>
                <div><label className="label">Plano</label>
                  <select className="input" value={form.plan} onChange={(e) => setForm({...form, plan: e.target.value})}>
                    <option value="BASIC">Básico</option><option value="PRO">Profissional</option><option value="ENTERPRISE">Empresarial</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1/-1' }}><label className="label">Endereço</label><input className="input" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} /></div>
                <div style={{ gridColumn: '1/-1' }}><label className="label">Observações</label><textarea className="input" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} style={{ minHeight: 60 }} /></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--color-border)' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Salvar' : 'Criar Cliente'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
