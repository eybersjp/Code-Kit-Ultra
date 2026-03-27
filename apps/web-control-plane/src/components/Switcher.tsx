import React, { useState } from 'react';
import { ChevronDown, Building2 } from 'lucide-react';

interface Org {
  id: string;
  name: string;
}

export const OrgSwitcher: React.FC = () => {
  const [orgs] = useState<Org[]>([
    { id: 'org-1', name: 'Acme Corp' },
    { id: 'org-2', name: 'Global Tech' }
  ]);
  const [currentOrg, setCurrentOrg] = useState(orgs[0]);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="btn-ghost flex items-center justify-between"
        style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center" style={{ gap: '0.75rem' }}>
          <Building2 size={18} />
          <span style={{ fontWeight: 600 }}>{currentOrg.name}</span>
        </div>
        <ChevronDown size={14} style={{ opacity: 0.5 }} />
      </button>

      {isOpen && (
        <div className="glass" style={{ 
          position: 'absolute', 
          top: '110%', 
          left: 0, 
          right: 0, 
          zIndex: 10, 
          borderRadius: 'var(--radius-md)',
          padding: '0.5rem',
          boxShadow: 'var(--shadow-lg)'
        }}>
          {orgs.map((org: Org) => (
            <div 
              key={org.id} 
              onClick={() => { setCurrentOrg(org); setIsOpen(false); }}
              style={{ padding: '0.5rem', cursor: 'pointer', borderRadius: 'var(--radius-sm)', background: org.id === currentOrg.id ? 'rgba(255,255,255,0.05)' : 'transparent' }}
              onMouseEnter={(e: React.MouseEvent) => e.currentTarget.setAttribute('style', `${e.currentTarget.getAttribute('style')}; background: rgba(255,255,255,0.05)`)}
              onMouseLeave={(e: React.MouseEvent) => e.currentTarget.setAttribute('style', `${e.currentTarget.getAttribute('style')}; background: ${org.id === currentOrg.id ? 'rgba(255,255,255,0.05)' : 'transparent'}`)}
            >
              {org.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const ProjectSwitcher: React.FC = () => {
  const projects = [
    { id: 'p-1', name: 'Platform Engineering' },
    { id: 'p-2', name: 'AI Core' }
  ];
  const [current, setCurrent] = useState(projects[0]);

  return (
    <div className="flex flex-col" style={{ gap: '0.5rem' }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Project</span>
      <div className="flex items-center" style={{ gap: '0.5rem' }}>
         <select 
           value={current.id} 
           onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCurrent(projects.find(p => p.id === e.target.value)!)}
           style={{ 
             background: 'transparent', 
             border: 'none', 
             color: 'var(--text-primary)', 
             fontSize: '0.875rem', 
             fontWeight: 500,
             outline: 'none',
             width: '100%'
           }}
         >
           {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
         </select>
      </div>
    </div>
  );
}
