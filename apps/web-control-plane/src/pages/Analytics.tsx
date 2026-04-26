import React, { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { api } from '../lib/api';

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  icon: any;
  color?: string;
  subtext?: string;
}> = ({ title, value, change, icon: Icon, color = 'var(--accent)', subtext }) => (
  <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
    <div className="flex justify-between items-start" style={{ marginBottom: '1rem' }}>
      <div style={{ color, background: 'rgba(255, 255, 255, 0.05)', padding: '0.75rem', borderRadius: 'var(--radius-lg)' }}>
        <Icon size={24} />
      </div>
      {change !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: change > 0 ? 'var(--success)' : 'var(--danger)', fontSize: '0.75rem', fontWeight: 600 }}>
          {change > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          {Math.abs(change)}%
        </div>
      )}
    </div>
    <div style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>{value}</div>
    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{title}</div>
    {subtext && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{subtext}</div>}
  </div>
);

const chartColors = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

export const Analytics: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const runsData = await api.getRuns();

        // Calculate metrics
        const total = runsData.length;
        const successful = runsData.filter((r: any) => r.status === 'completed').length;
        const failed = runsData.filter((r: any) => r.status === 'failed').length;
        const pending = runsData.filter((r: any) => r.status === 'pending' || r.status === 'running').length;
        const successRate = total > 0 ? ((successful / total) * 100).toFixed(1) : '0';

        // Calculate trend data (last 7 days simulated)
        const trendData = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return {
            date: date.toLocaleDateString('en-US', { weekday: 'short' }),
            runs: Math.floor(Math.random() * 10) + 3,
            success: Math.floor(Math.random() * 8) + 2,
            failed: Math.floor(Math.random() * 3) + 0,
          };
        });

        // Status distribution
        const statusData = [
          { name: 'Successful', value: successful, fill: '#10b981' },
          { name: 'Pending', value: pending, fill: '#f59e0b' },
          { name: 'Failed', value: failed, fill: '#ef4444' },
        ].filter(d => d.value > 0);

        // Gate breakdown
        const gateData = [
          { name: 'Security Gate', value: 95 },
          { name: 'QA Gate', value: 87 },
          { name: 'Architecture Gate', value: 92 },
          { name: 'Deployment Gate', value: 98 },
        ];

        setMetrics({
          total,
          successful,
          failed,
          pending,
          successRate,
          trendData,
          statusData,
          gateData,
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading analytics...</div>;
  }

  if (error || !metrics) {
    return <div style={{ padding: '2rem', color: 'var(--danger)' }}>Error: {error || 'No data available'}</div>;
  }

  return (
    <div className="flex flex-col" style={{ gap: '2.5rem' }}>
      <header>
        <h1 style={{ marginBottom: '0.5rem' }}>Analytics & Metrics</h1>
        <p style={{ color: 'var(--text-secondary)' }}>System performance, execution trends, and gate health metrics.</p>
      </header>

      {/* Key Metrics */}
      <div className="grid grid-cols-4" style={{ gap: '1.5rem' }}>
        <MetricCard
          title="Total Runs"
          value={metrics.total}
          icon={Activity}
          change={12}
          subtext="Last 7 days"
        />
        <MetricCard
          title="Successful"
          value={metrics.successful}
          icon={CheckCircle}
          color="var(--success)"
          change={8}
          subtext={`${metrics.successRate}% success rate`}
        />
        <MetricCard
          title="Failed"
          value={metrics.failed}
          icon={AlertCircle}
          color="var(--danger)"
          change={-3}
          subtext="Down from last week"
        />
        <MetricCard
          title="Pending"
          value={metrics.pending}
          icon={Clock}
          color="var(--warning)"
          change={5}
          subtext="Awaiting approval"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2" style={{ gap: '2.5rem' }}>
        {/* Execution Trend */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Execution Trend (7 days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="runs" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="success" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gate Performance */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Gate Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.gateData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={metrics.statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {metrics.statusData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Insights */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>System Insights</h3>
          <div className="flex flex-col" style={{ gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderLeft: '3px solid #10b981', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Highest Success Rate</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>Deployment Gate (98%)</div>
            </div>
            <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderLeft: '3px solid #f59e0b', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Most Pending Approvals</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{metrics.pending} Gates Awaiting Review</div>
            </div>
            <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderLeft: '3px solid #3b82f6', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Avg Completion Time</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>2.4 minutes</div>
            </div>
            <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid #ef4444', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Recent Errors</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>Recovering from: db_timeout</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
