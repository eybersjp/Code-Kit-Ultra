import React from 'react';
import { RunList } from '../components/Runs';
import { Filter, Search, Plus } from 'lucide-react';

export const Runs: React.FC = () => {
  return (
    <div className="flex flex-col" style={{ gap: '2.5rem' }}>
      <header className="flex justify-between items-end">
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Execution Runs</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track and manage all autonomous engineering activities.</p>
        </div>
        <button className="btn-primary flex items-center" style={{ gap: '0.5rem' }}>
           <Plus size={18} /> New Run
        </button>
      </header>

      <div className="flex items-center" style={{ gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
         <div className="flex items-center" style={{ gap: '0.5rem', flexGrow: 1 }}>
            <Search size={18} color="var(--text-muted)" />
            <input type="text" placeholder="Filter by ID, Title, User..." style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%' }} />
         </div>
         <div className="flex" style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1rem', gap: '0.5rem' }}>
           <button className="btn-ghost flex items-center" style={{ gap: '0.5rem', fontSize: '0.8rem' }}>
              <Filter size={16} /> All Statuses
           </button>
         </div>
      </div>

      <RunList />
    </div>
  );
};
