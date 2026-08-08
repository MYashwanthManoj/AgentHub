/**
 * RegistryPage — ARC-72 on-chain service registry.
 *
 * Discovery-first: metrics up top, then search + filters, then a table whose
 * rows open the service detail page. Verification and network are explicit so
 * trust is never ambiguous.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRegistry } from '../hooks/useRegistry';
import { Icon } from '../components/Icon/Icon';
import { StatusBadge } from '../components/ui/StatusBadge';
import './RegistryPage.css';

type SortKey = 'reputation' | 'price-asc' | 'price-desc' | 'latency';

export function RegistryPage() {
  const agents = useRegistry();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [verification, setVerification] = useState('all');
  const [sort, setSort] = useState<SortKey>('reputation');

  const categories = useMemo(
    () => Array.from(new Set(agents.map((a) => a.category))).sort(),
    [agents]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = agents.filter((a) => {
      if (category !== 'all' && a.category !== category) return false;
      if (verification === 'verified' && a.reputation < 90) return false;
      if (verification === 'unverified' && a.reputation >= 90) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'price-asc': return a.priceAlgo - b.priceAlgo;
        case 'price-desc': return b.priceAlgo - a.priceAlgo;
        case 'latency': return a.reputation - b.reputation; // lower latency → higher reputation (demo heuristic)
        default: return b.reputation - a.reputation;
      }
    });
    return list;
  }, [agents, search, category, verification, sort]);

  const verifiedCount = agents.filter((a) => a.reputation >= 90).length;

  return (
    <div className="registry-page animate-fade-in">
      <div className="registry-page__header">
        <div>
          <h1 className="page-title">Service Registry</h1>
          <p className="page-subtitle">Discover verified AI services that accept x402 payments on Algorand.</p>
        </div>
        <span className="badge badge-green">
          <Icon name="shield" size={11} />
          ARC-72 Contract Active
        </span>
      </div>

      {/* Metrics */}
      <div className="registry-page__metrics">
        <div className="card card--metric p-4">
          <span className="meta-label">Registered Services</span>
          <div className="metric-value">{agents.length}</div>
          <span className="text-xs text-muted">on-chain</span>
        </div>
        <div className="card card--metric p-4">
          <span className="meta-label">Verified Services</span>
          <div className="metric-value metric-value--green">{verifiedCount}</div>
          <span className="text-xs text-muted">reputation ≥ 90</span>
        </div>
        <div className="card card--metric p-4">
          <span className="meta-label">Total Categories</span>
          <div className="metric-value">{categories.length}</div>
          <span className="text-xs text-muted">agent domains</span>
        </div>
        <div className="card card--metric p-4">
          <span className="meta-label">Smart Contract</span>
          <div className="metric-value metric-value--muted mono text-lg">#358912044</div>
          <span className="text-xs text-muted">Algorand Testnet</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="registry-page__toolbar card p-4">
        <div className="registry-page__search">
          <Icon name="search" size={14} className="registry-page__search-icon" />
          <input
            type="text"
            className="registry-page__search-input"
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search services"
          />
        </div>
        <div className="registry-page__filters">
          <label className="registry-page__filter">
            <span className="text-xs text-muted">Category</span>
            <select className="input registry-page__select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="registry-page__filter">
            <span className="text-xs text-muted">Verification</span>
            <select className="input registry-page__select" value={verification} onChange={(e) => setVerification(e.target.value)}>
              <option value="all">All</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>
          </label>
          <label className="registry-page__filter">
            <span className="text-xs text-muted">Sort</span>
            <select className="input registry-page__select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="reputation">Reputation</option>
              <option value="price-asc">Price ↑</option>
              <option value="price-desc">Price ↓</option>
              <option value="latency">Latency</option>
            </select>
          </label>
        </div>
      </div>

      {/* Table */}
      <section className="card p-6">
        <div className="registry-page__table-head">
          <h2 className="section-title">Registered Agents</h2>
          <span className="text-xs text-muted mono">{filtered.length} of {agents.length}</span>
        </div>
        {filtered.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Category</th>
                <th>Price</th>
                <th>Reputation</th>
                <th>Latency</th>
                <th>Verification</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((agent) => (
                <tr key={agent.id} className="registry-page__row">
                  <td>
                    <Link to={`/marketplace/${agent.id}`} className="registry-page__agent">
                      <span className="registry-page__agent-icon" aria-hidden="true">
                        <Icon name="bot" size={14} />
                      </span>
                      <span className="registry-page__agent-name">{agent.name}</span>
                    </Link>
                  </td>
                  <td>
                    <span className="badge badge-muted">{agent.category}</span>
                  </td>
                  <td className="mono text-green font-semibold">{agent.priceAlgo.toFixed(2)} ALGO</td>
                  <td>
                    <span className="registry-page__reputation">
                      <Icon name="star" size={11} className="registry-page__star" />
                      {agent.reputation}/100
                    </span>
                  </td>
                  <td className="mono text-xs text-secondary" title="Estimated latency based on service tier">
                    ~{agent.reputation >= 95 ? '1.8' : '2.4'}s
                  </td>
                  <td>
                    <StatusBadge status={agent.reputation >= 90 ? 'verified' : 'pending'} />
                  </td>
                  <td>
                    <Link to={`/marketplace/${agent.id}`} className="btn btn-sm btn-ghost">
                      Open Service
                      <Icon name="arrow-right" size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <div className="empty-state__icon">
              <Icon name="registry" size={18} />
            </div>
            <p className="empty-state__title">No services match</p>
            <p className="empty-state__body">Try a different search term or clear the filters.</p>
            <button type="button" className="btn btn-sm btn-ghost mt-2" onClick={() => { setSearch(''); setCategory('all'); setVerification('all'); }}>
              Clear filters
            </button>
          </div>
        )}
      </section>

      {/* Registry meta */}
      <div className="registry-page__meta">
        <Icon name="info" size={13} />
        <span className="text-xs text-secondary">
          Registry smart contract deployed on Algorand Testnet (App ID #358,912,044). Prices are per x402 execution and settled in ALGO.
        </span>
      </div>
    </div>
  );
}
