// ==============================================
// PingAlert Pro — Integrations Page
// ==============================================

'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Send, MessageCircle, Link as LinkIcon, Save, Search } from 'lucide-react';

export default function IntegrationsPage() {
  const [telegramStatus, setTelegramStatus] = useState<any>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<any>(null);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [wh, waStatus, sets] = await Promise.all([
        api.getWebhooks(),
        api.getWhatsAppStatus(),
        api.getSettings(),
      ]);
      setWebhooks(wh.data || []);
      setWhatsappStatus(waStatus);
      setSettings(sets || {});
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function testTelegram() {
    setTestingTelegram(true);
    try {
      const result = await api.testTelegram();
      setTelegramStatus(result);
      alert(result.success ? `✅ Bot conectado: ${result.botName}` : `❌ Falha: ${result.error}`);
    } catch (err: any) { alert(err.message); }
    finally { setTestingTelegram(false); }
  }

  function updateSetting(key: string, value: string) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  async function handleSaveSettings() {
    setSaving(true);
    try {
      await api.updateSettings({
        telegram_bot_token: settings.telegram_bot_token,
        telegram_chat_id: settings.telegram_chat_id,
      });
      alert('✅ Configurações salvas com sucesso!');
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>Carregando...</div>;

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Integrações</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Configure Telegram, WhatsApp e Webhooks</p>
      </div>

      <div style={{ display: 'grid', gap: 24, maxWidth: 800 }}>
        {/* Telegram */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-info)' }}>
              <Send size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Telegram Bot</h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Envie alertas para grupos e contatos do Telegram</p>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)', alignItems: 'center' }}>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Bot Token</span>
              <input
                className="input"
                type="password"
                placeholder="Token do BotFather"
                value={settings.telegram_bot_token || ''}
                onChange={(e) => updateSetting('telegram_bot_token', e.target.value)}
                style={{ maxWidth: 300 }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)', alignItems: 'center' }}>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Chat ID padrão</span>
              <input
                className="input"
                type="text"
                placeholder="-100..."
                value={settings.telegram_chat_id || ''}
                onChange={(e) => updateSetting('telegram_chat_id', e.target.value)}
                style={{ maxWidth: 300 }}
              />
            </div>
            {telegramStatus && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Status</span>
                <span style={{ fontSize: 13, color: telegramStatus.success ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                  {telegramStatus.success ? `✅ ${telegramStatus.botName}` : `❌ ${telegramStatus.error}`}
                </span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={handleSaveSettings} disabled={saving}>
              <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={testTelegram} disabled={testingTelegram}>
              <Search size={16} /> {testingTelegram ? 'Testando...' : 'Testar Conexão'}
            </button>
          </div>
        </div>

        {/* WhatsApp */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)' }}>
              <MessageCircle size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>WhatsApp</h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Envie alertas via WhatsApp (múltiplos provedores)</p>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Provedor</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{whatsappStatus?.provider || 'Não configurado'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Status</span>
              <span className={`status-badge ${whatsappStatus?.configured ? 'status-online' : 'status-offline'}`} style={{ fontSize: 10 }}>
                {whatsappStatus?.configured ? 'Configurado' : 'Não configurado'}
              </span>
            </div>
          </div>
          <div style={{ marginTop: 16, padding: 16, background: 'var(--color-bg-input)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-text-muted)' }}>
            💡 Configure o provedor WhatsApp no arquivo .env. Provedores suportados: WhatsApp Cloud API (Meta), Twilio, Evolution API, ou API customizada.
          </div>
        </div>

        {/* Webhooks */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent-light)' }}>
              <LinkIcon size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Webhooks</h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Envie eventos para sistemas externos</p>
            </div>
          </div>
          {webhooks.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Nenhum webhook configurado</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {webhooks.map((wh: any) => (
                <div key={wh.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--color-bg-input)', borderRadius: 'var(--radius-md)' }}>
                  <span className={`status-badge ${wh.active ? 'status-online' : 'status-offline'}`} style={{ fontSize: 10, padding: '1px 6px' }}>{wh.active ? 'Ativo' : 'Inativo'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{wh.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{wh.url}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
