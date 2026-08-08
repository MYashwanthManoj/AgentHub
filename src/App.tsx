/**
 * App.tsx — Multi-page client router configuration.
 * Enterprise routing architecture (OpenRouter/Vercel style).
 *
 * Route map:
 *   /dashboard            Overview
 *   /registry             Service Registry
 *   /transactions         On-chain transactions
 *   /analytics            Usage & performance
 *   /automations          Multi-agent workflows
 *   /developer/playground API Playground (Summarizer)
 *   /developer/keys       API Keys
 *   /developer/webhooks   Webhooks
 *   /docs                 Documentation
 *   /wallet               Wallet & payments
 *   /settings             Account settings
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/Layout/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { MyServicesPage } from './pages/MyServicesPage';
import { RegistryPage } from './pages/RegistryPage';
import { AgentDetailPage } from './pages/AgentDetailPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { DeveloperKeysPage } from './pages/DeveloperKeysPage';
import { WebhooksPage } from './pages/WebhooksPage';
import { DocumentationPage } from './pages/DocumentationPage';
import { WalletPage } from './pages/WalletPage';
import { SettingsPage } from './pages/SettingsPage';
import { AutomationsPage } from './pages/AutomationsPage';

/** Default agent shown in the developer playground when no id is provided. */
export const PLAYGROUND_DEFAULT_AGENT = 'agent-summarizer-01';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public SaaS Landing Page */}
        <Route path="/landing" element={<LandingPage />} />

        {/* Enterprise App Dashboard Layout */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="marketplace" element={<MarketplacePage />} />
          <Route path="marketplace/:id" element={<AgentDetailPage />} />
          <Route path="my-services" element={<MyServicesPage />} />
          <Route path="registry" element={<RegistryPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="automations" element={<AutomationsPage />} />
          <Route path="developer/playground" element={<AgentDetailPage />} />
          <Route path="developer/playground/:id" element={<AgentDetailPage />} />
          <Route path="developer/keys" element={<DeveloperKeysPage />} />
          <Route path="developer/webhooks" element={<WebhooksPage />} />
          <Route path="docs" element={<DocumentationPage />} />
          <Route path="wallet" element={<WalletPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
