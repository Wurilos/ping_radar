// ==============================================
// PingAlert Pro — Integrations Page
// ==============================================

'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Send, MessageCircle, Link as LinkIcon, Save, Search, Bot, ShieldCheck } from 'lucide-react';

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
      alert(result.success
        ? `✅ Bot conectado e mensagem enviada: ${result.botName}`
        : `❌ Falha: ${result.error}`);
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
        telegram_bot_token: settings.telegram_bot_token || '',
        telegram_chat_id: settings.telegram_chat_id || '',
        telegram_panel_enabled: settings.telegram_panel_enabled ?? 'true',
        telegram_allowed_user_ids: settings.telegram_allowed_user_ids || '',
        telegram_admin_user_ids: settings.telegram_admin_user_ids || '',
      });
      alert('✅ Configurações salvas e painel Telegram atualizado!');
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>Carregando...</div>;

  const panelEnabled = (settings.telegram_panel_enabled ?? 'true') === 'true';

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
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Alertas automáticos e painel interativo para a equipe</p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)', alignItems: 'center', gap: 16 }}>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Bot Token</span>
              <input
                className="input"
                type="password"
                placeholder="Token completo do BotFather"
                value={settings.telegram_bot_token || ''}
                onChange={(e) => updateSetting('telegram_bot_token', e.target.value)}
                style={{ maxWidth: 360 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)', alignItems: 'center', gap: 16 }}>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Chat ID dos alertas</span>
              <input
                className="input"
                type="text"
                placeholder="Seu ID, grupo -100... ou canal @nome"
                value={settings.telegram_chat_id || ''}
                onChange={(e) => updateSetting('telegram_chat_id', e.target.value)}
                style={{ maxWidth: 360 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border)', alignItems: 'center', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Painel interativo</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Ativa comandos e botões dentro do bot</div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={panelEnabled}
                  onChange={(e) => updateSetting('telegram_panel_enabled', String(e.target.checked))}
                />
                {panelEnabled ? 'Ativado' : 'Desativado'}
              </label>
            </div>

            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Bot size={15} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>IDs autorizados a consultar</span>
              </div>
              <textarea
                className="input"
                placeholder="Ex.: 123456789, 987654321"
                value={settings.telegram_allowed_user_ids || ''}
                onChange={(e) => updateSetting('telegram_allowed_user_ids', e.target.value)}
                rows={2}
                style={{ width: '100%', resize: 'vertical' }}
              />
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
                Cada usuário deve enviar <b>/id</b> ao bot. Separe os números por vírgula. Use * somente para liberar o painel publicamente.
              </div>
            </div>

            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <ShieldCheck size={15} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>IDs administradores do bot</span>
              </div>
              <textarea
                className="input"
                placeholder="Ex.: 123456789"
                value={settings.telegram_admin_user_ids || ''}
                onChange={(e) => updateSetting('telegram_admin_user_ids', e.target.value)}
                rows={2}
                style={{ width: '100%', resize: 'vertical' }}
              />
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
                Administradores podem usar o botão <b>Testar agora</b>. Usuários autorizados possuem acesso somente para consulta.
              </div>
            </div>

            {telegramStatus && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Status</span>
                <span style={{ fontSize: 13, color: telegramStatus.success ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                  {telegramStatus.success ? `✅ ${telegramStatus.botName} — mensagem entregue` : `❌ ${telegramStatus.error}`}
                </span>
              </div>
            )}
          </div>

          <div style={{ padding: 14, borderRadius: 10, background: 'var(--color-bg-input)', marginBottom: 16, fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
            <b>Como liberar usuários:</b> eles abrem o bot, enviam <b>/id</b>, informam o número ao administrador e depois usam <b>/menu</b>. O Chat ID acima continua sendo o destino dos alertas automáticos.
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={handleSaveSettings} disabled={saving}>
              <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={testTelegram} disabled={testingTelegram}>
              <Search size={16} /> {testingTelegram ? 'Enviando...' : 'Enviar mensagem de teste'}
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
