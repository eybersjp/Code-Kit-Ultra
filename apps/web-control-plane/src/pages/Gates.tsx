import React from 'react';
import { GateApprovalCard } from '../components/Governance';
import { ShieldCheck, Info } from 'lucide-react';

export const Gates: React.FC = () => {
  return (
    <div className="flex flex-col" style={{ gap: '2.5rem' }}>
      <header>
        <h1 style={{ marginBottom: '0.5rem' }}>Control Gates</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Pending approvals and policy-controlled execution checkpoints.</p>
      </header>

      <div className="glass flex" style={{ gap: '1rem', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
        <Info size={20} color="var(--info)" />
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          By default, the <strong>balanced</strong> policy profile is active. This requires manual approval for all infrastructure and deployment tasks.
        </span>
      </div>

      <div className="grid grid-cols-2" style={{ gap: '1.5rem' }}>
        <GateApprovalCard />
        <div className="glass flex flex-col items-center justify-center" style={{ gap: '1rem', padding: '2rem', textAlign: 'center', opacity: 0.6, border: '1px dashed var(--border)' }}>
           <ShieldCheck size={32} color="var(--text-muted)" />
           <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Additional gates are currently in automated processing.</p>
        </div>
      </div>
    </div>
  );
};
