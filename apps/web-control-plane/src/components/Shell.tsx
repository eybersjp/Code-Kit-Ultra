import React from 'react';
import { LayoutDashboard, Play, ShieldAlert, ListFilter, Settings, LogOut, ChevronRight, Activity, Calendar, User, Search, TrendingUp, Shield, FileText } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { OrgSwitcher, ProjectSwitcher } from '../components/Switcher';
import { HealthBadge } from '../components/Governance';

export const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Runs', icon: Play, path: '/runs' },
    { name: 'Gates', icon: ShieldAlert, path: '/gates' },
    { name: 'Audit', icon: ListFilter, path: '/audit' },
    { name: 'Analytics', icon: TrendingUp, path: '/analytics' },
    { name: 'Policies', icon: Shield, path: '/policies' },
    { name: 'Audit Browser', icon: FileText, path: '/audit-browser' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="flex items-center" style={{ gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'var(--accent)', color: 'var(--bg-primary)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
            <Activity size={24} />
          </div>
          <span style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.025em' }}>Ultra Control</span>
        </div>

        <OrgSwitcher />
        <ProjectSwitcher />

        <nav className="flex flex-col" style={{ gap: '0.25rem', flexGrow: 1, marginTop: '2rem' }}>
          {navItems.map(item => (
            <Link 
              key={item.path} 
              to={item.path}
              className={`flex items-center btn-ghost ${location.pathname === item.path ? 'glass' : ''}`}
              style={{ padding: '0.75rem', gap: '0.75rem', color: location.pathname === item.path ? 'var(--accent)' : 'var(--text-secondary)' }}
            >
              <item.icon size={20} />
              <span style={{ fontWeight: 500 }}>{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="flex flex-col" style={{ gap: '1rem', marginTop: 'auto' }}>
           <HealthBadge />
           <button className="btn-ghost flex items-center" style={{ gap: '0.75rem', padding: '0.75rem' }}>
             <LogOut size={20} />
             <span>Sign Out</span>
           </button>
        </div>
      </aside>

      <main className="content">
        <header className="flex justify-between items-center" style={{ marginBottom: '2.5rem' }}>
           <div className="glass flex items-center" style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', width: '300px', gap: '0.5rem' }}>
             <Search size={18} color="var(--text-muted)" />
             <input type="text" placeholder="Search resources..." style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%' }} />
           </div>
           <div className="flex items-center" style={{ gap: '1rem' }}>
             <div className="flex items-center" style={{ gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Admin</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                    <User size={32} color="var(--text-muted)" />
                </div>
             </div>
           </div>
        </header>
        {children}
      </main>
    </div>
  );
};
