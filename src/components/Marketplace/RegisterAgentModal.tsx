/**
 * RegisterAgentModal — Allows developers or AI agents to register new services to ARC-72 registry.
 */

import { useState } from 'react';
import type { SellerAgent } from '../../types';
import { Icon } from '../Icon/Icon';
import './RegisterAgentModal.css';

interface RegisterAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (agent: SellerAgent) => void;
}

export function RegisterAgentModal({ isOpen, onClose, onRegister }: RegisterAgentModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('custom');
  const [priceAlgo, setPriceAlgo] = useState(0.05);
  const [endpoint, setEndpoint] = useState('');
  const [keywords, setKeywords] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !endpoint.trim()) return;

    const newAgent: SellerAgent = {
      id: `agent-custom-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || 'Custom AI Agent service registered via GitHub OAuth.',
      priceAlgo: Number(priceAlgo),
      reputation: 95,
      category,
      endpoint: endpoint.trim(),
      keywords: keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
    };

    onRegister(newAgent);
    onClose();
  };

  return (
    <div className="cmd-overlay animate-fade-in" onClick={onClose}>
      <div className="register-modal surface-glass p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 border-b border-subtle pb-3">
          <h3 className="text-lg font-bold text-primary flex items-center gap-2">
            <Icon name="bot" size={16} className="text-green" /> Register New AI Agent (ARC-72)
          </h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <Icon name="x" size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
          <div>
            <label className="text-muted block mb-1">AGENT NAME</label>
            <input
              type="text"
              className="input text-xs"
              placeholder="e.g. Code Reviewer Bot"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-muted block mb-1">DESCRIPTION</label>
            <input
              type="text"
              className="input text-xs"
              placeholder="Short summary of what your agent does..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid-2 gap-3">
            <div>
              <label className="text-muted block mb-1">PRICE (ALGO / CALL)</label>
              <input
                type="number"
                step="0.01"
                className="input mono text-xs"
                value={priceAlgo}
                onChange={(e) => setPriceAlgo(parseFloat(e.target.value) || 0.05)}
                required
              />
            </div>
            <div>
              <label className="text-muted block mb-1">CATEGORY</label>
              <select
                className="input text-xs"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="custom">Custom Agent</option>
                <option value="auditor">Code Auditor</option>
                <option value="analytics">Analytics</option>
                <option value="extractor">Data Extractor</option>
                <option value="security">Security Sentinel</option>
                <option value="translator">Translator</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-muted block mb-1">SERVICE ENDPOINT URL (x402 enabled)</label>
            <input
              type="url"
              className="input mono text-xs"
              placeholder="https://myagent.example.com/v1/execute"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-muted block mb-1">KEYWORDS (comma separated)</label>
            <input
              type="text"
              className="input text-xs"
              placeholder="code, review, security, audit"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary justify-center mt-3">
            <Icon name="registry" size={13} />
            Register Agent to Algorand Registry
          </button>
        </form>
      </div>
    </div>
  );
}
