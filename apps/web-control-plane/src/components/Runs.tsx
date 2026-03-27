import React from 'react';
import { Play, CheckCircle, AlertCircle, Clock, ChevronRight } from 'lucide-react';

export const RunList: React.FC = () => {
  const runs = [
    { id: 'run-1', title: 'Infra Automation', status: 'running', user: 'admin', time: '5m' },
    { id: 'run-2', title: 'DB Migration', status: 'completed', user: 'jdeo', time: '1h' },
    { id: 'run-3', title: 'Security Scan', status: 'failed', user: 'service-a', time: '2h' },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play size={16} color="var(--accent)" />;
      case 'completed': return <CheckCircle size={16} color="var(--success)" />;
      case 'failed': return <AlertCircle size={16} color="var(--danger)" />;
      default: return <Clock size={16} color="var(--text-muted)" />;
    }
  };

  return (
    <div className="flex flex-col" style={{ gap: '1rem' }}>
      {runs.map(run => (
        <div 
          key={run.id} 
          className="glass" 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '1rem', 
            borderRadius: 'var(--radius-lg)',
            cursor: 'pointer',
            transition: 'transform var(--transition-fast)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <div className="flex items-center" style={{ gap: '1.5rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
              {getStatusIcon(run.status)}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>{run.title}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {run.user} • {run.time} ago
              </div>
            </div>
          </div>
          <div className="flex items-center" style={{ gap: '1rem' }}>
             <span className={`badge badge-${run.status === 'running' ? 'info' : run.status === 'completed' ? 'success' : 'danger'}`}>
                {run.status}
             </span>
             <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>
      ))}
    </div>
  );
};

export const RunTimeline: React.FC = () => {
  const steps = [
    { id: 's-1', title: 'Intake Processed', status: 'success', time: '10:05' },
    { id: 's-2', title: 'Planning Complete', status: 'success', time: '10:06' },
    { id: 's-3', title: 'Building Assets', status: 'running', time: '10:07' },
    { id: 's-4', title: 'Deployment Gate', status: 'pending', time: '-' },
  ];

  return (
    <div className="flex flex-col" style={{ gap: '1.5rem', padding: '1rem' }}>
      {steps.map((step, idx) => (
        <div key={step.id} className="flex" style={{ gap: '1.5rem' }}>
          <div className="flex flex-col items-center">
            <div 
              style={{ 
                width: '12px', 
                height: '12px', 
                borderRadius: '50%', 
                background: step.status === 'success' ? 'var(--success)' : step.status === 'running' ? 'var(--accent)' : 'var(--bg-tertiary)',
                boxShadow: step.status === 'running' ? '0 0 10px var(--accent-glow)' : 'none',
                zIndex: 2
              }} 
            />
            {idx < steps.length - 1 && (
              <div style={{ width: '2px', background: 'rgba(255,255,255,0.1)', flexGrow: 1, marginTop: '4px', marginBottom: '4px' }} />
            )}
          </div>
          <div style={{ paddingBottom: idx < steps.length - 1 ? '1.5rem' : 0 }}>
             <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{step.title}</div>
             <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{step.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
