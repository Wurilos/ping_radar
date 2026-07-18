const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ReportOverview {
  generatedAt: string;
  period: { days: number; startDate: string; endDate: string };
  filter: { contractNumber: string | null };
  current: {
    total: number;
    online: number;
    offline: number;
    unstable: number;
    maintenance: number;
    avgUptime: number;
    avgResponseTime: number;
    successRate: number;
    checks: number;
    alerts: number;
  };
  alerts: {
    total: number;
    offline: number;
    online: number;
    unstable: number;
    delivered: number;
    failed: number;
  };
  dailyTrend: Array<{
    date: string;
    label: string;
    checks: number;
    availability: number | null;
    avgResponse: number | null;
  }>;
  contractBreakdown: Array<{
    name: string;
    total: number;
    online: number;
    offline: number;
    unstable: number;
    maintenance: number;
    avgUptime: number;
    avgResponseTime: number;
    clients: string[];
  }>;
  ranking: Array<{
    id: string;
    internalId: string;
    name: string;
    host: string;
    status: string;
    contractNumber: string | null;
    clientName: string | null;
    location: string | null;
    uptimePercent: number;
    avgResponseTime: number;
    consecutiveFailures: number;
    lastCheck: string | null;
    lastOnline: string | null;
    lastOffline: string | null;
    maintenanceReason: string | null;
  }>;
  criticalEquipments: ReportOverview['ranking'];
  recentAlerts: Array<{
    id: string;
    type: string;
    channel: string;
    delivered: boolean;
    sentAt: string;
    message: string;
    equipment: {
      id: string;
      name: string;
      host: string;
      contractNumber: string | null;
      location: string | null;
    };
  }>;
}

export async function getReportOverview(params: { days?: number; contractNumber?: string } = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('pingalert_token') : null;
  const query = new URLSearchParams();
  query.set('days', String(params.days || 30));
  if (params.contractNumber) query.set('contractNumber', params.contractNumber);

  const response = await fetch(`${API_URL}/api/reports/overview?${query.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Não foi possível gerar o relatório.');
  return data as ReportOverview;
}
