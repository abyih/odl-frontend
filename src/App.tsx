import { Routes, Route } from 'react-router-dom';
import { ThemeContext } from '@/contexts/theme-context';
import { useTheme } from '@/hooks/use-theme';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import DashboardPage from '@/pages/dashboard';
import TopologyPage from '@/pages/topology';
import NodesPage from '@/pages/nodes';
import FlowsPage from '@/pages/flows';
import StatisticsPage from '@/pages/statistics';
import SettingsPage from '@/pages/settings';
import AnomaliesPage from '@/pages/anomalies';
import DdosPage from '@/pages/ddos';

function App() {
  const themeState = useTheme();

  return (
    <ThemeContext.Provider value={themeState}>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/topology" element={<TopologyPage />} />
          <Route path="/nodes" element={<NodesPage />} />
          <Route path="/flows" element={<FlowsPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/anomalies" element={<AnomaliesPage />} />
          <Route path="/ddos" element={<DdosPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </ThemeContext.Provider>
  );
}

export default App;
