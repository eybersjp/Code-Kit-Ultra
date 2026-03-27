import React from 'react';
import { Play, Activity, Clock, Terminal, Shield, CheckCircle, ChevronLeft } from 'lucide-react';
import { RunTimeline } from '../components/Runs';
import { Link } from 'react-router-dom';

export const RunDetail: React.FC = () => {
  return (
    <div className="flex flex-col" style={{ gap: '2rem' }}>
      <Link to="/runs" className="btn-ghost flex items-center" style={{ gap: '0.5rem', width: 'fit-content' }}>
        <ChevronLeft size={16} /> Back to Runs
      </Link>

      <header className="flex justify-between items-start">
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Infrastructure Rollout #4492</h1>
          <div className="flex items-center" style={{ gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
             <span className="badge badge-info flex items-center" style={{ gap: '0.25rem' }}><Activity size={12} /> Running</span>
             <span>ID: dc8-1192-2b30</span>
             <span>Started: 10:05 AM</span>
             <span>Context: Default Project</span>
          </div>
        </div>
        <div className="flex" style={{ gap: '1rem' }}>
           <button className="btn-secondary">Pause Run</button>
           <button className="btn-secondary" style={{ background: 'var(--danger)', color: '#fff' }}>Cancel Run</button>
        </div>
      </header>

      <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
        <section className="flex flex-col" style={{ gap: '2rem' }}>
          <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
             <h3>Execution Timeline</h3>
             <RunTimeline />
          </div>

          <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
             <h3 className="flex items-center" style={{ gap: '0.5rem' }}><Shield size={18} color="var(--accent)" /> Governance Summary</h3>
             <ul style={{ listStyleType: 'none', padding: 0, marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <li className="flex justify-between" style={{ padding: '1rem 0', borderBottom: '1px solid var(--border)' }}>
                   <span>Privacy Policy Check</span>
                   <span style={{ color: 'var(--success)' }}>✔ Passed</span>
                </li>
                <li className="flex justify-between" style={{ padding: '1rem 0', borderBottom: '1px solid var(--border)' }}>
                   <span>Risk Level</span>
                   <span style={{ color: 'var(--warning)' }}>Medium (balanced)</span>
                </li>
                <li className="flex justify-between" style={{ padding: '1rem 0' }}>
                   <span>Deployment Authorization</span>
                   <span style={{ color: 'var(--info)' }}>Awaiting Gate</span>
                </li>
             </ul>
          </div>
        </section>

        <section className="flex flex-col" style={{ gap: '2rem' }}>
          <div className="glass" style={{ padding: '0', borderRadius: 'var(--radius-xl)', overflow: 'hidden', flexGrow: 1, minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
             <div className="sidebar" style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)', gap: '1rem' }}>
                <span className="flex items-center" style={{ gap: '0.5rem', fontSize: '0.875rem' }}><Terminal size={14} /> Execution logs</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Streaming active...</span>
             </div>
             <div style={{ background: '#000', padding: '1.5rem', flexGrow: 1, fontFamily: 'monospace', fontSize: '0.825rem', color: '#a5b4fc', overflowY: 'auto' }}>
                <p style={{ opacity: 0.5 }}>[10:05:01] Initializing execution engine v1.2.0</p>
                <p style={{ opacity: 0.5 }}>[10:05:01] Validating actor jsmith (admin)</p>
                <p>[10:05:02] Loading plan #P-2911 (Infrastructure rollout)</p>
                <p>[10:05:03] Step 1: Intake processed - OK</p>
                <p>[10:05:05] Step 2: Resource mapping - OK</p>
                <p>[10:05:07] Step 3: Simulation start...</p>
                <p style={{ color: 'var(--accent)' }}>[10:05:10] Simulation: 5 resources identified, 0 conflicts found.</p>
                <p>[10:05:12] Executing terraform init...</p>
                <p>[10:05:15] Executing terraform plan...</p>
                <p style={{ color: 'var(--success)' }}>[10:05:18] Plan generated. Awaiting governance gate.</p>
                <p style={{ color: 'var(--warning)' }}>[10:05:19] PAUSED: Gate "prod_deployment" requires manual approval.</p>
                <p style={{ borderLeft: '2px solid var(--accent)', paddingLeft: '1rem', marginTop: '1rem', color: '#fff' }}>_</p>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
};
