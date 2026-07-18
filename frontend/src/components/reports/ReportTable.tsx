import { ReportOverview } from '@/lib/report-api';

export default function ReportTable({ report }: { report: ReportOverview }) {
  return (
    <section className="glass-card chart-card">
      <div className="card-heading">
        <h2>Ranking dos equipamentos</h2>
        <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{report.ranking.length} registros</span>
      </div>
      <div className="table-container">
        <table className="table report-table">
          <thead>
            <tr>
              <th>Equipamento</th>
              <th>Contrato</th>
              <th>IP</th>
              <th>Status</th>
              <th>Uptime</th>
              <th>Resposta</th>
              <th>Falhas</th>
              <th>Localização</th>
            </tr>
          </thead>
          <tbody>
            {report.ranking.map(item => (
              <tr key={item.id}>
                <td style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{item.name}</td>
                <td>{item.contractNumber || '-'}</td>
                <td>{item.host}</td>
                <td><span className={`status-badge status-${item.status.toLowerCase()}`}>{item.status}</span></td>
                <td style={{ fontWeight: 800, color: item.uptimePercent >= 99 ? 'var(--color-success)' : item.uptimePercent >= 95 ? 'var(--color-warning)' : 'var(--color-danger)' }}>{item.uptimePercent}%</td>
                <td>{item.avgResponseTime > 0 ? `${item.avgResponseTime} ms` : '-'}</td>
                <td>{item.consecutiveFailures}</td>
                <td className="location-cell">{item.location || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
