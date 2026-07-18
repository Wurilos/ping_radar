import { Activity, CheckCircle2, Gauge, Server, ShieldAlert, Zap } from 'lucide-react';
import { ReportOverview } from '@/lib/report-api';

export default function ReportKpis({ report, contract, days }: { report: ReportOverview; contract: string; days: number }) {
  const items = [
    { label: 'Equipamentos', value: report.current.total, detail: contract || 'Todos os contratos', icon: Server, color: 'var(--color-accent)' },
    { label: 'Disponibilidade', value: `${report.current.successRate}%`, detail: `${report.current.checks.toLocaleString('pt-BR')} testes`, icon: CheckCircle2, color: 'var(--color-success)' },
    { label: 'Uptime médio', value: `${report.current.avgUptime}%`, detail: `Últimos ${days} dias`, icon: Gauge, color: 'var(--color-success)' },
    { label: 'Resposta média', value: `${report.current.avgResponseTime} ms`, detail: 'Média atual', icon: Zap, color: 'var(--color-accent-alt)' },
    { label: 'Offline', value: report.current.offline, detail: `${report.current.unstable} instáveis`, icon: ShieldAlert, color: 'var(--color-danger)' },
    { label: 'Alertas', value: report.alerts.total, detail: `${report.alerts.delivered} entregues`, icon: Activity, color: 'var(--color-warning)' },
  ];

  return (
    <div className="modern-kpi-grid">
      {items.map(({ label, value, detail, icon: Icon, color }) => (
        <div key={label} className="modern-kpi" style={{ '--kpi-color': color } as React.CSSProperties}>
          <div className="modern-kpi-header"><span>{label}</span><Icon size={20} color={color} /></div>
          <div className="modern-kpi-value">{value}</div>
          <div className="modern-kpi-detail">{detail}</div>
        </div>
      ))}
    </div>
  );
}
