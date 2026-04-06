import React from 'react';
import { Copy, CheckCircle, Lock } from 'lucide-react';

const ApiReference: React.FC = () => {
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

  const Endpoint = ({ method, path, description }: { method: string; path: string; description: string }) => {
    const methodColor = {
      GET: 'var(--info)',
      POST: 'var(--success)',
      DELETE: 'var(--danger)',
      PUT: 'var(--warning)',
    }[method] || 'var(--text-secondary)';

    return (
      <div style={{
        padding: '1rem',
        background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1rem',
        borderLeft: `3px solid ${methodColor}`
      }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
          <span style={{
            background: methodColor,
            color: 'white',
            padding: '0.25rem 0.5rem',
            borderRadius: '0.25rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            minWidth: '50px',
            textAlign: 'center'
          }}>
            {method}
          </span>
          <code style={{ flex: 1, color: 'var(--accent-bright)', fontFamily: 'monospace' }}>
            {path}
          </code>
        </div>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {description}
        </p>
      </div>
    );
  };

  return (
    <div>
      <h1 style={{ marginBottom: '1rem' }}>API Reference</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Complete API documentation for Code Kit Ultra.
      </p>

      <section id="authentication" style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Authentication</h2>
        <p>All API requests require an API token in the Authorization header:</p>

        <CodeBlock
          code={`curl -X GET https://api.cku.sh/v1/tokens \\\n  -H "Authorization: Bearer YOUR_API_TOKEN"`}
          id="auth-example"
        />

        <div style={{
          padding: '1.5rem',
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem'
        }}>
          <p style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={16} color="var(--danger)" />
            <strong>Security Note:</strong>
          </p>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Store your API token securely. Never commit it to version control. Use environment variables or secret management systems instead.
          </p>
        </div>
      </section>

      <section id="endpoints" style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Endpoints</h2>

        <h3 style={{ fontSize: '1.1rem', marginTop: '2rem', marginBottom: '1rem' }}>Tokens</h3>
        <Endpoint
          method="GET"
          path="/v1/tokens"
          description="List all API tokens for the authenticated user"
        />
        <Endpoint
          method="POST"
          path="/v1/tokens"
          description="Create a new API token"
        />
        <Endpoint
          method="DELETE"
          path="/v1/tokens/:id"
          description="Delete a specific API token"
        />

        <h4 style={{ fontSize: '0.95rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Create Token Request</h4>
        <CodeBlock
          code={`POST /v1/tokens\nContent-Type: application/json\n\n{\n  "name": "CI/CD Pipeline"\n}`}
          id="create-token-request"
          language="json"
        />

        <h4 style={{ fontSize: '0.95rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Create Token Response</h4>
        <CodeBlock
          code={`{\n  "token": {\n    "id": "tok_xyz123\",\n    "name": "CI/CD Pipeline\",\n    "token": "cku_prod_abc123...\",\n    "masked\": \"cku_prod_abc123***\",\n    "createdAt\": "2026-04-05T10:30:00Z\"\n  }\n}`}
          id="create-token-response"
          language="json"
        />

        <h3 style={{ fontSize: '1.1rem', marginTop: '2rem', marginBottom: '1rem' }}>Projects</h3>
        <Endpoint
          method="GET"
          path="/v1/projects"
          description="List all projects for the authenticated user"
        />
        <Endpoint
          method="POST"
          path="/v1/projects"
          description="Create a new project"
        />
        <Endpoint
          method="GET"
          path="/v1/projects/:id"
          description="Get details for a specific project"
        />

        <h4 style={{ fontSize: '0.95rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Project Object</h4>
        <CodeBlock
          code={`{\n  "id": "proj_abc123\",\n  "name\": "My Application\",\n  "status": "active\",\n  "createdAt\": "2026-04-01T08:00:00Z\",\n  "config\": {\n    "mode\": "balanced\",\n    "autoApprove\": true,\n    "healingEnabled\": true\n  }\n}`}
          id="project-object"
          language="json"
        />

        <h3 style={{ fontSize: '1.1rem', marginTop: '2rem', marginBottom: '1rem' }}>Evaluations</h3>
        <Endpoint
          method="POST"
          path="/v1/evaluations"
          description="Submit a deployment for evaluation"
        />
        <Endpoint
          method="GET"
          path="/v1/evaluations/:id"
          description="Get evaluation results"
        />

        <h4 style={{ fontSize: '0.95rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Submit Evaluation</h4>
        <CodeBlock
          code={`POST /v1/evaluations\nContent-Type: application/json\n\n{\n  "projectId\": \"proj_abc123\",\n  "version\": \"v1.2.0\",\n  "metrics\": {\n    \"coverage\": 85,\n    \"testsPassed\": true,\n    \"securityScore\": 92\n  }\n}`}
          id="eval-request"
          language="json"
        />
      </section>

      <section id="rate-limiting" style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Rate Limiting</h2>
        <p>API requests are rate limited based on your plan:</p>

        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '1.5rem'
        }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-primary)' }}>Plan</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-primary)' }}>Requests/min</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-primary)' }}>Burst</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Free</td>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>60</td>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>120</td>
            </tr>
            <tr>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Pro</td>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>1000</td>
              <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>2000</td>
            </tr>
          </tbody>
        </table>

        <p>Rate limit status is included in response headers:</p>
        <CodeBlock
          code={`X-RateLimit-Limit: 1000\nX-RateLimit-Remaining: 998\nX-RateLimit-Reset: 1649194800`}
          id="rate-limit-headers"
        />
      </section>

      <div style={{
        padding: '1.5rem',
        background: 'rgba(59, 130, 246, 0.05)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: 'var(--radius-md)',
        marginTop: '3rem'
      }}>
        <p style={{ marginBottom: 0, color: 'var(--text-secondary)' }}>
          <strong>API Endpoint:</strong> <code style={{ color: 'var(--accent-bright)' }}>https://api.cku.sh/v1</code>
        </p>
      </div>
    </div>
  );
};

export default ApiReference;
