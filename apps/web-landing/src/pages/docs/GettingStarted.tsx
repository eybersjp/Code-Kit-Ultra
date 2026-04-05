import React from 'react';
import { Copy, CheckCircle } from 'lucide-react';

const GettingStarted: React.FC = () => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const CodeBlock = ({ code, id, language = 'bash' }: { code: string; id: string; language?: string }) => (
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
          title="Copy code"
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
      <h1 style={{ marginBottom: '1rem' }}>Getting Started</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Get up and running with Code Kit Ultra in minutes.
      </p>

      <section id="installation" style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Installation</h2>
        <p>Install the Code Kit Ultra CLI tool for your system:</p>

        <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>macOS / Linux</h3>
        <CodeBlock code={`curl -fsSL https://cku.sh/install.sh | bash`} id="install-unix" />

        <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Windows</h3>
        <CodeBlock code={`irm https://cku.sh/install.ps1 | iex`} id="install-windows" language="powershell" />

        <p>Verify the installation:</p>
        <CodeBlock code={`cku --version\n# Output: Code Kit Ultra v1.0.0`} id="verify-install" />
      </section>

      <section id="quick-start" style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Quick Start</h2>

        <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>1. Create API Token</h3>
        <ol style={{ paddingLeft: '2rem', marginBottom: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>Sign up at <a href="https://cku.sh" style={{ color: 'var(--accent-bright)' }}>Code Kit Ultra</a></li>
          <li style={{ marginBottom: '0.5rem' }}>Go to your dashboard</li>
          <li style={{ marginBottom: '0.5rem' }}>Click "New Token" and save it securely</li>
        </ol>

        <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>2. Initialize Your Project</h3>
        <CodeBlock code={`cd your-project\ncku init --token YOUR_API_TOKEN`} id="init-project" />

        <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>3. Create a .cku File</h3>
        <CodeBlock code={`# .cku/config.yaml\nmode: balanced\n\napprovals:\n  auto-approve:\n    - coverage >= 80%\n    - tests pass\n    - no security warnings\n\nhealing:\n  scale-up:\n    trigger: cpu > 80%\n    duration: 5m\n  clear-cache:\n    trigger: p99-latency > 500ms\n    ttl: 10m\n\nrollback:\n  enabled: true\n  threshold: error-rate > 5%`} id="config-file" language="yaml" />

        <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>4. Integrate with CI/CD</h3>
        <CodeBlock code={`# .github/workflows/deploy.yml\nname: Deploy\non: [push]\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n      - name: Run Code Kit Ultra\n        env:\n          CKU_TOKEN: \${{ secrets.CKU_TOKEN }}\n        run: cku evaluate`} id="github-workflow" language="yaml" />
      </section>

      <section id="configuration" style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Configuration</h2>
        <p>Configure Code Kit Ultra for your specific needs:</p>

        <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Operation Modes</h3>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '1.5rem'
        }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-primary)' }}>Mode</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-primary)' }}>Auto-Approve</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-primary)' }}>Healing</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-primary)' }}>Rollback</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Safe</td>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>❌ No</td>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>❌ No</td>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>❌ No</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Balanced</td>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>✅ Yes</td>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>✅ Yes</td>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>⚠️ Manual</td>
            </tr>
            <tr>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Aggressive</td>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>✅ Yes</td>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>✅ Yes</td>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>✅ Automatic</td>
            </tr>
          </tbody>
        </table>

        <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Environment Variables</h3>
        <CodeBlock code={`CKU_TOKEN=your_api_token_here\nCKU_PROJECT_ID=your_project_id\nCKU_MODE=balanced\nCKU_LOG_LEVEL=info`} id="env-vars" language="bash" />
      </section>

      <div style={{
        padding: '1.5rem',
        background: 'rgba(59, 130, 246, 0.05)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: 'var(--radius-md)',
        marginTop: '3rem'
      }}>
        <p style={{ marginBottom: 0, color: 'var(--text-secondary)' }}>
          <strong>Need help?</strong> Check out the <a href="/docs/examples" style={{ color: 'var(--accent-bright)' }}>examples</a> or <a href="/docs/faq" style={{ color: 'var(--accent-bright)' }}>FAQ</a> for common questions.
        </p>
      </div>
    </div>
  );
};

export default GettingStarted;
