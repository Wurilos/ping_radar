// ==============================================
// PingAlert Pro — Settings Page
// ==============================================

'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    try { const data = await api.getSettings(); setSettings(data); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  }

  async function handleSave() {
    setSaving(true);
    try { await api.updateSettings(settings); alert('✅ Configurações salvas!'); }
    catch (err: any) { alert(err.message); } finally { setSaving(false); }
  }

  function updateSetting(key: string, value: string) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  const sections = [
    {
      title: '⏱️ Monitoramento',
      items: [
        { key: 'default_check_interval', label: 'Intervalo padrão (segundos)', type: 'number' },
        { key: 'default_fail_threshold', label: 'Falhas antes do alerta', type: 'number' },
        { key: 'default_alert_cooldown', label: 'Cooldown entre alertas (segundos)', type: 'number' },
      ],
    },
    {
      title: '🔕 Horário Silencioso',
      items: [
        { key: 'quiet_hours_enabled', label: 'Ativar horário silencioso', type: 'toggle' },
        { key: 'quiet_hours_start', label: 'Início', type: 'text' },
        { key: 'quiet_hours_end', label: 'Fim', type: 'text' },
      ],
    },
    {
      title: '📡 Notificações',
      items: [
        { key: 'telegram_enabled', label: 'Telegram ativo', type: 'toggle' },
        { key: 'whatsapp_enabled', label: 'WhatsApp ativo', type: 'toggle' },
        { key: 'webhook_enabled', label: 'Webhooks ativos', type: 'toggle' },
      ],
    },
    {
      title: '🔧 Sistema',
      items: [
        { key: 'global_maintenance', label: 'Modo manutenção global', type: 'toggle' },
      ],
    },
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>Carregando...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Configurações</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Configurações gerais do sistema</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : '💾 Salvar Configurações'}</button>
      </div>

      <div style={{ display: 'grid', gap: 24, maxWidth: 700 }}>
        {sections.map((section, i) => (
          <div key={i} className="glass-card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>{section.title}</h2>
            <div style={{ display: 'grid', gap: 16 }}>
              {section.items.map((item) => (
                <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{item.label}</label>
                  {item.type === 'toggle' ? (
                    <button
                      onClick={() => updateSetting(item.key, settings[item.key] === 'true' ? 'false' : 'true')}
                      style={{
                        width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                        background: settings[item.key] === 'true' ? 'var(--color-success)' : 'var(--color-border)',
                        position: 'relative', transition: 'background 200ms',
                      }}
                    >
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: 3,
                        left: settings[item.key] === 'true' ? 25 : 3,
                        transition: 'left 200ms',
                      }} />
                    </button>
                  ) : (
                    <input
                      className="input"
                      type={item.type}
                      value={settings[item.key] || ''}
                      onChange={(e) => updateSetting(item.key, e.target.value)}
                      style={{ maxWidth: 150, textAlign: 'right' }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
