import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Menu, X, BookOpen, Code, Zap, Lock, FileText, HelpCircle } from 'lucide-react';

const DocsLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const docSections = [
    {
      title: 'Getting Started',
      icon: <Zap size={18} />,
      path: '/docs/getting-started',
      subsections: [
        { title: 'Installation', path: '/docs/getting-started#installation' },
        { title: 'Quick Start', path: '/docs/getting-started#quick-start' },
        { title: 'Configuration', path: '/docs/getting-started#configuration' },
      ]
    },
    {
      title: 'API Reference',
      icon: <Code size={18} />,
      path: '/docs/api-reference',
      subsections: [
        { title: 'Authentication', path: '/docs/api-reference#authentication' },
        { title: 'Endpoints', path: '/docs/api-reference#endpoints' },
        { title: 'Rate Limiting', path: '/docs/api-reference#rate-limiting' },
      ]
    },
    {
      title: 'Governance Rules',
      icon: <BookOpen size={18} />,
      path: '/docs/governance-rules',
      subsections: [
        { title: 'Approval Gates', path: '/docs/governance-rules#approval-gates' },
        { title: 'Healing Strategies', path: '/docs/governance-rules#healing' },
        { title: 'Rollback Policies', path: '/docs/governance-rules#rollback' },
      ]
    },
    {
      title: 'Security',
      icon: <Lock size={18} />,
      path: '/docs/security',
      subsections: [
        { title: 'Token Management', path: '/docs/security#tokens' },
        { title: 'Best Practices', path: '/docs/security#best-practices' },
        { title: 'Audit Logs', path: '/docs/security#audit' },
      ]
    },
    {
      title: 'Examples',
      icon: <FileText size={18} />,
      path: '/docs/examples',
      subsections: [
        { title: 'Basic Setup', path: '/docs/examples#basic' },
        { title: 'Advanced Configuration', path: '/docs/examples#advanced' },
        { title: 'CI/CD Integration', path: '/docs/examples#cicd' },
      ]
    },
    {
      title: 'FAQ',
      icon: <HelpCircle size={18} />,
      path: '/docs/faq',
    }
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{
        padding: '1rem 2rem',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <Link to="/" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-bright)', textDecoration: 'none' }}>
          🚀 Code Kit Ultra
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'none',
            '@media (max-width: 768px)': { display: 'block' }
          }}
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div style={{ display: 'flex', maxHeight: 'calc(100vh - 70px)' }}>
        {/* Sidebar */}
        {sidebarOpen && (
          <div style={{
            width: '280px',
            background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-color)',
            padding: '2rem 0',
            overflowY: 'auto',
          }}>
            <nav style={{ paddingLeft: 0, paddingRight: 0 }}>
              {docSections.map((section, i) => (
                <div key={i} style={{ marginBottom: '1.5rem' }}>
                  <Link
                    to={section.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1.5rem',
                      color: isActive(section.path) ? 'var(--accent-bright)' : 'var(--text-secondary)',
                      textDecoration: 'none',
                      fontWeight: isActive(section.path) ? 600 : 500,
                      borderLeft: isActive(section.path) ? '3px solid var(--accent-bright)' : '3px solid transparent',
                      transition: 'all var(--transition-fast)',
                    }}
                    onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}
                  >
                    {section.icon}
                    {section.title}
                  </Link>
                  {section.subsections && isActive(section.path) && (
                    <div style={{ paddingLeft: '2rem', marginTop: '0.5rem' }}>
                      {section.subsections.map((sub, j) => (
                        <a
                          key={j}
                          href={sub.path}
                          style={{
                            display: 'block',
                            padding: '0.5rem 1rem',
                            color: 'var(--text-muted)',
                            fontSize: '0.85rem',
                            textDecoration: 'none',
                            transition: 'color var(--transition-fast)',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-bright)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          {sub.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
        )}

        {/* Main Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '2rem',
        }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocsLayout;
