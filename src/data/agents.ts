/**
 * Static agent registry seed data.
 *
 * This file is the single place to add / remove seller agents.
 * In Phase 2, this will be replaced by a decentralized registry query.
 */

import type { BuyerAgent, SellerAgent } from '../types';

export const SELLER_AGENTS: SellerAgent[] = [
  {
    id: 'agent-summarizer-01',
    name: 'Summarizer Agent',
    description:
      'Compresses long documents into concise, accurate summaries. Ideal for research digestion and content pipelines.',
    priceAlgo: 0.05,
    reputation: 97,
    category: 'summarizer',
    endpoint: 'https://agents.example.com/summarizer/v1',
    keywords: ['summarize', 'summary', 'compress', 'shorten', 'tldr', 'brief', 'digest', 'condense'],
  },
  {
    id: 'agent-chart-01',
    name: 'Chart Agent',
    description:
      'Transforms raw data arrays into publication-ready charts. Returns structured chart-data for rendering.',
    priceAlgo: 0.08,
    reputation: 94,
    category: 'chart',
    endpoint: 'https://agents.example.com/chart/v1',
    keywords: ['chart', 'graph', 'plot', 'visualize', 'bar', 'line', 'data', 'trend', 'visualise'],
  },
  {
    id: 'agent-lookup-01',
    name: 'Lookup Agent',
    description:
      'Queries structured knowledge stores and returns type-safe JSON payloads. Supports entity resolution.',
    priceAlgo: 0.03,
    reputation: 92,
    category: 'lookup',
    endpoint: 'https://agents.example.com/lookup/v1',
    keywords: ['lookup', 'find', 'search', 'query', 'fetch', 'retrieve', 'get', 'resolve', 'entity'],
  },
  {
    id: 'agent-code-auditor-01',
    name: 'Code Auditor Agent',
    description:
      'Scans smart contracts and TypeScript repos for security vulnerabilities, race conditions, and gas leaks.',
    priceAlgo: 0.12,
    reputation: 98,
    category: 'auditor',
    endpoint: 'https://agents.example.com/auditor/v1',
    keywords: ['audit', 'code', 'security', 'vulnerability', 'scan', 'smart contract', 'bug', 'typescript'],
  },
  {
    id: 'agent-sentiment-01',
    name: 'Sentiment Analyzer Agent',
    description:
      'Performs real-time financial market sentiment analysis across news feeds and social data streams.',
    priceAlgo: 0.04,
    reputation: 91,
    category: 'analytics',
    endpoint: 'https://agents.example.com/sentiment/v1',
    keywords: ['sentiment', 'market', 'financial', 'news', 'crypto', 'social', 'score', 'mood'],
  },
  {
    id: 'agent-extractor-01',
    name: 'Data Extractor Agent',
    description:
      'Parses unstructured PDFs, HTML, and invoices into strictly typed JSON schemas with 99.9% accuracy.',
    priceAlgo: 0.06,
    reputation: 95,
    category: 'extractor',
    endpoint: 'https://agents.example.com/extractor/v1',
    keywords: ['extract', 'pdf', 'parser', 'ocr', 'invoice', 'json', 'data', 'unstructured'],
  },
  {
    id: 'agent-security-01',
    name: 'Security Sentinel Agent',
    description:
      'Monitors Algorand smart contracts for abnormal transaction spikes, exploit patterns, and wallet drains.',
    priceAlgo: 0.15,
    reputation: 99,
    category: 'security',
    endpoint: 'https://agents.example.com/security/v1',
    keywords: ['security', 'sentinel', 'algorand', 'monitor', 'drain', 'exploit', 'alert', 'tx'],
  },
  {
    id: 'agent-translator-01',
    name: 'Language Translator Agent',
    description: 'Provides high-speed neural translation across 50+ languages with technical domain term preservation.',
    priceAlgo: 0.05,
    reputation: 93,
    category: 'translator',
    endpoint: 'https://agents.example.com/translator/v1',
    keywords: ['translate', 'language', 'locale', 'multilingual', 'spanish', 'japanese', 'chinese', 'german'],
  },
  {
    id: 'agent-image-01',
    name: 'Image Generator Agent',
    description: 'Generates high-quality AI images from text prompts using diffusion models. Instant visual output, pay-per-image via x402.',
    priceAlgo: 0.10,
    reputation: 96,
    category: 'image',
    endpoint: 'https://image.pollinations.ai/prompt',
    keywords: ['image', 'generate', 'picture', 'photo', 'art', 'draw', 'create', 'visual', 'diffusion', 'ai art'],
  },
  {
    id: 'agent-researcher-01',
    name: 'Research Orchestrator Agent',
    description: 'Fetches real Wikipedia knowledge on any topic, then autonomously hires a Summarizer Agent via x402 to distill and structure the findings.',
    priceAlgo: 0.12,
    reputation: 97,
    category: 'researcher',
    endpoint: 'https://en.wikipedia.org/api/rest_v1/page/summary',
    keywords: ['research', 'wikipedia', 'find', 'topic', 'information', 'knowledge', 'study', 'learn', 'explain'],
  },
  {
    id: 'agent-market-01',
    name: 'Market Intelligence Agent',
    description: 'Fetches live crypto prices (ALGO, BTC, ETH, SOL) from CoinGecko, then hires a Chart Agent via x402 to visualize market trends.',
    priceAlgo: 0.09,
    reputation: 95,
    category: 'market',
    endpoint: 'https://api.coingecko.com/api/v3/simple/price',
    keywords: ['crypto', 'price', 'market', 'algo', 'bitcoin', 'ethereum', 'solana', 'coin', 'trading', 'finance'],
  },
  {
    id: 'agent-qr-01',
    name: 'QR Code Generator Agent',
    description: 'Converts any URL, wallet address, or text into a scannable QR code image instantly. Free, instant, pay-per-use via x402.',
    priceAlgo: 0.03,
    reputation: 99,
    category: 'qr',
    endpoint: 'https://api.qrserver.com/v1/create-qr-code',
    keywords: ['qr', 'code', 'scan', 'barcode', 'url', 'wallet', 'link', 'generate'],
  },
  {
    id: 'agent-weather-01',
    name: 'Weather Intelligence Agent',
    description: 'Fetches live weather conditions for any city worldwide. Temperature, humidity, wind speed, and forecast.',
    priceAlgo: 0.02,
    reputation: 94,
    category: 'weather',
    endpoint: 'https://wttr.in',
    keywords: ['weather', 'temperature', 'rain', 'forecast', 'city', 'climate', 'wind', 'humidity'],
  },
];

export const BUYER_AGENT: BuyerAgent = {
  id: 'buyer-agent-01',
  name: 'Buyer Agent',
  walletAddress: 'ALGO_WALLET_7X3K9P2M4N8Q1R5T6W0Y',
  balanceAlgo: 12.5,
};

/** Quick lookup map: sellerId → SellerAgent */
export const SELLER_MAP: Record<string, SellerAgent> = Object.fromEntries(
  SELLER_AGENTS.map((a) => [a.id, a])
);
