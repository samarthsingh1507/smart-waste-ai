import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext';
import { AppLayout } from './components/layout/AppLayout';

import { DashboardPage } from './pages/DashboardPage';
import { LogWastePage } from './pages/LogWastePage';
import { WasteRecordsPage } from './pages/WasteRecordsPage';
import { InsightsPage } from './pages/InsightsPage';
import { PrepPlannerPage } from './pages/PrepPlannerPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="log-waste" element={<LogWastePage />} />
            <Route path="records" element={<WasteRecordsPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="prep-planner" element={<PrepPlannerPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  );
};

export default App;
