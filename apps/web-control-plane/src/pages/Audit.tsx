import React from 'react';
import { ListFilter, Download, Calendar, Search } from 'lucide-react';
import { AuditTable } from '../components/Governance';

export const Audit: React.FC = () => {
  return (
    <div className="flex flex-col" style={{ gap: '2.5rem' }}>
      <header className="flex justify-between items-end">
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Audit Logs</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Immutable hash-chained trail of all system activities.</p>
        </div>
        <button className="btn-secondary flex items-center" style={{ gap: '0.5rem' }}>
           <Download size={18} /> Export Logs
        </button>
      </header>

      <div className="flex items-center" style={{ gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
         <div className="flex items-center" style={{ gap: '0.5rem', flexGrow: 1 }}>
            <Search size={18} color="var(--text-muted)" />
            <input type="text" placeholder="Search by Actor, Action, ID..." style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%' }} />
         </div>
         <div className="flex" style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1rem', gap: '0.5rem' }}>
           <button className="btn-ghost flex items-center" style={{ gap: '0.5rem', fontSize: '0.8rem' }}>
              <Calendar size={16} /> Last 24 Hours
           </button>
           <button className="btn-ghost flex items-center" style={{ gap: '0.5rem', fontSize: '0.8rem' }}>
              <ListFilter size={16} /> Filter
           </button>
         </div>
      </div>

      <div className="glass" style={{ padding: '0', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <AuditTable />
      </div>

      <div className="flex items-center" style={{ gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', alignSelf: 'center', marginTop: '1rem' }}>
         <span style={{ color: 'var(--success)' }}>✔</span> Audit integrity verified via hash chain.
      </div>
    </div>
  );
};
