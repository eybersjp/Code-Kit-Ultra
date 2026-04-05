import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, RefreshCw, LogOut, Plus, Trash2, Settings } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import axios from 'axios';

interface Token {
  id: string;
  name: string;
  token: string;
  createdAt: string;
  lastUsed?: string;
  masked: string;
}

interface Project {
  id: string;
  name: string;
  createdAt: string;
  status: 'active' | 'paused';
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewToken, setShowNewToken] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [tokensRes, projectsRes] = await Promise.all([
        axios.get('/api/v1/tokens', { headers }),
        axios.get('/api/v1/projects', { headers }),
      ]);

      setTokens(tokensRes.data.tokens || []);
      setProjects(projectsRes.data.projects || []);
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  const generateToken = async () => {
    if (!tokenName.trim()) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post(
        '/api/v1/tokens',
        { name: tokenName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTokens([...tokens, response.data.token]);
      setTokenName('');
      setShowNewToken(false);
    } catch (err) {
      console.error('Failed to generate token', err);
    }
  };

  const deleteToken = async (tokenId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      await axios.delete(`/api/v1/tokens/${tokenId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTokens(tokens.filter(t => t.id !== tokenId));
    } catch (err) {
      console.error('Failed to delete token', err);
    }
  };

  const copyToClipboard = (text: string, tokenId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(tokenId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{
        padding: '1.5rem 2rem',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Welcome, {user?.name}</p>
        </div>
        <button onClick={handleLogout} className="btn btn-secondary" style={{ gap: '0.5rem' }}>
          <LogOut size={18} /> Sign Out
        </button>
      </div>

      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}>
          {[
            { label: 'Active Projects', value: projects.filter(p => p.status === 'active').length },
            { label: 'Total Tokens', value: tokens.length },
            { label: 'Member Since', value: new Date(user?.createdAt || '').toLocaleDateString() },
          ].map((stat, i) => (
            <div key={i} className="card" style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', margin: 0, marginBottom: '0.5rem' }}>
                {stat.label}
              </p>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-bright)' }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Tokens Section */}
        <section className="card" style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}>
            <h2 style={{ margin: 0 }}>API Tokens</h2>
            <button
              onClick={() => setShowNewToken(!showNewToken)}
              className="btn btn-primary"
              style={{ gap: '0.5rem' }}
            >
              <Plus size={18} /> New Token
            </button>
          </div>

          {showNewToken && (
            <div style={{
              padding: '1.5rem',
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              border: '1px solid var(--border-color)',
            }}>
              <div className="form-group">
                <label>Token Name</label>
                <input
                  type="text"
                  placeholder="e.g., CI/CD Pipeline, Local Development"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={generateToken} className="btn btn-primary">Generate Token</button>
                <button onClick={() => setShowNewToken(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </div>
          )}

          {tokens.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
              No tokens yet. Create one to get started.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {tokens.map((token) => (
                <div key={token.id} style={{
                  padding: '1rem',
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{token.name}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {token.masked}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Created {new Date(token.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => copyToClipboard(token.token, token.id)}
                      className="btn btn-secondary"
                      style={{ gap: '0.5rem' }}
                      title={copiedId === token.id ? 'Copied!' : 'Copy token'}
                    >
                      <Copy size={16} /> {copiedId === token.id ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={() => deleteToken(token.id)}
                      className="btn btn-secondary"
                      style={{ gap: '0.5rem', color: 'var(--danger)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Projects Section */}
        <section className="card">
          <h2 style={{ marginBottom: '1.5rem' }}>Your Projects</h2>
          {projects.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
              No projects yet. Initialize a new project using the CLI.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {projects.map((project) => (
                <div key={project.id} style={{
                  padding: '1rem',
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{project.name}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      Created {new Date(project.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: project.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                      color: project.status === 'active' ? 'var(--success)' : 'var(--text-muted)',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}>
                      {project.status === 'active' ? '🟢 Active' : '⚪ Paused'}
                    </span>
                    <button className="btn btn-ghost" style={{ padding: '0.5rem' }}>
                      <Settings size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
