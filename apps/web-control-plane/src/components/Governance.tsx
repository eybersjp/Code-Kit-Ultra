import React from 'react';
import { Shield, Check, X, ShieldCheck } from 'lucide-react';

export const GateApprovalCard: React.FC = () => {
  return (
    <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)', border: '1px solid rgba(34, 211, 238, 0.2)' }}>
      <div className="flex justify-between items-start" style={{ marginBottom: '1.5rem' }}>
        <div className="flex items-center" style={{ gap: '1rem' }}>
           <div style={{ background: 'rgba(34, 211, 238, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
             <Shield size={24} color="var(--accent)" />
           </div>
           <div>
             <h3 style={{ margin: 0 }}>Prod Deployment Gate</h3>
             <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Run ID: #4492 - Infrastructure rollout</span>
           </div>
        </div>
        <span className="badge badge-warning">Needs Approval</span>
      </div>

      <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Automatic security scan passed with 0 critical issues. Requires manual sign-off due to policy profile: <strong style={{ color: 'var(--text-primary)' }}>balanced</strong>.
      </p>

      <div className="flex" style={{ gap: '1rem' }}>
         <button className="btn-primary flex items-center" style={{ gap: '0.5rem', flex: 1, justifyContent: 'center' }}>
            <Check size={16} /> Approve
         </button>
         <button className="btn-secondary flex items-center" style={{ style: { background: 'var(--danger)', color: '#fff' }, gap: '0.5rem', flex: 1, justifyContent: 'center' }}>
            <X size={16} /> Reject
         </button>
      </div>
    </div>
  );
};

export const AuditTable: React.FC = () => {
  const audits = [
    { id: 'a-1', actor: 'jsmith', action: 'gate_approved', time: '10:15', status: 'success' },
    { id: 'a-2', actor: 'system', action: 'run_completed', time: '10:12', status: 'success' },
    { id: 'a-3', actor: 'ck-cli', action: 'auth_session_init', time: '10:10', status: 'success' },
  ];

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
          <th style={{ padding: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Actor</th>
          <th style={{ padding: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Action</th>
          <th style={{ padding: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Time</th>
          <th style={{ padding: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
        </tr>
      </thead>
      <tbody>
        {audits.map(a => (
          <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
             <td style={{ padding: '0.75rem', fontWeight: 600 }}>{a.actor}</td>
             <td style={{ padding: '0.75rem' }}>{a.action}</td>
             <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{a.time}</td>
             <td style={{ padding: '0.75rem' }}><span className="badge badge-success">{a.status}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export const HealthBadge: React.FC = () => {
    return (
        <div className="flex items-center" style={{ gap: '0.5rem', color: 'var(--success)', fontWeight: 600, fontSize: '0.8rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 5px currentColor' }} />
            Control Plane: ONLINE
        </div>
    );
};
