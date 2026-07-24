// ==============================================
// PingAlert Pro — Equipments Page
// ==============================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Plus, Search, Trash2, Edit2, Wrench, Activity, FileText } from 'lucide-react';

const statusMap: Record<string, { label: string; class: string }> = {
  ONLINE: { label: 'Online', class: 'status-online' },
  OFFLINE: { label: 'Offline', class: 'status-offline' },
  UNSTABLE: { label: 'Instável', class: 'status-unstable' },
  MAINTENANCE: { label: 'Manutenção', class: 'status-maintenance' },
};

function currentMaintenanceReason(equipment: any): string {
  return equipment?.maintenanceWindows?.[0]?.reason || '';
}

export default function EquipmentsPage() {
  const [equipments, setEquipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [contractFilter, setContractFilter] = useState('');
  const [contracts, setContracts] = useState<Array<{ name: string; total: number }>>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<any>(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [form, setForm] = useState({
    internalId: '', name: '', host: '', checkType: 'PING', port: '',
    location: '', clientId: '', groupName: '', contractNumber: '', checkInterval: '60',
    failThreshold: '3', alertCooldown: '300', notes: '',
    monitoringEnabled: true, telegramAlertEnabled: true, whatsappAlertEnabled: true,
    maintenanceEnabled: false, maintenanceReason: '',
  });

  useEffect(() => { void loadContracts(); }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadEquipments(); }, 250);
    return () => window.clearTimeout(timer);
  }, [search, statusFilter, contractFilter]);

  async function loadContracts() {
    try {
      const result = await api.getContracts();
      setContracts(result.data || []);
    } catch (err) {
      console.error('Não foi possível carregar os contratos', err);
    }
  }

  async function loadEquipments() {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (contractFilter) params.contractNumber = contractFilter;
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
      const { maintenanceEnabled, maintenanceReason, ...equipmentForm } = form;
      const data = {
        ...equipmentForm,
        contractNumber: equipmentForm.contractNumber.trim() || undefined,
        port: equipmentForm.port ? parseInt(equipmentForm.port) : undefined,
        checkInterval: parseInt(equipmentForm.checkInterval),
        failThreshold: parseInt(equipmentForm.failThreshold),
        alertCooldown: parseInt(equipmentForm.alertCooldown),
        clientId: equipmentForm.clientId || undefined,
      };

      const savedEquipment = editingEquipment
        ? await api.updateEquipment(editingEquipment.id, data)
        : await api.createEquipment(data);

      const wasInMaintenance = editingEquipment?.status === 'MAINTENANCE';
      const oldReason = currentMaintenanceReason(editingEquipment).trim();
      const newReason = maintenanceReason.trim();
      const maintenanceChanged = maintenanceEnabled !== wasInMaintenance;
      const reasonChanged = maintenanceEnabled && newReason !== oldReason;

      if (maintenanceChanged || reasonChanged) {
        await api.setMaintenance(
          savedEquipment.id,
          maintenanceEnabled,
          maintenanceEnabled ? newReason || 'Manutenção informada no cadastro' : undefined,
        );
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
      location: '', clientId: '', groupName: '', contractNumber: '', checkInterval: '60',
      failThreshold: '3', alertCooldown: '300', notes: '',
      monitoringEnabled: true, telegramAlertEnabled: true, whatsappAlertEnabled: true,
      maintenanceEnabled: false, maintenanceReason: '',
    });
    setEditingEquipment(null);
  }

  function editEquipment(eq: any) {
    setForm({
      internalId: eq.internalId, name: eq.name, host: eq.host,
      checkType: eq.checkType, port: eq.port?.toString() || '',
      location: eq.location || '', clientId: eq.clientId || '',
      groupName: eq.groupName || '', contractNumber: eq.contractNumber || '',
      checkInterval: eq.checkInterval.toString(), failThreshold: eq.failThreshold.toString(),
      alertCooldown: eq.alertCooldown.toString(), notes: eq.notes || '',
      monitoringEnabled: eq.monitoringEnabled,
      telegramAlertEnabled: eq.telegramAlertEnabled,
      whatsappAlertEnabled: eq.whatsappAlertEnabled,
      maintenanceEnabled: eq.status === 'MAINTENANCE',
      maintenanceReason: currentMaintenanceReason(eq),
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

  async function handleMaintenance(equipment: any) {
    const enabled = equipment.status !== 'MAINTENANCE';
    let reason: string | undefined;

    if (enabled) {
      const typedReason = prompt(
        `Informe o motivo da manutenção do equipamento ${equipment.name}:`,
        currentMaintenanceReason(equipment) || 'Manutenção preventiva',
      );
      if (typedReason === null) return;
      reason = typedReason.trim() || 'Manutenção informada pelo operador';
    }

    try {
      await api.setMaintenance(equipment.id, enabled, reason);
      loadEquipments();
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 4, background: 'linear-gradient(90deg, #fff, var(--color-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Equipamentos</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, letterSpacing: '1px', textTransform: 'uppercase' }}>{pagination.total} nós monitorados na rede</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={16} /> ADICIONAR NÓ
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-accent)' }} />
          <input
            className="input"
            placeholder="Filtrar equipamento por nome, ID, IP ou local..."
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
        <select
          className="input"
          value={contractFilter}
          onChange={(e) => setContractFilter(e.target.value)}
          style={{ maxWidth: 240, background: 'rgba(0,0,0,0.3)' }}
          aria-label="Filtrar por contrato"
        >
          <option value="">TODOS OS CONTRATOS</option>
          {contracts.map((contract) => (
            <option key={contract.name} value={contract.name}>
              {contract.name} ({contract.total})
            </option>
          ))}
        </select>
        {(search || statusFilter || contractFilter) && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setSearch('');
              setStatusFilter('');
              setContractFilter('');
            }}
          >
            LIMPAR FILTROS
          </button>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', marginBottom: 16, border: '1px solid var(--color-danger)' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-danger)', textShadow: '0 0 10px rgba(255,0,68,0.5)' }}>{selectedIds.length} NÓS SELECIONADOS</span>
          <button className="btn btn-ghost btn-sm" style={{ color: '#fff', background: 'var(--color-danger)', border: 'none', boxShadow: '0 0 15px rgba(255,0,68,0.5)' }} onClick={handleBulkDelete}>
            <Trash2 size={16} /> PURGAR SELECIONADOS
          </button>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" checked={equipments.length > 0 && selectedIds.length === equipments.length} onChange={(e) => toggleSelectAll(e.target.checked)} /></th>
              <th>Status</th>
              <th>Nome</th>
              <th>ID</th>
              <th>Contrato</th>
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
              <tr><td colSpan={12} style={{ textAlign: 'center', padding: 40, color: 'var(--color-accent)', textShadow: '0 0 10px var(--color-accent)' }}>CARREGANDO DADOS DA REDE...</td></tr>
            ) : equipments.length === 0 ? (
              <tr><td colSpan={12} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)', letterSpacing: '1px' }}>NENHUM NÓ ENCONTRADO NA MATRIZ</td></tr>
            ) : (
              equipments.map((eq) => {
                const status = statusMap[eq.status] || statusMap.ONLINE;
                const maintenanceReason = currentMaintenanceReason(eq);
                return (
                  <tr key={eq.id}>
                    <td><input type="checkbox" checked={selectedIds.includes(eq.id)} onChange={(e) => toggleSelect(eq.id, e.target.checked)} /></td>
                    <td>
                      <span className={`status-badge ${status.class}`}>{status.label}</span>
                      {eq.status === 'MAINTENANCE' && maintenanceReason && (
                        <div title={maintenanceReason} style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {maintenanceReason}
                        </div>
                      )}
                    </td>
                    <td>
                      <Link href={`/dashboard/equipments/${eq.id}`} style={{ color: 'var(--color-text-primary)', textDecoration: 'none', fontWeight: 600, letterSpacing: '0.5px' }}>{eq.name}</Link>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--color-text-muted)' }}>{eq.internalId}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{eq.contractNumber || '-'}</td>
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
                        <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => handleTest(eq.id)} title="Testar agora" disabled={eq.status === 'MAINTENANCE'}>
                          <Activity size={16} />
                        </button>
                        <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => editEquipment(eq)} title="Editar">
                          <Edit2 size={16} />
                        </button>
                        <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => handleMaintenance(eq)} title={eq.status === 'MAINTENANCE' ? 'Encerrar manutenção' : 'Colocar em manutenção'}>
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

      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-content" style={{ maxWidth: 760 }}>
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
                  <label className="label">Número/Código do Contrato</label>
                  <div style={{ position: 'relative' }}>
                    <FileText size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input className="input" maxLength={40} value={form.contractNumber} onChange={(e) => setForm({...form, contractNumber: e.target.value})} placeholder="Ex.: EMDURB-2026" style={{ paddingLeft: 36 }} />
                  </div>
                </div>
                <div>
                  <label className="label">Grupo/Categoria</label>
                  <input className="input" value={form.groupName} onChange={(e) => setForm({...form, groupName: e.target.value})} placeholder="Roteadores, Servidores..." />
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
                  <textarea className="input" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} style={{ minHeight: 70, resize: 'vertical' }} placeholder="Notas sobre o equipamento..." />
                </div>

                <div className="glass-card" style={{ gridColumn: '1 / -1', padding: 16, border: form.maintenanceEnabled ? '1px solid var(--color-warning)' : '1px solid var(--color-border)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={form.maintenanceEnabled}
                      onChange={(e) => setForm({...form, maintenanceEnabled: e.target.checked})}
                    />
                    🔧 Equipamento em manutenção
                  </label>
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Durante a manutenção, o monitoramento automático fica pausado e o equipamento aparece como “Manutenção” no painel e no Telegram.
                  </div>
                  {form.maintenanceEnabled && (
                    <div style={{ marginTop: 12 }}>
                      <label className="label">Motivo da manutenção *</label>
                      <textarea
                        className="input"
                        required
                        value={form.maintenanceReason}
                        onChange={(e) => setForm({...form, maintenanceReason: e.target.value})}
                        style={{ minHeight: 65, resize: 'vertical' }}
                        placeholder="Ex.: troca de fonte, manutenção preventiva, equipamento removido para reparo..."
                      />
                    </div>
                  )}
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input type="checkbox" checked={form.monitoringEnabled} onChange={(e) => setForm({...form, monitoringEnabled: e.target.checked})} disabled={form.maintenanceEnabled} />
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
