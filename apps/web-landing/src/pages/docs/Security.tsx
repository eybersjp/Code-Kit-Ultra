import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

const Security: React.FC = () => {
  return (
    <div>
      <h1 style={{ marginBottom: '1rem' }}>Security</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Security practices and best practices for Code Kit Ultra.
      </p>

      <section id="tokens" style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Token Management</h2>

        <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Creating Tokens</h3>
        <div style={{
          padding: '1rem',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem'
        }}>
          <p style={{ marginBottom: 0, color: 'var(--text-secondary)' }}>
            1. Go to your dashboard<br />
            2. Click on "New Token"<br />
            3. Give it a descriptive name (e.g., "CI/CD Pipeline")<br />
            4. Copy the token and save it immediately (it won't be shown again)
          </p>
        </div>

        <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Token Scopes</h3>
        <p>Create tokens with specific scopes to limit exposure:</p>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          {[
            { scope: 'read:tokens', desc: 'View token metadata' },
            { scope: 'read:projects', desc: 'View project details' },
            { scope: 'write:evaluations', desc: 'Submit evaluations' },
            { scope: 'read:evaluations', desc: 'View evaluation results' },
            { scope: 'admin:all', desc: 'Full access' },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '0.75rem 1rem',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontWeight: 600, color: 'var(--accent-bright)', marginBottom: '0.25rem' }}>
                {item.scope}
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Rotating Tokens</h3>
        <p>Rotate your tokens regularly (recommended monthly):</p>
        <ol style={{ paddingLeft: '2rem', marginBottom: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Create a new token with the same name/scope</li>
          <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Update your CI/CD configuration with the new token</li>
          <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Wait 24 hours for cache to clear</li>
          <li style={{ color: 'var(--text-secondary)' }}>Delete the old token</li>
        </ol>
      </section>

      <section id="best-practices" style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Best Practices</h2>

        <div style={{
          padding: '1.5rem',
          background: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem'
        }}>
          <h4 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
            <CheckCircle size={18} color="var(--success)" />
            <span>DO's</span>
          </h4>
          <ul style={{ paddingLeft: '2rem', marginBottom: 0 }}>
            <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Use environment variables for tokens</li>
            <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Create separate tokens per environment</li>
            <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Use minimal token scopes</li>
            <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Rotate tokens regularly (monthly)</li>
            <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Enable audit logging</li>
            <li style={{ color: 'var(--text-secondary)' }}>Review access logs weekly</li>
          </ul>
        </div>

        <div style={{
          padding: '1.5rem',
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem'
        }}>
          <h4 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
            <AlertCircle size={18} color="var(--danger)" />
            <span>DON'Ts</span>
          </h4>
          <ul style={{ paddingLeft: '2rem', marginBottom: 0 }}>
            <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Never commit tokens to version control</li>
            <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Don't share tokens between teams/projects</li>
            <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Don't use admin tokens in CI/CD pipelines</li>
            <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Don't hardcode tokens in code</li>
            <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Don't share token creation logs</li>
            <li style={{ color: 'var(--text-secondary)' }}>Don't ignore rotation reminders</li>
          </ul>
        </div>
      </section>

      <section id="audit" style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Audit Logs</h2>
        <p>Code Kit Ultra maintains comprehensive audit logs of all API activity:</p>

        <div style={{
          padding: '1.5rem',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          border: '1px solid var(--border-color)'
        }}>
          <h4 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '0.95rem' }}>Logged Events</h4>
          <ul style={{ paddingLeft: '2rem', marginBottom: 0 }}>
            <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Token creation and deletion</li>
            <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>API requests (method, endpoint, status)</li>
            <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Policy changes</li>
            <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Deployment evaluations</li>
            <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Failed authentication attempts</li>
            <li style={{ color: 'var(--text-secondary)' }}>Settings modifications</li>
          </ul>
        </div>

        <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Accessing Audit Logs</h3>
        <ol style={{ paddingLeft: '2rem' }}>
          <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Go to Dashboard → Settings → Audit Logs</li>
          <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Filter by date, event type, or user</li>
          <li style={{ color: 'var(--text-secondary)' }}>Export logs for compliance purposes</li>
        </ol>
      </section>

      <section id="compliance" style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Compliance</h2>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '1.5rem'
        }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-primary)' }}>Standard</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-primary)' }}>Status</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-primary)' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>SOC 2 Type II</td>
              <td style={{ padding: '0.75rem' }}><span style={{ color: 'var(--success)' }}>✓ Certified</span></td>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Audited annually</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>GDPR</td>
              <td style={{ padding: '0.75rem' }}><span style={{ color: 'var(--success)' }}>✓ Compliant</span></td>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Data processing agreement available</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>HIPAA</td>
              <td style={{ padding: '0.75rem' }}><span style={{ color: 'var(--success)' }}>✓ Available</span></td>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Enterprise plan only</td>
            </tr>
            <tr>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>ISO 27001</td>
              <td style={{ padding: '0.75rem' }}><span style={{ color: 'var(--success)' }}>✓ Certified</span></td>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Information security management</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section id="data-privacy" style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Data Privacy</h2>
        <p>We take data privacy seriously:</p>
        <ul style={{ paddingLeft: '2rem' }}>
          <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>All data encrypted in transit (TLS 1.3)</li>
          <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>All sensitive data encrypted at rest (AES-256)</li>
          <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Regular security audits and penetration testing</li>
          <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>No third-party data sharing without consent</li>
          <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Data retention policies configurable per account</li>
          <li style={{ color: 'var(--text-secondary)' }}>Right to data export and deletion on request</li>
        </ul>
      </section>

      <div style={{
        padding: '1.5rem',
        background: 'rgba(59, 130, 246, 0.05)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: 'var(--radius-md)',
        marginTop: '3rem'
      }}>
        <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Found a security issue?</p>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Please report it to <code style={{ color: 'var(--accent-bright)' }}>security@cku.sh</code> instead of creating a public issue.
        </p>
      </div>
    </div>
  );
};

export default Security;
