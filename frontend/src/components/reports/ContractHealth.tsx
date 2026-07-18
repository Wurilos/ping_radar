import { ReportOverview } from '@/lib/report-api';

export default function ContractHealth({
  contracts,
  onSelect,
}: {
  contracts: ReportOverview['contractBreakdown'];
  onSelect: (contract: string) => void;
}) {
  return (
    <section className="glass-card chart-card" style={{ marginBottom: 20 }}>
      <div className="card-heading">
        <h2>Saúde por contrato</h2>
        <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{contracts.length} contratos</span>
      </div>
      {contracts.length === 0 ? <div className="empty-state">Nenhum contrato encontrado.</div> : (
        <div className="health-list">
          {contracts.map(item => (
            <button
              key={item.name}
              type="button"
              className="health-row"
              style={{ color: 'inherit', cursor: 'pointer', textAlign: 'left' }}
              onClick={() => onSelect(item.name)}
            >
              <div>
                <strong>{item.name}</strong>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
                  {item.clients.join(', ') || 'Cliente não informado'} • uptime {item.avgUptime}%
                </div>
              </div>
              <div className="health-number" style={{ color: 'var(--color-success)' }}>{item.online}<small style={{ display: 'block', color: 'var(--color-text-muted)' }}>online</small></div>
              <div className="health-number" style={{ color: 'var(--color-danger)' }}>{item.offline}<small style={{ display: 'block', color: 'var(--color-text-muted)' }}>offline</small></div>
              <div className="health-number" style={{ color: 'var(--color-warning)' }}>{item.unstable}<small style={{ display: 'block', color: 'var(--color-text-muted)' }}>instáveis</small></div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
