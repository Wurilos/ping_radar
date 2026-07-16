// ==============================================
// PingAlert Pro — Landing Page
// ==============================================

'use client';

import { useState } from 'react';
import Link from 'next/link';

const features = [
  { icon: '📡', title: 'Monitoramento Multi-protocolo', desc: 'Ping ICMP, HTTP/HTTPS e TCP em uma única plataforma.' },
  { icon: '⚡', title: 'Alertas em Tempo Real', desc: 'Notificações instantâneas via Telegram e WhatsApp.' },
  { icon: '🔧', title: 'Configuração Flexível', desc: 'Intervalos, thresholds e cooldowns por equipamento.' },
  { icon: '📊', title: 'Dashboard Premium', desc: 'Visualize o status de toda sua rede em um painel moderno.' },
  { icon: '👥', title: 'Multi-usuário', desc: 'Administradores, técnicos e clientes com permissões distintas.' },
  { icon: '🔗', title: 'Webhooks & API', desc: 'Integre com qualquer sistema via API REST e webhooks.' },
];

const plans = [
  { name: 'Básico', price: 'R$ 97', period: '/mês', equipments: '10', users: '2', alerts: '500/mês', highlight: false },
  { name: 'Profissional', price: 'R$ 197', period: '/mês', equipments: '50', users: '10', alerts: 'Ilimitados', highlight: true },
  { name: 'Empresarial', price: 'R$ 497', period: '/mês', equipments: 'Ilimitados', users: 'Ilimitados', alerts: 'Ilimitados', highlight: false },
];

const faqs = [
  { q: 'Como funciona o monitoramento?', a: 'O sistema verifica automaticamente seus equipamentos usando Ping, HTTP ou TCP no intervalo configurado. Quando detecta falhas consecutivas, envia alertas pelos canais configurados.' },
  { q: 'Quais protocolos são suportados?', a: 'Ping ICMP para dispositivos de rede, HTTP/HTTPS para servidores web e TCP para verificação de portas específicas.' },
  { q: 'Os alertas funcionam 24/7?', a: 'Sim! O sistema monitora continuamente. Você pode configurar horários silenciosos e regras de escalonamento.' },
  { q: 'Posso integrar com outros sistemas?', a: 'Sim! Oferecemos API REST completa e webhooks para integração com qualquer sistema externo.' },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div style={{ background: 'var(--color-bg-primary)', minHeight: '100vh' }}>
      {/* ---- Header ---- */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(10, 14, 26, 0.8)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📡</div>
            <span style={{ fontSize: 20, fontWeight: 800, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PingAlert Pro</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/login" className="btn btn-ghost btn-sm">Entrar</Link>
            <Link href="/login" className="btn btn-primary btn-sm">Teste Grátis</Link>
          </div>
        </div>
      </header>

      {/* ---- Hero ---- */}
      <section style={{
        paddingTop: 140, paddingBottom: 100,
        background: 'var(--gradient-hero)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative orbs */}
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', top: -100, right: -100 }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', bottom: -50, left: -100 }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center', position: 'relative' }}>
          <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 'var(--radius-full)', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 13, fontWeight: 600, color: 'var(--color-accent-light)', marginBottom: 24 }}>
            🚀 Monitoramento de rede profissional
          </div>

          <h1 style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 24, maxWidth: 800, margin: '0 auto 24px' }}>
            Monitore sua rede em{' '}
            <span style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>tempo real</span>
            {' '}com alertas inteligentes
          </h1>

          <p style={{ fontSize: 18, color: 'var(--color-text-secondary)', maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.7 }}>
            Saiba imediatamente quando qualquer equipamento da sua rede cair. Receba alertas via Telegram e WhatsApp com informações detalhadas.
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/login" className="btn btn-primary btn-lg" style={{ fontSize: 16 }}>
              Começar Agora — É Grátis
            </Link>
            <a href="#features" className="btn btn-ghost btn-lg">Ver Funcionalidades</a>
          </div>

          {/* Dashboard preview */}
          <div style={{
            marginTop: 60, borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)',
            background: 'var(--color-bg-card)', padding: 20, maxWidth: 900, margin: '60px auto 0',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
              {[
                { label: 'Total', value: '247', color: 'var(--color-accent)' },
                { label: 'Online', value: '231', color: 'var(--color-success)' },
                { label: 'Offline', value: '8', color: 'var(--color-danger)' },
                { label: 'Instáveis', value: '5', color: 'var(--color-warning)' },
              ].map((stat, i) => (
                <div key={i} style={{ background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', padding: 16, textAlign: 'left' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>{stat.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>
            <div style={{ height: 200, background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'flex-end', padding: '16px 8px', gap: 4 }}>
              {Array.from({ length: 30 }, (_, i) => (
                <div key={i} style={{
                  flex: 1, background: i % 7 === 4 ? 'var(--color-danger)' : 'var(--color-accent)',
                  borderRadius: '4px 4px 0 0', opacity: 0.6 + Math.random() * 0.4,
                  height: `${30 + Math.random() * 70}%`,
                  transition: 'height 300ms ease',
                }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---- Features ---- */}
      <section id="features" style={{ padding: '100px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16 }}>Funcionalidades Poderosas</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 16 }}>Tudo que você precisa para monitorar sua infraestrutura de rede</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {features.map((f, i) => (
            <div key={i} className="glass-card" style={{ padding: 32, animation: `slideUp ${400 + i * 100}ms ease` }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Plans ---- */}
      <section style={{ padding: '100px 24px', background: 'var(--color-bg-secondary)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16 }}>Planos & Preços</h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>Escolha o plano ideal para sua operação</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, maxWidth: 960, margin: '0 auto' }}>
            {plans.map((plan, i) => (
              <div key={i} style={{
                background: plan.highlight ? 'var(--gradient-primary)' : 'var(--color-bg-card)',
                border: `1px solid ${plan.highlight ? 'transparent' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-xl)', padding: 40,
                position: 'relative',
                transform: plan.highlight ? 'scale(1.05)' : 'none',
                boxShadow: plan.highlight ? 'var(--shadow-glow)' : 'none',
              }}>
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--color-warning)', color: '#000', padding: '4px 16px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 700 }}>
                    MAIS POPULAR
                  </div>
                )}
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{plan.name}</h3>
                <div style={{ fontSize: 40, fontWeight: 900, marginBottom: 4 }}>
                  {plan.price}<span style={{ fontSize: 16, fontWeight: 400, opacity: 0.7 }}>{plan.period}</span>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', margin: '24px 0', paddingTop: 24 }}>
                  {[
                    `${plan.equipments} equipamentos`,
                    `${plan.users} usuários`,
                    `${plan.alerts} alertas`,
                    'Telegram + WhatsApp',
                    'API REST completa',
                    'Relatórios',
                  ].map((item, j) => (
                    <div key={j} style={{ padding: '8px 0', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: plan.highlight ? '#fff' : 'var(--color-success)' }}>✓</span> {item}
                    </div>
                  ))}
                </div>
                <button className={`btn ${plan.highlight ? 'btn-ghost' : 'btn-primary'}`} style={{ width: '100%', marginTop: 16, ...(plan.highlight ? { background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' } : {}) }}>
                  Começar Agora
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section style={{ padding: '100px 24px', maxWidth: 800, margin: '0 auto' }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, textAlign: 'center', marginBottom: 48 }}>Perguntas Frequentes</h2>
        {faqs.map((faq, i) => (
          <div key={i} style={{
            borderBottom: '1px solid var(--color-border)', paddingBottom: 20, marginBottom: 20,
          }}>
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'none', border: 'none', color: 'var(--color-text-primary)',
                cursor: 'pointer', fontSize: 16, fontWeight: 600, padding: '12px 0',
                fontFamily: 'var(--font-family)',
              }}
            >
              {faq.q}
              <span style={{ transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>▾</span>
            </button>
            {openFaq === i && (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.7, paddingTop: 8, animation: 'fadeIn 200ms ease' }}>{faq.a}</p>
            )}
          </div>
        ))}
      </section>

      {/* ---- CTA ---- */}
      <section style={{ padding: '80px 24px', textAlign: 'center', background: 'var(--gradient-hero)' }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>Pronto para monitorar sua rede?</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 32 }}>Comece agora mesmo, sem cartão de crédito.</p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/login" className="btn btn-primary btn-lg">Criar Conta Grátis</Link>
          <a href="https://wa.me/5511999999999" target="_blank" className="btn btn-success btn-lg">💬 Falar no WhatsApp</a>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer style={{ padding: '40px 24px', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
          © {new Date().getFullYear()} PingAlert Pro. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
