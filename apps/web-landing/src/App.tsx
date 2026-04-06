import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth-context';
import { ProtectedRoute } from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DocsLayout from './pages/docs/DocsLayout';
import GettingStarted from './pages/docs/GettingStarted';
import ApiReference from './pages/docs/ApiReference';
import GovernanceRules from './pages/docs/GovernanceRules';
import Security from './pages/docs/Security';
import Examples from './pages/docs/Examples';
import FAQ from './pages/docs/FAQ';
import './styles/index.css';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />

          <Route path="/docs" element={<DocsLayout />}>
            <Route path="getting-started" element={<GettingStarted />} />
            <Route path="api-reference" element={<ApiReference />} />
            <Route path="governance-rules" element={<GovernanceRules />} />
            <Route path="security" element={<Security />} />
            <Route path="examples" element={<Examples />} />
            <Route path="faq" element={<FAQ />} />
            <Route index element={<Navigate to="getting-started" replace />} />
          </Route>

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
