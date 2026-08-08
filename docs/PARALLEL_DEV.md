# Parallel Development Guide

This repo was designed so several people can work on it at the same time with
minimal conflicts. It is a small React app, but the boundaries below give clear
file ownership. Follow these conventions and merge conflicts stay rare and easy.

---

## 1. The golden rules

1. **Never create a new domain type in a feature module.** Everything shared
   goes into `src/types/index.ts`. If two people both add a type locally, the
   merge explodes; if both edit `types/index.ts`, at least the conflict is a
   single file.
2. **Components are presentational.** No business logic in JSX. All logic lives
   in `hooks/` and `services/`.
3. **One layer per direction.** `pages → components + hooks`, `hooks →
   services/data`, `services → data/types`. Never import a component into a
   service.
4. **`components/` never calls `paymentEngine` directly.** Components receive
   everything via props from `MarketplacePage`. If you need the engine, put the
   orchestration in a hook.
5. **The UI never creates ledger entries.** `useLedger.addEntry` is called only
   from `MarketplacePage` after `runFlow` resolves.

---

## 2. File ownership map (who touches what)

| Owner | Files | What they do |
| ----- | ----- | ------------ |
| **Shared core** | `src/types/index.ts`, `src/styles/global.css` | Domain contracts; design tokens. Edit only with team agreement. |
| **Flow owner** | `src/services/paymentEngine.ts`, `src/hooks/useTransactionFlow.ts`, `src/utils/crypto.ts` | x402 lifecycle + its orchestration + mock crypto. |
| **Registry owner** | `src/data/agents.ts`, `src/services/registryService.ts`, `src/services/agentRouter.ts` | Seed data, search/ranking, task routing. |
| **Marketplace UI** | `src/components/Marketplace/*`, `src/components/Header/*` | Search, seller cards, task input, header. |
| **Flow UI** | `src/components/TransactionFlow/*`, `src/components/Timeline/*` | Step timeline, result panel, multi-hop panel. |
| **Ledger** | `src/components/Ledger/*`, `src/hooks/useLedger.ts` | History table + persistence. |
| **Page glue** | `src/pages/MarketplacePage.tsx` | Owns local state; wires hooks to components. |

If you plan to touch a file owned by someone else's area, **coordinate first**
— or better, extend the existing API instead of editing its internals.

---

## 3. Suggested parallel work streams

- **A · Engine internals:** swap `paymentEngine` mocks for real `algosdk` while
  keeping the type contract (see [MIGRATION.md](MIGRATION.md)). Touches only
  `src/services/paymentEngine.ts` + optionally a new `network.ts`.
- **B · UI polish:** work in components and CSS (animation, responsive, a11y)
  without touching hooks or services.
- **C · Registry feature:** add sellers, categories, richer metadata
  (`data/agents.ts` + `registryService.ts`), or multi-seller sub-workflows.
- **D · New hook/feature area:** add a brand-new hook + panel under `hooks/` +
  `components/` and wire it via `MarketplacePage` — the classic lower-conflict
  land.

---

## 4. Git workflow

1. **Branches per workstream.** e.g. `feat/payment-engine`, `feat/card-ui`.
2. **Small commits, message = what changed.** e.g.
   `registry: add chart-agent reputation tie-breaker`.
3. **Rebase or merge upstream weekly**, then resolve. Because file ownership
   overlaps so little, most conflicts are one-line.
4. When your PR touches `src/types/index.ts`, add a note: *"contract change —
   review with Engine owner"*.

---

## 5. Commands & verification

```bash
npm install
npm run dev        # dev server (hot reload)
npm run build      # tsc + vite build — THE typecheck gate
npm run preview    # serve the built bundle
```

**Before you push:** run `npm run build`. It runs `tsc` with `strict: true`, so
it is the typecheck gate. There is no lint or test suite configured yet; if you
add one, document the command back here.

### Manual smoke checklist

1. Load the app → header shows **SIMULATED MODE**, balance `12.5000 ALGO`.
2. Type `summarize the x402 spec` → Summarizer auto-highlights, routing hint
   shows `high` confidence + matched keywords.
3. Click **▶ Run Payment Flow** → all 14 steps complete, result panel appears,
   one row lands in the ledger.
4. Refresh the page → ledger rows persist.
5. Click **⇢ Multi-Agent Workflow** → three hops complete in order; total
   settled = 0.05 + 0.08 + 0.03 = **0.1600 ALGO**.

---

## 6. Conventions (match, don't invent)

- **Imports:** path-relative everywhere (no aliases configured in
  `tsconfig.json`). Type imports use `import type { ... }`.
- **Naming:** `KebabLikeThis` for components, `camelCase` for functions,
  `CONSTANT_CASE` for seed data.
- **CSS:** project-scoped files per component (`SellerCard.css`), class names
  prefixed `seller-card__*`; global tokens live only in `global.css` `:root`.
  Do not add a new design token without agreement — prefer existing `var(--color)` values.
- **Status flow:** `pending → active → done|error` for both steps and hops; the
  `status-dot` classes carry the styling.
- **No new dependencies** unless it earns its place: the app is deliberately
  dependency-light (React + Vite + TypeScript only). Charts are rendered with
  plain CSS bars.
- **No emoji in code or comments.** The glyphs in components (◈ ⊞ ◎ etc.) are
  deliberate category icons — keep them.

---

## 7. Frequently asked

**Q: Where do I add a third graph type?**
Add a `resultType` value in `types/index.ts`, extend `ResultPanel.tsx`, extend
`paymentEngine.executeTask()` mock output. Three files, three owners — coordinate
if split.

**Q: How do I make the demo slower/faster?**
Edit the `DELAY` map in `src/services/paymentEngine.ts` (and the inline `setTimeout`
pauses in `useTransactionFlow.ts`). It's pacing, not logic.

**Q: Something shows stale state after a flow.** `MarketplacePage` calls
`resetFlow()` before `runFlow` — make sure new entry-points do the same, or the
steps array keeps stale `done` states.

**Q: Is there a real backend?** No. Everything runs client-side. Any "server"
behavior is faked inside `paymentEngine`. See `MIGRATION.md` for the real path.