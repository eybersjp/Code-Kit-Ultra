import React from 'react';
import { Settings as SettingsIcon, Shield, Database, Users, Bell, Zap } from 'lucide-react';

const SettingsSection: React.FC<{ title: string; subtitle: string; icon: any; children: React.ReactNode }> = ({ title, subtitle, icon: Icon, children }) => (
  <section className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)', marginBottom: '1.5rem' }}>
    <div className="flex" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--accent)', padding: '0.75rem', height: 'fit-content', borderRadius: 'var(--radius-md)' }}>
         <Icon size={24} />
      </div>
      <div>
         <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h2>
         <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{subtitle}</p>
      </div>
    </div>
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: 'auto' }}>
      {children}
    </div>
  </section>
);

export const Settings: React.FC = () => {
  return (
    <div className="flex flex-col" style={{ gap: '2.5rem' }}>
      <header>
        <h1 style={{ marginBottom: '0.5rem' }}>System Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Configure policies, integrations, and workspace defaults.</p>
      </header>

      <div style={{ maxWidth: '800px' }}>
        <SettingsSection 
            title="Governance Policies" 
            subtitle="Define default risk profiles and approval thresholds globally or per environment."
            icon={Shield}
        >
            <div className="flex flex-col" style={{ gap: '1rem' }}>
               <div className="flex justify-between items-center">
                  <div>
                    <div style={{ fontWeight: 600 }}>Active Profile</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Currently applied to: PROD, STAGING</div>
                  </div>
                  <select style={{ background: 'var(--bg-tertiary)', border: 'none', color: '#fff', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
                    <option>balanced</option>
                    <option>strict</option>
                    <option>turbo</option>
                  </select>
               </div>
            </div>
        </SettingsSection>

        <SettingsSection 
            title="Autonomy Level" 
            subtitle="Configure which categories of tasks are allowed to run without human oversight."
            icon={Zap}
        >
            <div className="flex flex-col" style={{ gap: '1rem' }}>
               <div className="flex justify-between items-center">
                  <span>Allow automated dependency updates</span>
                  <div style={{ width: '40px', height: '20px', borderRadius: '20px', background: 'var(--accent)', padding: '2px' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff', marginLeft: '20px' }} />
                  </div>
               </div>
               <div className="flex justify-between items-center">
                  <span>Allow automated infrastructure rollout</span>
                  <div style={{ width: '40px', height: '20px', borderRadius: '20px', background: 'var(--bg-tertiary)', padding: '2px' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff' }} />
                  </div>
               </div>
            </div>
        </SettingsSection>
      </div>
    </div>
  );
};
