import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Zap, Shield, GitBranch, BarChart3, Lock, Users,
  ArrowRight, CheckCircle, Code, Rocket, Gauge
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/signup');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Navigation */}
      <nav style={{
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky',
        top: 0,
        background: 'rgba(15, 15, 30, 0.95)',
        backdropFilter: 'blur(10px)',
        zIndex: 100,
      }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-bright)' }}>
          🚀 Code Kit Ultra
        </div>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link to="/docs" style={{ color: 'var(--text-secondary)' }}>Documentation</Link>
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary">Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">Sign In</Link>
              <Link to="/signup" className="btn btn-primary">Get Started</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        padding: '6rem 2rem',
        textAlign: 'center',
        background: 'linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>
            Intelligent Code Governance
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Automated approval gates, healing strategies, and intelligent rollback automation
            for your deployment pipelines. Enterprise-grade governance with zero configuration.
          </p>
          <button onClick={handleGetStarted} className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}>
            Get Started Free <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>Powerful Features</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem',
        }}>
          {[
            {
              icon: <Zap size={32} color="var(--accent-bright)" />,
              title: 'Auto-Approvals',
              desc: 'Intelligent rules automatically approve low-risk changes based on quality metrics',
            },
            {
              icon: <Shield size={32} color="var(--success)" />,
              title: 'Security Gates',
              desc: 'Security scanning, SAST analysis, and dependency checks integrated seamlessly',
            },
            {
              icon: <Gauge size={32} color="var(--info)" />,
              title: 'Healing Strategies',
              desc: 'Automatic remediation - scale up, clear cache, or trigger circuit breakers',
            },
            {
              icon: <BarChart3 size={32} color="var(--warning)" />,
              title: 'Analytics Dashboard',
              desc: 'Real-time insights into approval rates, success metrics, and policy compliance',
            },
            {
              icon: <GitBranch size={32} color="var(--accent)" />,
              title: 'Rollback Automation',
              desc: 'Automatic production rollback with canary support when error rates spike',
            },
            {
              icon: <Lock size={32} color="var(--danger)" />,
              title: 'Fine-grained Access',
              desc: 'Role-based access control, audit trails, and compliance logging for governance',
            },
          ].map((feature, i) => (
            <div key={i} className="card">
              <div style={{ marginBottom: '1rem' }}>{feature.icon}</div>
              <h3 style={{ marginBottom: '0.5rem' }}>{feature.title}</h3>
              <p style={{ marginBottom: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section style={{
        padding: '4rem 2rem',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        borderBottom: '1px solid var(--border-color)',
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>How It Works</h2>
          <div style={{ display: 'grid', gap: '2rem' }}>
            {[
              {
                step: '1',
                title: 'Initialize Your Project',
                desc: 'Generate an API token in your dashboard and add it to your CI/CD configuration',
              },
              {
                step: '2',
                title: 'Define Governance Rules',
                desc: 'Set up approval gates, test requirements, and security checks using our DSL',
              },
              {
                step: '3',
                title: 'Intelligent Execution',
                desc: 'Our system evaluates conditions, auto-approves low-risk changes, and coordinates gates',
              },
              {
                step: '4',
                title: 'Automated Remediation',
                desc: 'When issues arise, healing strategies automatically execute, with rollback if needed',
              },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent-bright), var(--accent))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.25rem',
                  color: 'white',
                  flexShrink: 0,
                }}>
                  {item.step}
                </div>
                <div>
                  <h3 style={{ marginBottom: '0.5rem' }}>{item.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modes Section */}
      <section style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>Three Operation Modes</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
        }}>
          {[
            {
              icon: '🛡️',
              name: 'Safe',
              desc: 'Monitoring and testing only. Perfect for development environments.',
              color: '#10b981',
            },
            {
              icon: '⚡',
              name: 'Balanced',
              desc: 'Auto-acknowledgment and healing enabled. Recommended for most teams.',
              color: '#f59e0b',
            },
            {
              icon: '🚀',
              name: 'Aggressive',
              desc: 'Full automation with auto-approvals and production rollbacks.',
              color: '#ef4444',
            },
          ].map((mode, i) => (
            <div key={i} className="card" style={{
              borderTop: `3px solid ${mode.color}`,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{mode.icon}</div>
              <h3 style={{ marginBottom: '0.5rem' }}>{mode.name}</h3>
              <p style={{ marginBottom: 0, color: 'var(--text-secondary)' }}>{mode.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{
        padding: '4rem 2rem',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '1rem' }}>Simple, Transparent Pricing</h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '3rem' }}>
            Code Kit Ultra is free to use. Commercial support and SLAs available.
          </p>
          <button onClick={handleGetStarted} className="btn btn-primary" style={{ fontSize: '1.05rem', padding: '0.75rem 1.5rem' }}>
            Create Free Account <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: '4rem 2rem',
        textAlign: 'center',
        background: 'linear-gradient(135deg, var(--accent-bright) 0%, var(--accent) 100%)',
      }}>
        <h2 style={{ color: 'white', marginBottom: '1rem' }}>
          Ready to Automate Your Governance?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.1rem', marginBottom: '2rem' }}>
          Join teams who are using intelligent governance to ship faster and safer.
        </p>
        <button onClick={handleGetStarted} className="btn" style={{
          background: 'white',
          color: 'var(--accent)',
          fontWeight: 700,
          padding: '0.75rem 2rem',
        }}>
          Get Started Free <ArrowRight size={18} />
        </button>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '2rem',
        borderTop: '1px solid var(--border-color)',
        textAlign: 'center',
        color: 'var(--text-muted)',
      }}>
        <p>&copy; 2026 Code Kit Ultra. Open source. MIT License.</p>
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
          <Link to="/docs">Documentation</Link>
          <a href="https://github.com/eybersjp/code-kit-ultra">GitHub</a>
          <Link to="/docs/security">Security</Link>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
