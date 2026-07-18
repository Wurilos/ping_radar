'use client';

import { Activity } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ReportOverview } from '@/lib/report-api';

export default function ReportTrend({ report }: { report: ReportOverview }) {
  return (
    <section className="glass-card chart-card" style={{ marginBottom: 20 }}>
      <div className="card-heading">
        <h2><Activity size={18} color="var(--color-accent)" /> Tendência de disponibilidade</h2>
        <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{report.period.days} dias</span>
      </div>
      <div style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={report.dailyTrend} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="reportFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.45} />
                <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border-subtle)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" stroke="var(--color-text-muted)" tickLine={false} axisLine={false} fontSize={11} minTickGap={20} />
            <YAxis domain={[0, 100]} stroke="var(--color-text-muted)" tickLine={false} axisLine={false} fontSize={11} />
            <Tooltip contentStyle={{ background: 'var(--color-bg-card-hover)', border: '1px solid var(--color-border)', borderRadius: 10 }} />
            <Area type="monotone" dataKey="availability" name="Disponibilidade (%)" connectNulls stroke="var(--color-accent)" strokeWidth={3} fill="url(#reportFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
