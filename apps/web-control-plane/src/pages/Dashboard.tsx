import React from 'react';
import { Activity, Play, ShieldCheck, ListFilter, TrendingUp, AlertTriangle } from 'lucide-react';
import { RunList } from '../components/Runs';
import { GateApprovalCard } from '../components/Governance';

const StatCard: React.FC<{ title: string; value: string; icon: any; color?: string }> = ({ title, value, icon: Icon, color }) => (
  <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
    <div className="flex justify-between items-start" style={{ marginBottom: '1rem' }}>
      <div style={{ color: color || 'var(--accent)', background: 'rgba(255, 255, 255, 0.05)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
        <Icon size={20} />
      </div>
      <div style={{ color: 'var(--success)', fontSize: '0.75rem', fontWeight: 600 }}>+12%</div>
    </div>
    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{value}</div>
    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{title}</div>
  </div>
);

export const Dashboard: React.FC = () => {
  return (
    <div className="flex flex-col" style={{ gap: '2.5rem' }}>
      <header>
        <h1 style={{ marginBottom: '0.5rem' }}>Operator Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Overview of current runs, gates, and system health.</p>
      </header>

      <div className="grid grid-cols-3" style={{ gap: '1.5rem' }}>
        <StatCard title="Active Runs" value="5" icon={Play} />
        <StatCard title="Pending Gates" value="3" icon={ShieldCheck} color="var(--warning)" />
        <StatCard title="Success Rate" value="98.2%" icon={TrendingUp} color="var(--success)" />
      </div>

      <div className="grid grid-cols-2" style={{ gap: '2.5rem' }}>
        <section>
          <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
             <h3>Recent Runs</h3>
             <button className="btn-ghost" style={{ fontSize: '0.875rem' }}>View All</button>
          </div>
          <RunList />
        </section>

        <section>
          <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
             <h3>Pending Approvals</h3>
             <button className="btn-ghost" style={{ fontSize: '0.875rem' }}>View All</button>
          </div>
          <div className="flex flex-col" style={{ gap: '1.5rem' }}>
             <GateApprovalCard />
             <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)', border: '1px dotted var(--border)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Other approvals automatically cleared by policy.</span>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
};
