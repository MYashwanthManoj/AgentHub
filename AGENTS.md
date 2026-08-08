# AgentHub Agent Catalog

AgentHub's stable registry ships with 11 priced seller services. Every service participates in the same x402 contract:

1. Send `{ "task": "...", "buyer_address": "..." }` to the agent's `/call` endpoint.
2. Receive HTTP `402 Payment Required` with the ALGO amount, receiver, note, network, and session ID.
3. Settle and verify the payment.
4. Send `{ "seller_id": "...", "task": "...", "tx_hash": "..." }` to the `/execute` endpoint.
5. Receive HTTP `200` with the typed agent result.

Use `http://localhost:8000` as `API_BASE_URL` locally or the deployed Render API URL in production.

> The samples below illustrate each service contract. The current backend has specialized local executors for Summarizer, Chart, and Lookup; the frontend adds live Image, Research, and Market integrations; other categories use deterministic demo-safe output until their production provider adapter is connected.

> The frontend currently also contains experimental QR Code Generator and Weather Intelligence entries. They are client-side integrations and are intentionally outside this requested 11-agent, registry-backed catalog until matching backend/ARC records are added.

## Registry at a Glance

| Agent | ID | Category | Price | Declared service endpoint |
|---|---|---|---:|---|
| Summarizer Agent | `agent-summarizer-01` | `summarizer` | 0.05 ALGO | `https://agents.example.com/summarizer/v1` |
| Chart Agent | `agent-chart-01` | `chart` | 0.08 ALGO | `https://agents.example.com/chart/v1` |
| Lookup Agent | `agent-lookup-01` | `lookup` | 0.03 ALGO | `https://agents.example.com/lookup/v1` |
| Code Auditor Agent | `agent-code-auditor-01` | `auditor` | 0.12 ALGO | `https://agents.example.com/auditor/v1` |
| Sentiment Analyzer Agent | `agent-sentiment-01` | `analytics` | 0.04 ALGO | `https://agents.example.com/sentiment/v1` |
| Data Extractor Agent | `agent-extractor-01` | `extractor` | 0.06 ALGO | `https://agents.example.com/extractor/v1` |
| Security Sentinel Agent | `agent-security-01` | `security` | 0.15 ALGO | `https://agents.example.com/security/v1` |
| Language Translator Agent | `agent-translator-01` | `translator` | 0.05 ALGO | `https://agents.example.com/translator/v1` |
| Image Generator Agent | `agent-image-01` | `image` | 0.10 ALGO | `https://image.pollinations.ai/prompt` |
| Research Orchestrator Agent | `agent-researcher-01` | `researcher` | 0.12 ALGO | `https://en.wikipedia.org/api/rest_v1/page/summary` |
| Market Intelligence Agent | `agent-market-01` | `market` | 0.09 ALGO | `https://api.coingecko.com/api/v3/simple/price` |

## Summarizer Agent

| Field | Value |
|---|---|
| Name | Summarizer Agent |
| ID | `agent-summarizer-01` |
| Category | `summarizer` |
| Price | `0.05 ALGO` per execution |
| x402 endpoint | `POST {API_BASE_URL}/agent/agent-summarizer-01/call` |
| Execute endpoint | `POST {API_BASE_URL}/agent/agent-summarizer-01/execute` |

### Capabilities

- Condenses long documents, specifications, and research notes.
- Preserves key entities, conclusions, and technical context.
- Uses OpenAI or Gemini when configured and a curated deterministic fallback otherwise.

### Example tasks

- `summarize the Algorand x402 payment protocol spec`
- `turn this product brief into a five-sentence executive summary`
- `produce a concise TL;DR while preserving all security requirements`

### Sample output

```text
The x402 protocol adds a payment layer to HTTP. A seller returns 402 with an
amount, recipient, and session; the buyer settles an Algorand transaction and
retries with proof. After on-chain verification, the seller returns the paid
resource. This enables autonomous, auditable machine-to-machine micropayments.
```

## Chart Agent

| Field | Value |
|---|---|
| Name | Chart Agent |
| ID | `agent-chart-01` |
| Category | `chart` |
| Price | `0.08 ALGO` per execution |
| x402 endpoint | `POST {API_BASE_URL}/agent/agent-chart-01/call` |
| Execute endpoint | `POST {API_BASE_URL}/agent/agent-chart-01/execute` |

### Capabilities

- Converts task context or numeric arrays into structured chart data.
- Produces labels and values ready for frontend visualization.
- Generates a realistic 12-month transaction-volume series in the local executor.

### Example tasks

- `chart quarterly transaction volume data`
- `visualize monthly Algorand agent calls for the last year`
- `build a bar chart comparing service spend by category`

### Sample output

```json
{
  "result_type": "chart",
  "content": "Transaction volume shows sustained month-over-month growth.",
  "chart_data": [
    { "label": "Jan", "value": 1217 },
    { "label": "Feb", "value": 1408 },
    { "label": "Mar", "value": 1661 }
  ]
}
```

## Lookup Agent

| Field | Value |
|---|---|
| Name | Lookup Agent |
| ID | `agent-lookup-01` |
| Category | `lookup` |
| Price | `0.03 ALGO` per execution |
| x402 endpoint | `POST {API_BASE_URL}/agent/agent-lookup-01/call` |
| Execute endpoint | `POST {API_BASE_URL}/agent/agent-lookup-01/execute` |

### Capabilities

- Resolves entities from structured knowledge sources.
- Returns machine-readable JSON with confidence and provenance fields.
- Provides a dedicated Algorand Foundation record plus a general lookup fallback.

### Example tasks

- `lookup Algorand Foundation entity details`
- `find verified metadata for the x402 protocol`
- `resolve this organization name and return typed JSON`

### Sample output

```json
{
  "name": "Algorand Foundation",
  "type": "Non-profit organization",
  "founded": "2019",
  "headquarters": "Singapore",
  "mission": "Support and grow the Algorand ecosystem",
  "focus_areas": ["DeFi", "RWA", "AI x Blockchain", "Carbon Markets"]
}
```

## Code Auditor Agent

| Field | Value |
|---|---|
| Name | Code Auditor Agent |
| ID | `agent-code-auditor-01` |
| Category | `auditor` |
| Price | `0.12 ALGO` per execution |
| x402 endpoint | `POST {API_BASE_URL}/agent/agent-code-auditor-01/call` |
| Execute endpoint | `POST {API_BASE_URL}/agent/agent-code-auditor-01/execute` |

### Capabilities

- Reviews smart-contract and TypeScript code for vulnerabilities.
- Flags race conditions, authorization errors, unsafe assumptions, and gas/fee inefficiencies.
- Produces prioritized findings with severity and remediation guidance.

### Example tasks

- `audit this Algorand payment contract for replay attacks`
- `scan a TypeScript agent wallet for secret leakage`
- `review this x402 verifier for missing amount and receiver checks`

### Sample output

```text
Audit complete: 1 high, 2 medium, 1 low finding.
HIGH — payment proofs are not atomically marked as consumed, enabling replay.
MEDIUM — execute does not require a verified session; enforce quote ownership.
Recommendation — validate receiver, amount, network, expiry, and session note.
```

## Sentiment Analyzer Agent

| Field | Value |
|---|---|
| Name | Sentiment Analyzer Agent |
| ID | `agent-sentiment-01` |
| Category | `analytics` |
| Price | `0.04 ALGO` per execution |
| x402 endpoint | `POST {API_BASE_URL}/agent/agent-sentiment-01/call` |
| Execute endpoint | `POST {API_BASE_URL}/agent/agent-sentiment-01/execute` |

### Capabilities

- Scores financial and crypto narratives as positive, neutral, or negative.
- Summarizes the strongest supporting signals and uncertainty.
- Acts as a downstream service in the Market Intelligence workflow.

### Example tasks

- `score today's Algorand market sentiment`
- `compare social sentiment for ALGO, BTC, and ETH`
- `identify whether this news set is risk-on or risk-off`

### Sample output

```json
{
  "sentiment": "positive",
  "score": 0.71,
  "confidence": 0.86,
  "signals": ["developer activity", "24h price momentum", "ecosystem announcements"]
}
```

## Data Extractor Agent

| Field | Value |
|---|---|
| Name | Data Extractor Agent |
| ID | `agent-extractor-01` |
| Category | `extractor` |
| Price | `0.06 ALGO` per execution |
| x402 endpoint | `POST {API_BASE_URL}/agent/agent-extractor-01/call` |
| Execute endpoint | `POST {API_BASE_URL}/agent/agent-extractor-01/execute` |

### Capabilities

- Extracts fields from PDFs, HTML, invoices, receipts, and unstructured text.
- Maps values into a caller-provided typed schema.
- Reports missing/ambiguous fields instead of silently inventing values.

### Example tasks

- `extract vendor, invoice number, date, and total from this invoice`
- `convert this HTML pricing table into JSON`
- `parse the attached document into the supplied customer schema`

### Sample output

```json
{
  "document_type": "invoice",
  "vendor": "Example Labs",
  "invoice_number": "INV-2042",
  "currency": "USD",
  "total": 1840.50,
  "confidence": 0.992
}
```

## Security Sentinel Agent

| Field | Value |
|---|---|
| Name | Security Sentinel Agent |
| ID | `agent-security-01` |
| Category | `security` |
| Price | `0.15 ALGO` per execution |
| x402 endpoint | `POST {API_BASE_URL}/agent/agent-security-01/call` |
| Execute endpoint | `POST {API_BASE_URL}/agent/agent-security-01/execute` |

### Capabilities

- Monitors Algorand accounts and applications for abnormal transaction behavior.
- Detects wallet drains, exploit signatures, burst traffic, and unusual value flows.
- Produces severity-ranked alerts suitable for automated response workflows.

### Example tasks

- `monitor App ID 358912044 for abnormal transaction spikes`
- `detect possible wallet-drain behavior for this Testnet address`
- `alert when payment failures exceed the normal baseline`

### Sample output

```text
Status: ALERT · Severity: high
Observed a 6.8× transaction-rate increase and repeated transfers to a new
receiver within two rounds. Recommended action: pause paid execution, rotate
the signer policy, and inspect the flagged transaction group.
```

## Language Translator Agent

| Field | Value |
|---|---|
| Name | Language Translator Agent |
| ID | `agent-translator-01` |
| Category | `translator` |
| Price | `0.05 ALGO` per execution |
| x402 endpoint | `POST {API_BASE_URL}/agent/agent-translator-01/call` |
| Execute endpoint | `POST {API_BASE_URL}/agent/agent-translator-01/execute` |

### Capabilities

- Translates across 50+ languages.
- Preserves blockchain, finance, and software terminology.
- Can return translated text plus terminology notes and confidence.

### Example tasks

- `translate this x402 quickstart into Japanese`
- `localize this Algorand wallet warning for Spanish users`
- `translate the API response while preserving JSON field names`

### Sample output

```text
HTTP 402 Payment Required → HTTP 402 支払いが必要です
Algorand Testnet → Algorand テストネット

Translated text preserves protocol names, endpoint paths, and code identifiers.
```

## Image Generator Agent

| Field | Value |
|---|---|
| Name | Image Generator Agent |
| ID | `agent-image-01` |
| Category | `image` |
| Price | `0.10 ALGO` per execution |
| x402 endpoint | `POST {API_BASE_URL}/agent/agent-image-01/call` |
| Execute endpoint | `POST {API_BASE_URL}/agent/agent-image-01/execute` |

### Capabilities

- Converts a natural-language prompt into a generated raster image.
- Supports deterministic seeds and fixed demo dimensions.
- Returns a directly renderable Pollinations image URL in the frontend integration.

### Example tasks

- `generate a neon marketplace where AI agents trade services on Algorand`
- `create a clean hero image for an x402 developer platform`
- `draw an autonomous robot paying another robot with a blockchain receipt`

### Sample output

```json
{
  "result_type": "image",
  "content": "https://image.pollinations.ai/prompt/neon%20AI%20agent%20marketplace?width=512&height=512&seed=402&nologo=true"
}
```

## Research Orchestrator Agent

| Field | Value |
|---|---|
| Name | Research Orchestrator Agent |
| ID | `agent-researcher-01` |
| Category | `researcher` |
| Price | `0.12 ALGO` per execution |
| x402 endpoint | `POST {API_BASE_URL}/agent/agent-researcher-01/call` |
| Execute endpoint | `POST {API_BASE_URL}/agent/agent-researcher-01/execute` |

### Capabilities

- Finds live Wikipedia knowledge for an arbitrary topic.
- Extracts a clean introductory research passage.
- Demonstrates AI-to-AI orchestration by hiring the Summarizer Agent for `0.05 ALGO`.

### Example tasks

- `research Algorand consensus and explain it simply`
- `give me a concise report on machine-to-machine payments`
- `research HTTP 402 and summarize its history`

### Sample output

```text
📚 Research Result: “Algorand”

Algorand is a decentralized blockchain platform designed to achieve security,
scalability, and decentralization through a pure proof-of-stake protocol...

Orchestration log:
1. Research Agent fetched Wikipedia data.
2. Hired Summarizer Agent — paid 0.05 ALGO via x402.
3. Final report compiled and delivered.
Total cost: 0.17 ALGO · Source: Wikipedia API
```

## Market Intelligence Agent

| Field | Value |
|---|---|
| Name | Market Intelligence Agent |
| ID | `agent-market-01` |
| Category | `market` |
| Price | `0.09 ALGO` per execution |
| x402 endpoint | `POST {API_BASE_URL}/agent/agent-market-01/call` |
| Execute endpoint | `POST {API_BASE_URL}/agent/agent-market-01/execute` |

### Capabilities

- Fetches live USD prices and 24-hour changes for ALGO, BTC, ETH, and SOL.
- Formats a compact market dashboard for machine or human consumption.
- Demonstrates orchestration by hiring Chart (`0.08`) and Sentiment (`0.04`) agents.

### Example tasks

- `show live prices for ALGO, BTC, ETH, and SOL`
- `analyze today's crypto market and visualize the trend`
- `compare Algorand momentum with Bitcoin and Ethereum`

### Sample output

```text
📊 Live Crypto Market Prices
─────────────────────────────
Algorand (ALGO)  $0.18     ▲ 2.30% (24h)
Bitcoin  (BTC)   $67,420   ▼ 1.10% (24h)
Ethereum (ETH)   $3,540    ▲ 0.80% (24h)
Solana    (SOL)  $145.00   ▲ 1.50% (24h)

AI-to-AI orchestration:
Market Agent → Chart Agent (0.08 ALGO) → Sentiment Agent (0.04 ALGO)
Total paid by AI: 0.21 ALGO · Source: CoinGecko
```

## Common x402 Request

```bash
curl -i -X POST "http://localhost:8000/agent/agent-summarizer-01/call" \
  -H "Content-Type: application/json" \
  -d '{
    "task": "summarize the Algorand x402 payment protocol spec",
    "buyer_address": "YOUR_ALGORAND_TESTNET_ADDRESS"
  }'
```

Expected challenge shape:

```json
{
  "status": 402,
  "error": "Payment Required",
  "x402": {
    "amount_algo": 0.05,
    "receiver": "SELLER_TESTNET_ADDRESS",
    "note": "AgentHub payment | agent=agent-summarizer-01 | session=<uuid>",
    "session_id": "<uuid>",
    "network": "testnet"
  }
}
```

After payment verification:

```bash
curl -X POST "http://localhost:8000/agent/agent-summarizer-01/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "seller_id": "agent-summarizer-01",
    "task": "summarize the Algorand x402 payment protocol spec",
    "tx_hash": "CONFIRMED_ALGORAND_TRANSACTION_ID"
  }'
```

The complete API surface and protocol sequence are documented in [README.md](README.md) and [ARCHITECTURE.md](ARCHITECTURE.md).
