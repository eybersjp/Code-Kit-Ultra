import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Shell } from './components/Shell';
import { Dashboard } from './pages/Dashboard';
import { Runs } from './pages/Runs';
import { RunDetail } from './pages/RunDetail';
import { Gates } from './pages/Gates';
import { Audit } from './pages/Audit';
import { Settings } from './pages/Settings';
import { Analytics } from './pages/Analytics';
import { PolicyEditor } from './pages/PolicyEditor';
import { AuditBrowser } from './pages/AuditBrowser';
import { Automation } from './pages/Automation';

import './styles/index.css';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/runs" element={<Runs />} />
          <Route path="/runs/:id" element={<RunDetail />} />
          <Route path="/gates" element={<Gates />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/policies" element={<PolicyEditor />} />
          <Route path="/audit-browser" element={<AuditBrowser />} />
          <Route path="/automation" element={<Automation />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
};

export default App;
