import React, { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, AlertCircle, Zap, RotateCw, Shield } from 'lucide-react';
import { api } from '../lib/api';

interface AutomationStatus {
  enabled: boolean;
  mode: 'safe' | 'balanced' | 'aggressive';
  services: {
    autoApproval: { enabled: boolean; rulesCount: number };
    alertAcknowledgment: { enabled: boolean; rulesCount: number };
    testVerification: { enabled: boolean; rulesCount: number };
    healing: { enabled: boolean; strategiesCount: number };
    rollback: { enabled: boolean; strategiesCount: number };
  };
  metrics: {
    autoApprovalsExecuted: number;
    alertsAutoAcknowledged: number;
    testVerificationsRun: number;
    healingStrategiesTriggered: number;
    rolbacksExecuted: number;
  };
}

interface Rule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export const Automation: React.FC = () => {
  const [status, setStatus] = useState<AutomationStatus | null>(null);
  const [mode, setMode] = useState<'safe' | 'balanced' | 'aggressive'>('balanced');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoApprovalRules, setAutoApprovalRules] = useState<Rule[]>([]);
  const [alertRules, setAlertRules] = useState<Rule[]>([]);
  const [healingStrategies, setHealingStrategies] = useState<Rule[]>([]);
  const [rollbackStrategies, setRollbackStrategies] = useState<Rule[]>([]);

  useEffect(() => {
    loadAutomationData();
  }, []);

  const loadAutomationData = async () => {
    try {
      setLoading(true);
      const [statusData, approvalsData, alertsData, healingData, rollbackData] = await Promise.all([
        api.getAutomationStatus(),
        api.getAutoApprovalRules(),
        api.getAlertAcknowledgmentRules(),
        api.getHealingStrategies(),
        api.getRollbackStrategies(),
      ]);

      setStatus(statusData);
      setMode(statusData.mode);
      setAutoApprovalRules(approvalsData.rules || []);
      setAlertRules(alertsData.rules || []);
      setHealingStrategies(healingData.strategies || []);
      setRollbackStrategies(rollbackData.strategies || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load automation status');
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = async (newMode: 'safe' | 'balanced' | 'aggressive') => {
    try {
      await api.setAutomationMode(newMode);
      setMode(newMode);
    } catch (err: any) {
      setError('Failed to update automation mode');
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading automation status...</div>;
  }

  if (error) {
    return <div style={{ padding: '2rem', color: 'var(--text-danger)' }}>{error}</div>;
  }

  if (!status) {
    return <div style={{ padding: '2rem' }}>No automation status available</div>;
  }

  // Prepare metrics for charts
  const metricsData = [
    { name: 'Auto-Approvals', value: status.metrics.autoApprovalsExecuted },
    { name: 'Alerts Ack\'d', value: status.metrics.alertsAutoAcknowledged },
    { name: 'Tests Run', value: status.metrics.testVerificationsRun },
    { name: 'Healing', value: status.metrics.healingStrategiesTriggered },
    { name: 'Rollbacks', value: status.metrics.rolbacksExecuted },
  ];

  const servicesData = [
    { name: 'Auto-Approval', count: status.services.autoApproval.rulesCount, enabled: status.services.autoApproval.enabled },
    { name: 'Alert Ack', count: status.services.alertAcknowledgment.rulesCount, enabled: status.services.alertAcknowledgment.enabled },
    { name: 'Test Verification', count: status.services.testVerification.rulesCount, enabled: status.services.testVerification.enabled },
    { name: 'Healing', count: status.services.healing.strategiesCount, enabled: status.services.healing.enabled },
    { name: 'Rollback', count: status.services.rollback.strategiesCount, enabled: status.services.rollback.enabled },
  ];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>Automation Control</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage automated governance and remediation</p>
      </div>

      {/* Mode Selector */}
      <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Automation Mode</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Choose how aggressive the automated responses should be
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {(['safe', 'balanced', 'aggressive'] as const).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${mode === m ? 'var(--accent)' : 'var(--border-color)'}`,
                background: mode === m ? 'var(--accent)' : 'transparent',
                color: mode === m ? 'white' : 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>
                {m === 'safe' && <Shield size={24} />}
                {m === 'balanced' && <Zap size={24} />}
                {m === 'aggressive' && <AlertCircle size={24} />}
              </div>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            {mode === 'safe' && '🛡️ Safe mode: Only monitoring and test verification. No auto-approvals or rollbacks.'}
            {mode === 'balanced' && '⚡ Balanced mode: Auto-acknowledgment and healing enabled. No auto-approvals or rollbacks.'}
            {mode === 'aggressive' && '🚀 Aggressive mode: All automations enabled including auto-approvals and rollbacks.'}
          </p>
        </div>
      </div>

      {/* Services Status */}
      <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>Services Status</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          {servicesData.map((service) => (
            <div
              key={service.name}
              style={{
                padding: '1rem',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                border: `1px solid var(--border-color)`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 0.25rem 0' }}>
                    {service.name}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                    {service.count} {service.count === 1 ? 'rule' : 'rules'}
                  </p>
                </div>
                <div style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  background: service.enabled ? '#10b98114' : '#9ca3af14',
                  color: service.enabled ? '#10b981' : '#9ca3af',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}>
                  {service.enabled ? '✓ Active' : '✗ Inactive'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
        {/* Execution Count */}
        <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Execution Metrics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="name" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-primary)',
                  border: `1px solid var(--border-color)`,
                  borderRadius: 'var(--radius-md)',
                }}
              />
              <Bar dataKey="value" fill="var(--accent)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Service Distribution */}
        <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Rules Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={servicesData.filter(s => s.count > 0)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, count }: { name: string; count: number }) => `${name}: ${count}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {COLORS.map((color) => (
                  <Cell key={`cell-${color}`} fill={color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rules Lists */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
        {/* Auto-Approval Rules */}
        <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Auto-Approval Rules ({autoApprovalRules.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {autoApprovalRules.slice(0, 5).map((rule) => (
              <div
                key={rule.id}
                style={{
                  padding: '0.75rem',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{rule.name}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  {rule.description}
                </div>
              </div>
            ))}
            {autoApprovalRules.length === 0 && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No rules configured</div>
            )}
          </div>
        </div>

        {/* Alert Acknowledgment Rules */}
        <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Alert Rules ({alertRules.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {alertRules.slice(0, 5).map((rule) => (
              <div
                key={rule.id}
                style={{
                  padding: '0.75rem',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{rule.name}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  {rule.description}
                </div>
              </div>
            ))}
            {alertRules.length === 0 && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No rules configured</div>
            )}
          </div>
        </div>

        {/* Healing Strategies */}
        <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Healing Strategies ({healingStrategies.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {healingStrategies.slice(0, 5).map((strategy) => (
              <div
                key={strategy.id}
                style={{
                  padding: '0.75rem',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{strategy.name}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  {strategy.description}
                </div>
              </div>
            ))}
            {healingStrategies.length === 0 && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No strategies configured</div>
            )}
          </div>
        </div>

        {/* Rollback Strategies */}
        <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Rollback Strategies ({rollbackStrategies.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {rollbackStrategies.slice(0, 5).map((strategy) => (
              <div
                key={strategy.id}
                style={{
                  padding: '0.75rem',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{strategy.name}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  {strategy.description}
                </div>
              </div>
            ))}
            {rollbackStrategies.length === 0 && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No strategies configured</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Automation;
