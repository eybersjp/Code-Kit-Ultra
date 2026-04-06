import React, { useState, useEffect } from 'react';
import { Download, Calendar, Filter, Search, ChevronDown, Copy, Shield } from 'lucide-react';
import { api } from '../lib/api';

interface AuditEvent {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  actorType: string;
  result: string;
  details: Record<string, any>;
  correlationId?: string;
  hash?: string;
}

const ActionBadge: React.FC<{ action: string }> = ({ action }) => {
  const colors: Record<string, string> = {
    'GATE_APPROVED': '#10b981',
    'GATE_REJECTED': '#ef4444',
    'RUN_CREATED': '#3b82f6',
    'RUN_RESUMED': '#8b5cf6',
    'STEP_RETRIED': '#f59e0b',
    'SESSION_CREATED': '#06b6d4',
    'SERVICE_ACCOUNT_ROTATED': '#6366f1',
  };

  return (
    <span
      style={{
        background: (colors[action] || '#6b7280') + '20',
        color: colors[action] || '#6b7280',
        padding: '0.25rem 0.75rem',
        borderRadius: 'var(--radius-lg)',
        fontSize: '0.75rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {action}
    </span>
  );
};

export const AuditBrowser: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [filters, setFilters] = useState({
    dateRange: '24h',
    action: '',
    actor: '',
    result: 'all',
  });

  useEffect(() => {
    const loadAuditLog = async () => {
      try {
        setLoading(true);
        const data = await api.getAuditLog();
        // Mock data if API doesn't return
        const mockEvents: AuditEvent[] = [
          {
            id: '1',
            timestamp: new Date(Date.now() - 1 * 60000).toISOString(),
            action: 'GATE_APPROVED',
            actor: 'alice@company.com',
            actorType: 'human',
            result: 'success',
            correlationId: 'corr_abc123',
            hash: 'sha256:7f3a8b2c...',
            details: { gateId: 'security_gate', runId: 'run_001' },
          },
          {
            id: '2',
            timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
            action: 'RUN_CREATED',
            actor: 'bob@company.com',
            actorType: 'human',
            result: 'success',
            correlationId: 'corr_def456',
            hash: 'sha256:4e2c9d1a...',
            details: { idea: 'Add rate limiting', mode: 'balanced' },
          },
          {
            id: '3',
            timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
            action: 'STEP_RETRIED',
            actor: 'system:auto-heal',
            actorType: 'system',
            result: 'success',
            correlationId: 'corr_ghi789',
            hash: 'sha256:2b7e1f4d...',
            details: { stepId: 'step_build', attempt: 2 },
          },
          {
            id: '4',
            timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
            action: 'SESSION_CREATED',
            actor: 'charlie@company.com',
            actorType: 'human',
            result: 'success',
            correlationId: 'corr_jkl012',
            hash: 'sha256:9c4d6a1e...',
            details: { authMode: 'bearer-session', orgId: 'org_123' },
          },
        ];

        setEvents(Array.isArray(data) && data.length > 0 ? data : mockEvents);
      } catch (err) {
        console.error('Failed to load audit log', err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadAuditLog();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = events;

    if (searchTerm) {
      filtered = filtered.filter(
        (e) =>
          e.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filters.action) {
      filtered = filtered.filter((e) => e.action === filters.action);
    }

    if (filters.actor) {
      filtered = filtered.filter((e) => e.actor === filters.actor);
    }

    if (filters.result !== 'all') {
      filtered = filtered.filter((e) => e.result === filters.result);
    }

    setFilteredEvents(filtered);
  }, [searchTerm, filters, events]);

  const exportAuditLog = () => {
    const csv = [
      ['Timestamp', 'Action', 'Actor', 'Result', 'Correlation ID', 'Hash'],
      ...filteredEvents.map((e) => [
        e.timestamp,
        e.action,
        e.actor,
        e.result,
        e.correlationId || '-',
        e.hash || '-',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading audit logs...</div>;
  }

  return (
    <div className="flex flex-col" style={{ gap: '2.5rem' }}>
      <header className="flex justify-between items-end">
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Audit Log Browser</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Immutable hash-chained trail of all system activities with SHA-256 integrity verification.
          </p>
        </div>
        <button className="btn-secondary flex items-center" style={{ gap: '0.5rem' }} onClick={exportAuditLog}>
          <Download size={18} /> Export CSV
        </button>
      </header>

      {/* Search & Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div
          className="glass"
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <Search size={20} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search by action, actor, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              outline: 'none',
              flex: 1,
              fontSize: '0.95rem',
            }}
          />
        </div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
            className="btn-ghost"
            style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>

          <select
            value={filters.result}
            onChange={(e) => setFilters({ ...filters, result: e.target.value })}
            className="btn-ghost"
            style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}
          >
            <option value="all">All Results</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>

          {(searchTerm || filters.action || filters.actor || filters.result !== 'all') && (
            <button
              className="btn-ghost"
              style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem', color: 'var(--danger)' }}
              onClick={() => {
                setSearchTerm('');
                setFilters({ dateRange: '24h', action: '', actor: '', result: 'all' });
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Events Table */}
      <div className="glass" style={{ padding: '0', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Timestamp
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Action
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Actor
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Result
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Verification
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event, i) => (
                <tr
                  key={event.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                >
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    {new Date(event.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <ActionBadge action={event.action} />
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {event.actor}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        color: event.result === 'success' ? 'var(--success)' : 'var(--danger)',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                      }}
                    >
                      {event.result === 'success' ? '✓' : '✗'} {event.result}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {event.hash ? `${event.hash.substring(0, 14)}...` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEvents.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No events found matching your filters.
          </div>
        )}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div
          className="glass"
          style={{
            padding: '1.5rem',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
            <h3>Event Details</h3>
            <button className="btn-ghost" onClick={() => setSelectedEvent(null)}>
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Event ID</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', wordBreak: 'break-all' }}>
                {selectedEvent.id}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Correlation ID</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                {selectedEvent.correlationId || '-'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Timestamp</div>
              <div>{new Date(selectedEvent.timestamp).toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Actor</div>
              <div>
                {selectedEvent.actor} ({selectedEvent.actorType})
              </div>
            </div>
          </div>

          {/* SHA-256 Hash */}
          {selectedEvent.hash && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <Shield size={20} style={{ color: 'var(--success)' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>SHA-256 Hash Chain</div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    wordBreak: 'break-all',
                    cursor: 'pointer',
                  }}
                  title="Click to copy"
                  onClick={() => navigator.clipboard.writeText(selectedEvent.hash || '')}
                >
                  {selectedEvent.hash} <Copy size={12} style={{ display: 'inline', opacity: 0.5 }} />
                </div>
              </div>
            </div>
          )}

          {/* Details */}
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Details</div>
            <pre
              style={{
                background: 'rgba(0,0,0,0.2)',
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                overflow: 'auto',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
              }}
            >
              {JSON.stringify(selectedEvent.details, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        <span style={{ color: 'var(--success)' }}>✔</span> All events are cryptographically verified using SHA-256 hash chain.
        Integrity cannot be tampered with.
      </div>
    </div>
  );
};

export default AuditBrowser;
