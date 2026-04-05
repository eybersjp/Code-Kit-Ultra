import React from 'react';
import { Copy, CheckCircle } from 'lucide-react';

const GovernanceRules: React.FC = () => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const CodeBlock = ({ code, id, language = 'yaml' }: { code: string; id: string; language?: string }) => (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      marginBottom: '1.5rem'
    }}>
      <div style={{
        padding: '0.75rem 1rem',
        background: 'var(--bg-tertiary)',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>{language}</span>
        <button
          onClick={() => copyToClipboard(code, id)}
          className="btn btn-ghost"
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
        >
          {copiedId === id ? (
            <>
              <CheckCircle size={14} /> Copied
            </>
          ) : (
            <>
              <Copy size={14} /> Copy
            </>
          )}
        </button>
      </div>
      <pre style={{
        padding: '1rem',
        overflow: 'auto',
        margin: 0,
        fontFamily: 'Menlo, Consolas, monospace',
        fontSize: '0.9rem',
        lineHeight: 1.5
      }}>
        <code>{code}</code>
      </pre>
    </div>
  );

  return (
    <div>
      <h1 style={{ marginBottom: '1rem' }}>Governance Rules</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Configure approval gates, healing strategies, and rollback policies for your deployments.
      </p>

      <section id="approval-gates" style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Approval Gates</h2>
        <p>Define conditions that must be met for automatic approval:</p>

        <CodeBlock
          code={`approvals:\n  auto-approve:\n    - coverage >= 80%\n    - branch == "main"\n    - no critical vulnerabilities\n    - tests pass\n    - commits signed\n  \n  require-approval:\n    - database migration\n    - deployment to production\n    - security policy changes`}
          id="approval-gates-example"
        />

        <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Available Conditions</h3>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '1.5rem'
        }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-primary)' }}>Condition</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-primary)' }}>Type</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-primary)' }}>Example</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>coverage</td>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>percentage</td>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{'coverage >= 80%'}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>branch</td>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>string</td>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>branch == "main"</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>vulnerabilities</td>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>count</td>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>critical-vuln == 0</td>
            </tr>
            <tr>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>tests-passed</td>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>boolean</td>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>tests pass</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section id="healing" style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Healing Strategies</h2>
        <p>Automatically remediate issues when they're detected:</p>

        <CodeBlock
          code={`healing:\n  scale-up:\n    trigger: cpu > 80%\n    duration: 5m\n    replicas: 2\n  \n  clear-cache:\n    trigger: cache-hit-ratio < 50%\n    ttl: 10m\n  \n  circuit-breaker:\n    trigger: p99-latency > 500ms\n    duration: 2m\n    threshold: 5% error rate\n  \n  graceful-shutdown:\n    trigger: memory > 90%\n    drain-timeout: 30s`}
          id="healing-example"
        />

        <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Supported Triggers</h3>
        <ul style={{ paddingLeft: '2rem' }}>
          <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>CPU threshold</li>
          <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Memory threshold</li>
          <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Error rate threshold</li>
          <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Latency percentile (p50, p95, p99)</li>
          <li style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Custom metrics</li>
        </ul>
      </section>

      <section id="rollback" style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Rollback Policies</h2>
        <p>Automatically revert deployments when issues are detected:</p>

        <CodeBlock
          code={`rollback:\n  enabled: true\n  \n  # Automatic triggers\n  on-error-rate: 5%        # Rollback if errors exceed 5%\n  on-latency-spike: 50%    # Rollback if p99 latency increases 50%\n  on-availability: 99.5%   # Rollback if availability drops below 99.5%\n  \n  # Canary settings\n  canary:\n    enabled: true\n    traffic: 10%             # Start with 10% traffic\n    duration: 5m             # Monitor for 5 minutes\n    step: 2%                 # Increase by 2% every minute\n  \n  # Recovery\n  preserve-data: true        # Don't lose data during rollback\n  notify-slack: true         # Send notification to Slack\n  max-retries: 2`}
          id="rollback-example"
        />
      </section>

      <section id="policies" style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Policy Conditions</h2>

        <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Time-based Policies</h3>
        <CodeBlock
          code={`policies:\n  business-hours:\n    enabled-between:\n      - 09:00 - 17:00 (UTC)\n      - Mon-Fri\n    then:\n      - require-approval\n      - max-deployment-size: 10%\n  \n  after-hours:\n    enabled-between:\n      - 17:00 - 09:00 (UTC)\n    then:\n      - auto-rollback-on-critical`}
          id="time-policies"
        />

        <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Environment-specific Policies</h3>
        <CodeBlock
          code={`policies:\n  production:\n    environment: prod\n    rules:\n      - coverage >= 90%\n      - security-scan pass\n      - load-test success\n      - approval required\n      - canary deployment\n  \n  staging:\n    environment: staging\n    rules:\n      - coverage >= 80%\n      - tests pass\n      - auto-approved`}
          id="env-policies"
        />
      </section>

      <div style={{
        padding: '1.5rem',
        background: 'rgba(59, 130, 246, 0.05)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: 'var(--radius-md)',
        marginTop: '3rem'
      }}>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>Pro Tip:</strong> Start conservative and gradually increase automation as you gain confidence in your policies.
        </p>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Use Safe mode initially, then move to Balanced once you've validated your rules in Staging.
        </p>
      </div>
    </div>
  );
};

export default GovernanceRules;
