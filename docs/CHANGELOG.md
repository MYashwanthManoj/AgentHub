# Changelog

## v1.0.0 — BlockHack 2026 Demo

### Added

- Complete x402 payment flow simulation (14 steps)
- 3-agent marketplace: Summarizer, Chart, Lookup
- Multi-hop autonomous workflow (3 hops)
- Persistent ledger via localStorage
- ExplorerStatsBar with live stats
- ModeBanner for simulated mode indicator
- useMultiHopFlow pipeline hook (decoupled from single-hop flow)
- Full docs: MIGRATION, ARCHITECTURE, DEMO_SCRIPT, API_REFERENCE, JUDGING_GUIDE, PARALLEL_DEV, AGENT_PROMPTS

### Phase 2 Roadmap

- Replace paymentEngine.ts with real algosdk
- Replace registryService.ts with ARC-72 on-chain registry
- Add wallet connection (Pera / Defly)
- Switch NetworkMode to 'testnet'
