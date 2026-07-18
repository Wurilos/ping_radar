import Link from 'next/link';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ReportOverview } from '@/lib/report-api';

export default function DashboardCritical({ items }: { items: ReportOverview['criticalEquipments'] }) {
  return (
    <section className="glass-card chart-card">
      <div className="card-heading">
        <h2><AlertTriangle size={18} color="var(--color-danger)" /> Equipamentos críticos</h2>
        <Link className="btn btn-ghost btn-sm" href="/dashboard/equipments?status=OFFLINE">Ver equipamentos</Link>
      </div>
      {items.length === 0 ? (
        <div className="empty-state" style={{ color: 'var(--color-success)' }}>
          <CheckCircle2 size={42} />
          <strong style={{ display: 'block', marginTop: 10 }}>Todos os equipamentos operacionais</strong>
        </div>
      ) : (
        <div className="health-list">
          {items.map(item => (
            <Link
              key={item.id}
              href={`/dashboard/equipments/${item.id}`}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 13, borderRadius: 12, border: '1px solid var(--color-border-subtle)', textDecoration: 'none', color: 'inherit', background: 'rgba(127,127,127,.035)' }}
            >
              <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: item.status === 'OFFLINE' ? 'var(--color-danger)' : 'var(--color-warning)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ color: 'var(--color-text-primary)' }}>{item.name}</strong>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 11, marginTop: 3 }}>{item.host} • {item.contractNumber || 'Sem contrato'}</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, color: item.status === 'OFFLINE' ? 'var(--color-danger)' : 'var(--color-warning)' }}>{item.status}<br />{item.consecutiveFailures} falhas</div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
