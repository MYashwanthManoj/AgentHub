/**
 * SidebarNav — hierarchical enterprise navigation.
 *
 * Information architecture:
 *   OVERVIEW
 *   OPERATIONS   Registry · Transactions · Analytics
 *   AUTOMATION   Automations
 *   DEVELOPER    API Playground · API Keys · Webhooks · Documentation
 *   ACCOUNT      Wallet · Settings
 *
 * Active items get a green left indicator, green-dim background, white text
 * and a green icon. Inactive items are muted gray. Icons are stroke-based
 * (see Icon component) — no emoji.
 */

import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from '../Icon/Icon';
import './SidebarNav.css';

interface SidebarNavProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'OVERVIEW',
    items: [{ path: '/dashboard', label: 'Overview', icon: 'overview' }],
  },
  {
    title: 'OPERATIONS',
    items: [
      { path: '/registry', label: 'Registry', icon: 'registry' },
      { path: '/transactions', label: 'Transactions', icon: 'transactions' },
      { path: '/analytics', label: 'Analytics', icon: 'analytics' },
    ],
  },
  {
    title: 'AUTOMATION',
    items: [{ path: '/automations', label: 'Automations', icon: 'automations' }],
  },
  {
    title: 'DEVELOPER',
    items: [
      { path: '/developer/playground', label: 'API Playground', icon: 'playground' },
      { path: '/developer/keys', label: 'API Keys', icon: 'keys' },
      { path: '/developer/webhooks', label: 'Webhooks', icon: 'webhooks' },
      { path: '/docs', label: 'Documentation', icon: 'docs' },
    ],
  },
  {
    title: 'ACCOUNT',
    items: [
      { path: '/wallet', label: 'Wallet', icon: 'wallet' },
      { path: '/settings', label: 'Settings', icon: 'settings' },
    ],
  },
];

export function SidebarNav({ collapsed = false, onToggleCollapse, onNavigate }: SidebarNavProps) {
  return (
    <aside className={`sidebar-nav ${collapsed ? 'sidebar-nav--collapsed' : ''}`}>
      {/* Brand logo */}
      <div className="sidebar-nav__brand">
        <NavLink to="/dashboard" className="sidebar-nav__logo-link" onClick={onNavigate}>
          <div className="sidebar-nav__logo-icon" aria-hidden="true">
            <Icon name="hex" size={18} strokeWidth={1.8} />
          </div>
          {!collapsed && (
            <div className="sidebar-nav__brand-text">
              <span className="sidebar-nav__brand-title">AgentHub</span>
              <span className="sidebar-nav__brand-tag">x402 · Algorand</span>
            </div>
          )}
        </NavLink>
        <button
          type="button"
          className="sidebar-nav__collapse-btn btn btn-ghost btn-sm"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={14} />
        </button>
      </div>

      {/* Workspace indicator */}
      {!collapsed && (
        <div className="sidebar-nav__workspace">
          <div className="sidebar-nav__workspace-avatar" aria-hidden="true">
            <Icon name="sparkles" size={13} />
          </div>
          <div className="sidebar-nav__workspace-info">
            <span className="sidebar-nav__workspace-name">BlockHack Workspace</span>
            <span className="sidebar-nav__workspace-role">Algorand Testnet</span>
          </div>
          <Icon name="chevron-down" size={12} className="sidebar-nav__workspace-chevron" />
        </div>
      )}

      {/* Navigation groups */}
      <nav className="sidebar-nav__menu" aria-label="Primary">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="sidebar-nav__group">
            {!collapsed && <h3 className="sidebar-nav__group-title">{group.title}</h3>}
            <ul className="sidebar-nav__list">
              {group.items.map((item) => (
                <li key={item.path} className="sidebar-nav__item">
                  <NavLink
                    to={item.path}
                    end={item.path === '/dashboard'}
                    className={({ isActive }) =>
                      `sidebar-nav__link ${isActive ? 'sidebar-nav__link--active' : ''}`
                    }
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="sidebar-nav__link-icon" aria-hidden="true">
                      <Icon name={item.icon} size={18} strokeWidth={1.7} />
                    </span>
                    {!collapsed && <span className="sidebar-nav__link-label">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span className="badge badge-green sidebar-nav__badge">{item.badge}</span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom node + wallet status */}
      {!collapsed && (
        <div className="sidebar-nav__footer">
          <div className="sidebar-nav__footer-status">
            <span className="status-dot done" />
            <span className="text-xs text-secondary">x402 Node Online</span>
          </div>
          <div className="sidebar-nav__footer-wallet mono text-xs text-muted truncate">
            LRJPYUEL...5T2Q
          </div>
          <NavLink to="/wallet" className="sidebar-nav__footer-link">
            <Icon name="wallet" size={12} />
            Open Wallet
          </NavLink>
        </div>
      )}
    </aside>
  );
}
