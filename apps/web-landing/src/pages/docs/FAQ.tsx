import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const FAQ: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>(null);

  const faqs = [
    {
      id: 'what-is-cku',
      question: 'What is Code Kit Ultra?',
      answer: 'Code Kit Ultra is an intelligent code governance platform that automates approval gates, healing strategies, and rollback automation for deployment pipelines. It helps teams ship faster and safer with enterprise-grade governance.'
    },
    {
      id: 'how-pricing',
      question: 'How is Code Kit Ultra priced?',
      answer: 'Code Kit Ultra is completely free to use for teams and individuals. We offer commercial support, SLAs, and enterprise features for additional cost. Visit our pricing page or contact sales for details.'
    },
    {
      id: 'token-expiry',
      question: 'Do API tokens expire?',
      answer: 'API tokens do not expire automatically, but we recommend rotating them monthly for security purposes. You can create new tokens in your dashboard and delete old ones anytime.'
    },
    {
      id: 'safe-balanced-aggressive',
      question: 'What\'s the difference between Safe, Balanced, and Aggressive modes?',
      answer: 'Safe mode monitors and tests only. Balanced mode enables auto-acknowledgment and healing. Aggressive mode enables full automation with auto-approvals and production rollbacks. Start with Safe and gradually increase as you gain confidence.'
    },
    {
      id: 'rollback-time',
      question: 'How long does a rollback take?',
      answer: 'Rollbacks typically complete within 30 seconds to 2 minutes depending on your infrastructure size and complexity. Canary deployments add 5-10 minutes for gradual traffic shifting.'
    },
    {
      id: 'multiple-projects',
      question: 'Can I have multiple projects?',
      answer: 'Yes! You can create and manage multiple projects from your dashboard. Each project has its own configuration, tokens, and evaluation history.'
    },
    {
      id: 'custom-metrics',
      question: 'Can I use custom metrics in policies?',
      answer: 'Absolutely. Code Kit Ultra supports custom metrics through our metrics API. You can submit any metric from your application and reference it in your policies.'
    },
    {
      id: 'support',
      question: 'What support options are available?',
      answer: 'Free users have access to community support via our GitHub discussions. Pro and Enterprise plans include priority email support, Slack integration, and dedicated support specialists.'
    },
    {
      id: 'self-hosted',
      question: 'Can I self-host Code Kit Ultra?',
      answer: 'Yes, Code Kit Ultra is open source. You can self-host it on your own infrastructure. Enterprise support for self-hosted deployments is available.'
    },
    {
      id: 'security-features',
      question: 'What security features does CKU have?',
      answer: 'Code Kit Ultra includes TLS 1.3 encryption in transit, AES-256 encryption at rest, SOC 2 Type II compliance, GDPR compliance, regular penetration testing, and comprehensive audit logging.'
    },
    {
      id: 'downtime-risk',
      question: 'Does Code Kit Ultra reduce deployment downtime?',
      answer: 'Yes. With automated rollbacks and canary deployments, you can catch issues early and revert quickly without manual intervention. Actual downtime is typically reduced by 70-90%.'
    },
    {
      id: 'approval-time',
      question: 'How long does approval take?',
      answer: 'Auto-approved deployments are approved within seconds. Manual approvals depend on your configuration. Average approval time is 2-5 minutes for urgent deployments.'
    },
    {
      id: 'team-collaboration',
      question: 'Does CKU support team collaboration?',
      answer: 'Yes. Code Kit Ultra includes team management, role-based access control, audit logs, comments on deployments, and Slack/Teams notifications for team coordination.'
    },
    {
      id: 'kubernetes',
      question: 'Does Code Kit Ultra work with Kubernetes?',
      answer: 'Yes! Code Kit Ultra integrates seamlessly with Kubernetes through our sidecar agent. We provide Helm charts and documentation for easy deployment.'
    },
    {
      id: 'database-migrations',
      question: 'How does CKU handle database migrations?',
      answer: 'Database migrations can be flagged as requiring approval. CKU can track migration status, validate backward compatibility, and ensure data integrity during deployments.'
    },
  ];

  const FAQItem = ({ id, question, answer }: { id: string; question: string; answer: string }) => (
    <div style={{
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      marginBottom: '1rem',
      overflow: 'hidden'
    }}>
      <button
        onClick={() => setOpenId(openId === id ? null : id)}
        style={{
          width: '100%',
          padding: '1.25rem',
          background: openId === id ? 'var(--bg-secondary)' : 'transparent',
          border: 'none',
          borderBottom: openId === id ? `1px solid var(--border-color)` : 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
        onMouseLeave={(e) => {
          if (openId !== id) e.currentTarget.style.background = 'transparent';
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--text-primary)', textAlign: 'left' }}>
          {question}
        </span>
        {openId === id ? (
          <ChevronUp size={20} style={{ color: 'var(--accent-bright)', flexShrink: 0, marginLeft: '1rem' }} />
        ) : (
          <ChevronDown size={20} style={{ color: 'var(--text-secondary)', flexShrink: 0, marginLeft: '1rem' }} />
        )}
      </button>
      {openId === id && (
        <div style={{
          padding: '1.25rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.6
        }}>
          {answer}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <h1 style={{ marginBottom: '1rem' }}>Frequently Asked Questions</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Find answers to common questions about Code Kit Ultra.
      </p>

      <div>
        {faqs.map((faq) => (
          <FAQItem key={faq.id} {...faq} />
        ))}
      </div>

      <div style={{
        marginTop: '3rem',
        padding: '1.5rem',
        background: 'rgba(59, 130, 246, 0.05)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: 'var(--radius-md)',
        textAlign: 'center'
      }}>
        <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Didn't find your answer?</p>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Open an issue on <a href="https://github.com/eybersjp/code-kit-ultra/issues" style={{ color: 'var(--accent-bright)' }}>GitHub</a> or ask in our <a href="https://github.com/eybersjp/code-kit-ultra/discussions" style={{ color: 'var(--accent-bright)' }}>community discussions</a>
        </p>
      </div>
    </div>
  );
};

export default FAQ;
