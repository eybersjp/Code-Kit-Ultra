import React from 'react';
import { Copy, CheckCircle } from 'lucide-react';

const Examples: React.FC = () => {
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
      <h1 style={{ marginBottom: '1rem' }}>Examples</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Real-world examples and configurations for different use cases.
      </p>

      <section id="basic" style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Basic Setup</h2>
        <p>Minimal configuration to get started:</p>

        <CodeBlock
          code={`mode: safe\n\napprovals:\n  auto-approve:\n    - tests pass\n    - coverage >= 70%\n\nhealing:\n  scale-up:\n    trigger: cpu > 80%\n    duration: 5m\n\nrollback:\n  enabled: false`}
          id="basic-setup"
        />
      </section>

      <section id="advanced" style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Advanced Configuration</h2>
        <p>Production-ready setup with comprehensive policies:</p>

        <CodeBlock
          code={`mode: balanced\n\napprovals:\n  auto-approve:\n    - branch == \"main\"\n    - coverage >= 85%\n    - tests pass\n    - no critical vulnerabilities\n    - commits signed\n    - peer reviewed\n  \n  require-approval:\n    - database migration\n    - security policy change\n    - infrastructure change\n\nhealing:\n  scale-up:\n    trigger: cpu > 75%\n    duration: 5m\n    replicas: 2\n  \n  clear-cache:\n    trigger: cache-hit-ratio < 60%\n    ttl: 10m\n  \n  circuit-breaker:\n    trigger: p99-latency > 400ms\n    duration: 2m\n    threshold: 3% error rate\n\nrollback:\n  enabled: true\n  on-error-rate: 5%\n  on-latency-spike: 40%\n  on-availability: 99.7%\n  \n  canary:\n    enabled: true\n    traffic: 10%\n    duration: 5m\n    step: 2%\n  \n  preserve-data: true\n  notify-slack: true\n  notify-pagerduty: true\n\npolicies:\n  production:\n    environment: prod\n    rules:\n      - coverage >= 90%\n      - security-scan pass\n      - load-test success\n      - approval required\n      - deployment: canary\n  \n  staging:\n    environment: staging\n    rules:\n      - coverage >= 80%\n      - tests pass\n      - auto-approved`}
          id="advanced-setup"
        />
      </section>

      <section id="cicd" style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>CI/CD Integration</h2>

        <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>GitHub Actions</h3>
        <CodeBlock
          code={`name: Deploy with Code Kit Ultra\non:\n  push:\n    branches: [main]\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n      \n      - name: Setup Node\n        uses: actions/setup-node@v3\n        with:\n          node-version: '18'\n      \n      - name: Run tests\n        run: npm test -- --coverage\n      \n      - name: Run Code Kit Ultra\n        env:\n          CKU_TOKEN: \${{ secrets.CKU_TOKEN }}\n          CKU_PROJECT_ID: \${{ secrets.CKU_PROJECT_ID }}\n        run: |\n          npx cku evaluate \\\n            --coverage ./coverage/coverage-summary.json \\\n            --tests-passed \\\n            --environment prod`}
          id="github-actions"
          language="yaml"
        />

        <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>GitLab CI</h3>
        <CodeBlock
          code={`stages:\n  - test\n  - deploy\n\nvariables:\n  NODE_ENV: production\n\ntest:\n  stage: test\n  image: node:18\n  script:\n    - npm ci\n    - npm test -- --coverage\n  coverage: '/Coverage: (\\\\d+)%/'\n  artifacts:\n    reports:\n      coverage_report:\n        coverage_format: cobertura\n        path: coverage/cobertura-coverage.xml\n\ndeploy:\n  stage: deploy\n  image: node:18\n  script:\n    - npm ci\n    - npm run build\n    - |\n      npx cku evaluate \\\n        --coverage ./coverage/coverage-summary.json \\\n        --tests-passed \\\n        --environment prod\n  only:\n    - main\n  environment:\n    name: production`}
          id="gitlab-ci"
          language="yaml"
        />

        <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Jenkins</h3>
        <CodeBlock
          code={`pipeline {\n  agent any\n  \n  environment {\n    CKU_TOKEN = credentials('cku-token')\n    CKU_PROJECT_ID = credentials('cku-project-id')\n  }\n  \n  stages {\n    stage('Test') {\n      steps {\n        sh 'npm ci'\n        sh 'npm test -- --coverage'\n      }\n    }\n    \n    stage('Evaluate') {\n      steps {\n        sh '''\n          npx cku evaluate \\\\\n            --coverage ./coverage/coverage-summary.json \\\\\n            --tests-passed \\\\\n            --environment prod\n        '''\n      }\n    }\n    \n    stage('Deploy') {\n      when {\n        expression { currentBuild.result == null || currentBuild.result == 'SUCCESS' }\n      }\n      steps {\n        sh 'npm run deploy'\n      }\n    }\n  }\n  \n  post {\n    always {\n      junit 'test-results.xml'\n      publishHTML([\n        reportDir: 'coverage',\n        reportFiles: 'index.html',\n        reportName: 'Coverage Report'\n      ])\n    }\n  }\n}`}
          id="jenkins"
          language="groovy"
        />
      </section>

      <section id="kubernetes" style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Kubernetes Deployment</h2>
        <CodeBlock
          code={`apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: my-app\n  namespace: production\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: my-app\n  template:\n    metadata:\n      labels:\n        app: my-app\n    spec:\n      containers:\n      - name: app\n        image: my-app:v1.2.0\n        resources:\n          requests:\n            cpu: 250m\n            memory: 256Mi\n          limits:\n            cpu: 500m\n            memory: 512Mi\n        livenessProbe:\n          httpGet:\n            path: /health\n            port: 8080\n          initialDelaySeconds: 30\n          periodSeconds: 10\n        readinessProbe:\n          httpGet:\n            path: /ready\n            port: 8080\n          initialDelaySeconds: 5\n          periodSeconds: 5\n      \n      # Code Kit Ultra sidecar\n      - name: cku-agent\n        image: cku/agent:latest\n        env:\n        - name: CKU_TOKEN\n          valueFrom:\n            secretKeyRef:\n              name: cku-secret\n              key: token\n        - name: CKU_PROJECT_ID\n          valueFrom:\n            configMapKeyRef:\n              name: cku-config\n              key: project-id`}
          id="kubernetes-deployment"
          language="yaml"
        />
      </section>

      <section id="helm" style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Helm Chart Integration</h2>
        <CodeBlock
          code={`# values.yaml\napp:\n  name: my-app\n  replicas: 3\n  image:\n    repository: my-app\n    tag: v1.2.0\n\ncku:\n  enabled: true\n  token:\n    secretName: cku-secret\n    secretKey: token\n  projectId: proj_abc123\n  mode: balanced\n  \n  healing:\n    enabled: true\n    scaleUp:\n      trigger: cpu > 75%\n      duration: 5m\n  \n  rollback:\n    enabled: true\n    canary:\n      enabled: true\n      traffic: 10%`}
          id="helm-values"
          language="yaml"
        />
      </section>

      <div style={{
        padding: '1.5rem',
        background: 'rgba(59, 130, 246, 0.05)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: 'var(--radius-md)',
        marginTop: '3rem'
      }}>
        <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>More Examples Needed?</p>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Check our <a href="https://github.com/eybersjp/code-kit-ultra/tree/main/examples" style={{ color: 'var(--accent-bright)' }}>examples repository</a> for more complete, production-ready setups.
        </p>
      </div>
    </div>
  );
};

export default Examples;
