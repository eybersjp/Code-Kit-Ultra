import React, { useState } from 'react';
import { Plus, Trash2, Copy, Save, AlertCircle } from 'lucide-react';

interface PolicyRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: string;
  enabled: boolean;
}

const PolicyRuleCard: React.FC<{
  rule: PolicyRule;
  onUpdate: (rule: PolicyRule) => void;
  onDelete: (id: string) => void;
}> = ({ rule, onUpdate, onDelete }) => (
  <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)', marginBottom: '1rem' }}>
    <div className="flex justify-between items-start" style={{ marginBottom: '1rem' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <input
            type="checkbox"
            checked={rule.enabled}
            onChange={(e) => onUpdate({ ...rule, enabled: e.target.checked })}
            style={{ cursor: 'pointer' }}
          />
          <input
            type="text"
            value={rule.name}
            onChange={(e) => onUpdate({ ...rule, name: e.target.value })}
            placeholder="Policy name"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '1.125rem',
              fontWeight: 600,
              outline: 'none',
              flex: 1,
            }}
          />
        </div>
        <textarea
          value={rule.description}
          onChange={(e) => onUpdate({ ...rule, description: e.target.value })}
          placeholder="Description"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            padding: '0.5rem',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            fontSize: '0.875rem',
            marginBottom: '1rem',
            minHeight: '2.5rem',
            resize: 'vertical',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
        <button className="btn-ghost" style={{ padding: '0.5rem' }} title="Duplicate">
          <Copy size={18} />
        </button>
        <button
          className="btn-ghost"
          style={{ padding: '0.5rem', color: 'var(--danger)' }}
          onClick={() => onDelete(rule.id)}
          title="Delete"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>

    {/* Condition */}
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
        Condition
      </label>
      <textarea
        value={rule.condition}
        onChange={(e) => onUpdate({ ...rule, condition: e.target.value })}
        placeholder="e.g., deployment.environment == 'production' && deployment.riskScore > 0.7"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          padding: '0.75rem',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          fontSize: '0.875rem',
          fontFamily: 'monospace',
          minHeight: '3rem',
          resize: 'vertical',
        }}
      />
    </div>

    {/* Action */}
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
        Action
      </label>
      <select
        value={rule.action}
        onChange={(e) => onUpdate({ ...rule, action: e.target.value })}
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          padding: '0.75rem',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          fontSize: '0.875rem',
        }}
      >
        <option value="">Select action...</option>
        <option value="require_approval">Require Manual Approval</option>
        <option value="auto_approve">Auto Approve</option>
        <option value="auto_reject">Auto Reject</option>
        <option value="escalate">Escalate to Security</option>
        <option value="log_only">Log Only</option>
        <option value="create_alert">Create Alert</option>
      </select>
    </div>

    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
      Status: <span style={{ color: rule.enabled ? 'var(--success)' : 'var(--text-muted)' }}>
        {rule.enabled ? '✓ Active' : '○ Disabled'}
      </span>
    </div>
  </div>
);

export const PolicyEditor: React.FC = () => {
  const [rules, setRules] = useState<PolicyRule[]>([
    {
      id: '1',
      name: 'Require Approval for Production',
      description: 'All deployments to production must be manually approved',
      condition: 'deployment.environment == "production"',
      action: 'require_approval',
      enabled: true,
    },
    {
      id: '2',
      name: 'Auto-Approve Low-Risk Changes',
      description: 'Automatically approve changes with risk score below 0.3',
      condition: 'deployment.riskScore < 0.3 && test.coverage > 0.85',
      action: 'auto_approve',
      enabled: true,
    },
  ]);

  const addNewRule = () => {
    const newRule: PolicyRule = {
      id: Date.now().toString(),
      name: 'New Policy',
      description: '',
      condition: '',
      action: '',
      enabled: true,
    };
    setRules([...rules, newRule]);
  };

  const updateRule = (updatedRule: PolicyRule) => {
    setRules(rules.map((r) => (r.id === updatedRule.id ? updatedRule : r)));
  };

  const deleteRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
  };

  return (
    <div className="flex flex-col" style={{ gap: '2.5rem' }}>
      <header className="flex justify-between items-end">
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Policy Editor</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Define rules for automatic gate approval, escalation, and alerting.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary flex items-center" style={{ gap: '0.5rem' }}>
            <Save size={18} /> Save All
          </button>
          <button className="btn-primary flex items-center" style={{ gap: '0.5rem' }} onClick={addNewRule}>
            <Plus size={18} /> New Rule
          </button>
        </div>
      </header>

      {/* Info Box */}
      <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 'var(--radius-lg)', display: 'flex', gap: '0.75rem' }}>
        <AlertCircle size={20} style={{ color: '#3b82f6', flexShrink: 0, marginTop: '0.125rem' }} />
        <div style={{ fontSize: '0.875rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Policy Language</div>
          <p style={{ color: 'var(--text-secondary)' }}>
            Use standard JavaScript expressions. Available variables: deployment, test, security, audit, actor. Changes take effect immediately.
          </p>
        </div>
      </div>

      {/* Rules List */}
      <div>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: 600 }}>Active Policies ({rules.length})</h2>
        {rules.length === 0 ? (
          <div className="glass" style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>No policies defined. Create your first policy to get started.</p>
            <button className="btn-primary" onClick={addNewRule}>
              Create Policy
            </button>
          </div>
        ) : (
          rules.map((rule) => (
            <PolicyRuleCard key={rule.id} rule={rule} onUpdate={updateRule} onDelete={deleteRule} />
          ))
        )}
      </div>

      {/* Template Suggestions */}
      <div>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: 600 }}>Policy Templates</h2>
        <div className="grid grid-cols-2" style={{ gap: '1.5rem' }}>
          {[
            {
              name: 'Require Approval for Production',
              description: 'Manual approval needed for all production deployments',
              condition: 'deployment.environment == "production"',
            },
            {
              name: 'Auto-Approve Low-Risk',
              description: 'Automatically approve when risk score is below threshold',
              condition: 'deployment.riskScore < 0.3',
            },
            {
              name: 'Escalate to Security',
              description: 'Escalate to security team when vulnerabilities detected',
              condition: 'security.vulnerabilities.length > 0',
            },
            {
              name: 'Log-Only Audit',
              description: 'Log execution without affecting approval flow',
              condition: 'true',
            },
          ].map((template, i) => (
            <div key={i} className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{template.name}</div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{template.description}</p>
              </div>
              <button
                className="btn-secondary"
                style={{ width: '100%', fontSize: '0.875rem' }}
                onClick={() => {
                  const newRule: PolicyRule = {
                    id: Date.now().toString(),
                    name: template.name,
                    description: template.description,
                    condition: template.condition,
                    action: 'require_approval',
                    enabled: true,
                  };
                  setRules([...rules, newRule]);
                }}
              >
                Use Template
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PolicyEditor;
