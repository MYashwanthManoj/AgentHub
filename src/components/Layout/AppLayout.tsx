/**
 * AppLayout — Persistent Enterprise Layout with Sidebar, TopHeader, CommandPalette, and Outlet.
 * Supports a collapsible sidebar on desktop and an overlay drawer on tablet/mobile.
 */

import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useLedger } from '../../hooks/useLedger';
import { SidebarNav } from '../Navigation/SidebarNav';
import { TopHeader } from '../Navigation/TopHeader';
import { CommandPalette } from '../Navigation/CommandPalette';
import './AppLayout.css';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isCmdOpen, setIsCmdOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  // Live wallet balance for the header pill — updates the instant a purchase
  // settles (useLedger instances sync via a custom event).
  const { availableBalance } = useLedger();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <div className={`app-layout ${navOpen ? 'app-layout--nav-open' : ''}`}>
      {/* Sidebar (drawer on small screens) */}
      <SidebarNav
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onNavigate={() => setNavOpen(false)}
      />

      {/* Mobile backdrop */}
      {navOpen && (
        <button
          type="button"
          className="app-layout__backdrop"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="app-layout__content">
        <TopHeader
          onOpenCommandPalette={() => setIsCmdOpen(true)}
          onToggleNav={() => setNavOpen(!navOpen)}
          balance={availableBalance}
        />
        <main className="app-layout__main">
          <Outlet />
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette isOpen={isCmdOpen} onClose={() => setIsCmdOpen(false)} />
    </div>
  );
}
