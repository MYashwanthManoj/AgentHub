# Agent Prompts — Development Record

Reference of the prompts used to drive each AI agent during AgentHub
development. Prompts are preserved verbatim so any contributor can re-run or
inspect them. Each prompt is recorded as a plain code block — paste it into the
matching agent to reproduce the task.

---

## 1. Claude prompt

```text
You are working on AgentHub, a React + TypeScript + Vite demo for BlockHack
2026 (Algorand x402 Track). It shows an AI buyer agent paying seller agents
through the x402 protocol: HTTP 402 challenge, Algorand payment construction,
signing, broadcast, on-chain settlement, retry with X-Payment-Receipt, and
delivery of the result.

Your task:
1. Read src/services/paymentEngine.ts and src/hooks/useTransactionFlow.ts
   and explain, in your own words, how the 8 mock engine functions map to the
   real x402 SDK / algosdk calls.
2. Review src/types/index.ts and verify the PaymentRequired,
   SignedPayment, SettlementReceipt, PaymentVerification types would survive
   a migration to the real SDK unchanged. List any that would not.
3. Do NOT write code. Produce a concise review report with a table of
   function → real-world counterpart, and flag any contract risks.
```

---

## 2. Freebuff prompt

```text
为 BlockHack 2026（Algorand x402 赛道）的 AgentHub 演示项目审查代码。
项目是 React + TypeScript + Vite 的前端 demo，展示 AI 买家代理通过 x402
协议向卖家代理付费的完整流程：HTTP 402 质询、Algorand 支付构造、签名、
广播、链上结算、带 X-Payment-Receipt 重试、获取结果。

任务：
1. 阅读 src/services/paymentEngine.ts 与 src/services/registryService.ts，
   用中文说明 7 个支付函数与 3 个注册表函数分别做什么。
2. 检查 src/data/agents.ts 中三个卖家代理（Summarizer 0.05 ALGO、
   Chart 0.08 ALGO、Lookup 0.03 ALGO）的定价与关键词是否被
   agentRouter.ts 的路由评分正确使用。
3. 不要写代码。输出中文评审报告：函数清单 + 风险点 + 改进建议。
```

---

## 3. OpenCode prompt

```text
Work through the AgentHub backlog in order. Never stop after finishing a
task; move to the next one.

BACKLOG:
1. Check if README.md exists at the project root. If missing, create it with
   title "# AgentHub — x402 Service Registry", subtitle "## BlockHack 2026 ·
   Algorand x402 Track", a short description, Quick Start (npm install /
   npm run dev), project structure tree, "How the Demo Works" numbered steps,
   a Multi-Agent Workflow explanation, a Module Map table, a Phase 2 section
   linking to docs/MIGRATION.md, and a Tech Stack list.
2. Verify docs/MIGRATION.md, docs/ARCHITECTURE.md, docs/DEMO_SCRIPT.md,
   docs/PARALLEL_DEV.md exist; create any missing files.
3. Create docs/AGENT_PROMPTS.md capturing the prompts used for Claude,
   Freebuff, OpenCode, and Codex — each formatted as a code block.
4. Create docs/JUDGING_GUIDE.md for BlockHack judges.
5. Create docs/API_REFERENCE.md covering every exported function in
   paymentEngine.ts, registryService.ts, and agentRouter.ts.
6. Review docs/MIGRATION.md: every paymentEngine function must have a real
   algosdk snippet showing the replacement.
7. Loop back to step 1. Never stop.
```

---

## 4. Codex prompt

```text
You are contributing to AgentHub, a client-only React/TypeScript demo of the
x402 payment protocol on Algorand for BlockHack 2026.

Scope of this task: implement one focused change — add a network mode
selector (simulated | testnet | mainnet) to src/App.tsx that propagates the
selected NetworkMode into the Header badge (already accepts a mode prop) and
stores the choice in localStorage so it survives refresh.

Constraints:
- No new dependencies. Use existing hooks/useLedger.ts as the persistence
  pattern reference.
- Keep components presentational: the mode state must live in App.tsx.
- Update the mode badge classes in Header.tsx only if strictly needed.
- After implementing, run `npm run build` and fix any type errors; report the
  final output and the files you changed.
```

---

## Notes for contributors

- Prompts are *development records* — if you re-run an agent with one, keep
  the result in sync with this repo's conventions ([docs/PARALLEL_DEV.md](PARALLEL_DEV.md)).
- Prompt 1 and 2 are review-only (no code writes). Prompts 3 and 4 are
  implementation tasks; prompt 3 is the working backlog used for the docs
  sweep.
- To see how agent prompts map to the code they produced, read
  [docs/ARCHITECTURE.md](ARCHITECTURE.md) and [docs/MIGRATION.md](MIGRATION.md).
