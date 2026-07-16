// ==============================================
// PingAlert Pro — Equipments Page
// ==============================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Plus, Search, Trash2, Edit2, Zap, Wrench, Activity } from 'lucide-react';

const statusMap: Record<string, { label: string; class: string }> = {
  ONLINE: { label: 'Online', class: 'status-online' },
  OFFLINE: { label: 'Offline', class: 'status-offline' },
  UNSTABLE: { label: 'Instável', class: 'status-unstable' },
  MAINTENANCE: { label: 'Manutenção', class: 'status-maintenance' },
};

export default function EquipmentsPage() {
  const [equipments, setEquipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<any>(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Form state
  const [form, setForm] = useState({
    internalId: '', name: '', host: '', checkType: 'PING', port: '',
    location: '', clientId: '', groupName: '', checkInterval: '60',
    failThreshold: '3', alertCooldown: '300', notes: '',
    monitoringEnabled: true, telegramAlertEnabled: true, whatsappAlertEnabled: true,
  });

  useEffect(() => { loadEquipments(); }, [search, statusFilter]);

  async function loadEquipments() {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const result = await api.getEquipments(params);
      setEquipments(result.data || []);
      setPagination(result.pagination || { page: 1, total: 0, totalPages: 0 });
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      const data = {
        ...form,
        port: form.port ? parseInt(form.port) : undefined,
        checkInterval: parseInt(form.checkInterval),
        failThreshold: parseInt(form.failThreshold),
        alertCooldown: parseInt(form.alertCooldown),
        clientId: form.clientId || undefined,
      };

      if (editingEquipment) {
        await api.updateEquipment(editingEquipment.id, data);
      } else {
        await api.createEquipment(data);
      }
      setShowModal(false);
      resetForm();
      loadEquipments();
    } catch (err: any) {
      alert(err.message);
    }
  }

  function resetForm() {
    setForm({
      internalId: '', name: '', host: '', checkType: 'PING', port: '',
      location: '', clientId: '', groupName: '', checkInterval: '60',
      failThreshold: '3', alertCooldown: '300', notes: '',
      monitoringEnabled: true, telegramAlertEnabled: true, whatsappAlertEnabled: true,
    });
    setEditingEquipment(null);
  }

  function editEquipment(eq: any) {
    setForm({
      internalId: eq.internalId, name: eq.name, host: eq.host,
      checkType: eq.checkType, port: eq.port?.toString() || '',
      location: eq.location || '', clientId: eq.clientId || '',
      groupName: eq.groupName || '', checkInterval: eq.checkInterval.toString(),
      failThreshold: eq.failThreshold.toString(), alertCooldown: eq.alertCooldown.toString(),
      notes: eq.notes || '', monitoringEnabled: eq.monitoringEnabled,
      telegramAlertEnabled: eq.telegramAlertEnabled, whatsappAlertEnabled: eq.whatsappAlertEnabled,
    });
    setEditingEquipment(eq);
    setShowModal(true);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Deseja realmente excluir o equipamento "${name}"?`)) return;
    try {
      await api.deleteEquipment(id);
      loadEquipments();
    } catch (err: any) {
      alert(err.message);
    }
  }

  function toggleSelectAll(checked: boolean) {
    if (checked) setSelectedIds(equipments.map(eq => eq.id));
    else setSelectedIds([]);
  }

  function toggleSelect(id: string, checked: boolean) {
    if (checked) setSelectedIds(prev => [...prev, id]);
    else setSelectedIds(prev => prev.filter(i => i !== id));
  }

  async function handleBulkDelete() {
    if (!confirm(`Deseja realmente excluir os ${selectedIds.length} equipamentos selecionados?`)) return;
    try {
      await api.deleteEquipments(selectedIds);
      setSelectedIds([]);
      loadEquipments();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleTest(id: string) {
    try {
      const result = await api.testEquipment(id);
      if (result) {
        alert(`Resultado: ${result.success ? '✅ Online' : '❌ Offline'}${result.responseTime ? ` (${result.responseTime}ms)` : ''}${result.error ? `\nErro: ${result.error}` : ''}`);
        loadEquipments();
      }
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleMaintenance(id: string, enabled: boolean) {
    try {
      await api.setMaintenance(id, enabled, enabled ? 'Manual maintenance' : undefined);
      loadEquipments();
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 4, background: 'linear-gradient(90deg, #fff, var(--color-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Equipamentos</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, letterSpacing: '1px', textTransform: 'uppercase' }}>{pagination.total} nós monitorados na rede</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={16} /> ADICIONAR NÓ
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-accent)' }} />
          <input
            className="input"
            placeholder="Buscar por nome, ID ou IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 40, background: 'rgba(0,0,0,0.3)' }}
          />
        </div>
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 180, background: 'rgba(0,0,0,0.3)' }}>
          <option value="">TODOS OS STATUS</option>
          <option value="ONLINE">ONLINE</option>
          <option value="OFFLINE">OFFLINE</option>
          <option value="UNSTABLE">INSTÁVEL</option>
          <option value="MAINTENANCE">MANUTENÇÃO</option>
        </select>
      </div>

      {selectedIds.length > 0 && (
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', marginBottom: 16, border: '1px solid var(--color-danger)' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-danger)', textShadow: '0 0 10px rgba(255,0,68,0.5)' }}>{selectedIds.length} NÓS SELECIONADOS</span>
          <button className="btn btn-ghost btn-sm" style={{ color: '#fff', background: 'var(--color-danger)', border: 'none', boxShadow: '0 0 15px rgba(255,0,68,0.5)' }} onClick={handleBulkDelete}>
            <Trash2 size={16} /> PURGAR SELECIONADOS
          </button>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" checked={equipments.length > 0 && selectedIds.length === equipments.length} onChange={(e) => toggleSelectAll(e.target.checked)} /></th>
              <th>Status</th>
              <th>Nome</th>
              <th>ID</th>
              <th>IP/Host</th>
              <th>Tipo</th>
              <th>Cliente</th>
              <th>Última Verificação</th>
              <th>Resp.</th>
              <th>Uptime</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--color-accent)', textShadow: '0 0 10px var(--color-accent)' }}>CARREGANDO DADOS DA REDE...</td></tr>
            ) : equipments.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)', letterSpacing: '1px' }}>NENHUM NÓ ENCONTRADO NA MATRIZ</td></tr>
            ) : (
              equipments.map((eq) => {
                const status = statusMap[eq.status] || statusMap.ONLINE;
                return (
                  <tr key={eq.id}>
                    <td><input type="checkbox" checked={selectedIds.includes(eq.id)} onChange={(e) => toggleSelect(eq.id, e.target.checked)} /></td>
                    <td><span className={`status-badge ${status.class}`}>{status.label}</span></td>
                    <td>
                      <Link href={`/dashboard/equipments/${eq.id}`} style={{ color: 'var(--color-text-primary)', textDecoration: 'none', fontWeight: 600, letterSpacing: '0.5px' }}>{eq.name}</Link>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--color-text-muted)' }}>{eq.internalId}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 14, color: 'var(--color-accent-light)' }}>{eq.host}{eq.port ? `:${eq.port}` : ''}</td>
                    <td><span style={{ fontSize: 10, padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', letterSpacing: '1px' }}>{eq.checkType}</span></td>
                    <td style={{ fontWeight: 500 }}>{eq.client?.name || 'Local'}</td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {eq.lastCheck ? new Date(eq.lastCheck).toLocaleString('pt-BR') : '-'}
                    </td>
                    <td style={{ fontWeight: 600, color: eq.avgResponseTime > 0 ? 'var(--color-accent)' : 'inherit' }}>{eq.avgResponseTime > 0 ? `${eq.avgResponseTime}ms` : '-'}</td>
                    <td style={{ color: eq.uptimePercent >= 99 ? 'var(--color-success)' : eq.uptimePercent >= 95 ? 'var(--color-warning)' : 'var(--color-danger)', fontWeight: 700, textShadow: eq.uptimePercent >= 99 ? '0 0 10px rgba(0,255,136,0.3)' : 'none' }}>
                      {eq.uptimePercent.toFixed(1)}%
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => handleTest(eq.id)} title="Testar agora">
                          <Activity size={16} />
                        </button>
                        <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => editEquipment(eq)} title="Editar">
                          <Edit2 size={16} />
                        </button>
                        <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => handleMaintenance(eq.id, eq.status !== 'MAINTENANCE')} title={eq.status === 'MAINTENANCE' ? 'Sair manutenção' : 'Manutenção'}>
                          <Wrench size={16} />
                        </button>
                        <button className="btn btn-ghost" style={{ padding: '6px', color: 'var(--color-danger)', borderColor: 'rgba(255,0,68,0.3)' }} onClick={() => handleDelete(eq.id, eq.name)} title="Excluir">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-content" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingEquipment ? 'Editar Equipamento' : 'Novo Equipamento'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: 24, cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="label">ID Interno *</label>
                  <input className="input" value={form.internalId} onChange={(e) => setForm({...form, internalId: e.target.value})} required disabled={!!editingEquipment} placeholder="EX: RTR-001" />
                </div>
                <div>
                  <label className="label">Nome *</label>
                  <input className="input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required placeholder="Router Principal" />
                </div>
                <div>
                  <label className="label">
                    {form.checkType === 'OPENVPN' ? 'Common Name (Nome no Log) *' : 'IP / Domínio / URL *'}
                  </label>
                  <input className="input" value={form.host} onChange={(e) => setForm({...form, host: e.target.value})} required placeholder={form.checkType === 'OPENVPN' ? 'client1' : '192.168.1.1 ou google.com'} />
                </div>
                <div>
                  <label className="label">Tipo de Verificação</label>
                  <select className="input" value={form.checkType} onChange={(e) => setForm({...form, checkType: e.target.value})}>
                    <option value="PING">Ping ICMP</option>
                    <option value="HTTP">HTTP/HTTPS</option>
                    <option value="TCP">TCP (porta específica)</option>
                    <option value="OPENVPN">Log OpenVPN / Status</option>
                  </select>
                </div>
                {form.checkType === 'TCP' && (
                  <div>
                    <label className="label">Porta</label>
                    <input className="input" type="number" value={form.port} onChange={(e) => setForm({...form, port: e.target.value})} placeholder="80" />
                  </div>
                )}
                <div>
                  <label className="label">Localização</label>
                  <input className="input" value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} placeholder="Data Center SP" />
                </div>
                <div>
                  <label className="label">Grupo/Categoria</label>
                  <input className="input" value={form.groupName} onChange={(e) => setForm({...form, groupName: e.target.value})} placeholder="Roteadores, Servidores..." />
                </div>
                <div>
                  <label className="label">Intervalo de Verificação (s)</label>
                  <input className="input" type="number" value={form.checkInterval} onChange={(e) => setForm({...form, checkInterval: e.target.value})} />
                </div>
                <div>
                  <label className="label">Falhas para Alerta</label>
                  <input className="input" type="number" value={form.failThreshold} onChange={(e) => setForm({...form, failThreshold: e.target.value})} />
                </div>
                <div>
                  <label className="label">Cooldown entre Alertas (s)</label>
                  <input className="input" type="number" value={form.alertCooldown} onChange={(e) => setForm({...form, alertCooldown: e.target.value})} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">Observações</label>
                  <textarea className="input" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} style={{ minHeight: 80, resize: 'vertical' }} placeholder="Notas sobre o equipamento..." />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 24 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input type="checkbox" checked={form.monitoringEnabled} onChange={(e) => setForm({...form, monitoringEnabled: e.target.checked})} />
                    Monitoramento ativo
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input type="checkbox" checked={form.telegramAlertEnabled} onChange={(e) => setForm({...form, telegramAlertEnabled: e.target.checked})} />
                    Alerta Telegram
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input type="checkbox" checked={form.whatsappAlertEnabled} onChange={(e) => setForm({...form, whatsappAlertEnabled: e.target.checked})} />
                    Alerta WhatsApp
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--color-border)' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingEquipment ? 'Salvar Alterações' : 'Criar Equipamento'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
