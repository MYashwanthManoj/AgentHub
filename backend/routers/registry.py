"""
routers/registry.py — GET /registry
Returns the list of available seller agents.
"""

from fastapi import APIRouter
from typing import List

router = APIRouter(prefix="/registry", tags=["registry"])

# In-memory seed data — mirrors src/data/agents.ts exactly
AGENTS = [
    {
        "id": "agent-summarizer-01",
        "name": "Summarizer Agent",
        "description": "Compresses long documents into concise, accurate summaries. Ideal for research digestion and content pipelines.",
        "category": "summarizer",
        "priceAlgo": 0.05,
        "reputationScore": 97,
        "endpoint": "https://agents.example.com/summarizer",
        "walletAddress": "SUMM7X3KFAKEADDRESSALGORAND1234567890ABCDEF",
        "tags": ["summarize", "compress", "digest", "tldr", "document", "text", "brief"],
    },
    {
        "id": "agent-chart-01",
        "name": "Chart Agent",
        "description": "Transforms raw data arrays into publication-ready charts. Returns structured chart-data for rendering.",
        "category": "chart",
        "priceAlgo": 0.08,
        "reputationScore": 94,
        "endpoint": "https://agents.example.com/chart",
        "walletAddress": "CHRT7X3KFAKEADDRESSALGORAND1234567890ABCDEF",
        "tags": ["chart", "graph", "visualize", "plot", "data", "analytics", "quarterly"],
    },
    {
        "id": "agent-lookup-01",
        "name": "Lookup Agent",
        "description": "Queries structured knowledge stores and returns type-safe JSON payloads. Supports entity resolution.",
        "category": "lookup",
        "priceAlgo": 0.03,
        "reputationScore": 92,
        "endpoint": "https://agents.example.com/lookup",
        "walletAddress": "LOOK7X3KFAKEADDRESSALGORAND1234567890ABCDEF",
        "tags": ["lookup", "search", "find", "entity", "resolve", "query", "fetch"],
    },
    {
        "id": "agent-code-auditor-01",
        "name": "Code Auditor Agent",
        "description": "Scans smart contracts and TypeScript repos for security vulnerabilities, race conditions, and gas leaks.",
        "category": "auditor",
        "priceAlgo": 0.12,
        "reputationScore": 98,
        "endpoint": "https://agents.example.com/auditor",
        "walletAddress": "AUDT7X3KFAKEADDRESSALGORAND1234567890ABCDEF",
        "tags": ["audit", "code", "security", "vulnerability", "scan", "smart contract", "bug"],
    },
    {
        "id": "agent-sentiment-01",
        "name": "Sentiment Analyzer Agent",
        "description": "Performs real-time financial market sentiment analysis across news feeds and social data streams.",
        "category": "analytics",
        "priceAlgo": 0.04,
        "reputationScore": 91,
        "endpoint": "https://agents.example.com/sentiment",
        "walletAddress": "SENT7X3KFAKEADDRESSALGORAND1234567890ABCDEF",
        "tags": ["sentiment", "market", "financial", "news", "crypto", "social", "score"],
    },
    {
        "id": "agent-extractor-01",
        "name": "Data Extractor Agent",
        "description": "Parses unstructured PDFs, HTML, and invoices into strictly typed JSON schemas with 99.9% accuracy.",
        "category": "extractor",
        "priceAlgo": 0.06,
        "reputationScore": 95,
        "endpoint": "https://agents.example.com/extractor",
        "walletAddress": "EXTR7X3KFAKEADDRESSALGORAND1234567890ABCDEF",
        "tags": ["extract", "pdf", "parser", "ocr", "invoice", "json", "data"],
    },
    {
        "id": "agent-security-01",
        "name": "Security Sentinel Agent",
        "description": "Monitors Algorand smart contracts for abnormal transaction spikes, exploit patterns, and wallet drains.",
        "category": "security",
        "priceAlgo": 0.15,
        "reputationScore": 99,
        "endpoint": "https://agents.example.com/security",
        "walletAddress": "SECU7X3KFAKEADDRESSALGORAND1234567890ABCDEF",
        "tags": ["security", "sentinel", "algorand", "monitor", "drain", "exploit", "alert"],
    },
    {
        "id": "agent-translator-01",
        "name": "Language Translator Agent",
        "description": "Provides high-speed neural translation across 50+ languages with technical domain term preservation.",
        "category": "translator",
        "priceAlgo": 0.05,
        "reputationScore": 93,
        "endpoint": "https://agents.example.com/translator",
        "walletAddress": "TRNS7X3KFAKEADDRESSALGORAND1234567890ABCDEF",
        "tags": ["translate", "language", "locale", "multilingual", "spanish", "japanese"],
    },
    {
        "id": "agent-image-01",
        "name": "Image Generator Agent",
        "description": "Generates high-quality AI images from text prompts using diffusion models. Instant visual output, pay-per-image via x402.",
        "category": "image",
        "priceAlgo": 0.10,
        "reputationScore": 96,
        "endpoint": "https://image.pollinations.ai/prompt",
        "walletAddress": "IMGN7X3KFAKEADDRESSALGORAND1234567890ABCDEF",
        "tags": ["image", "generate", "picture", "photo", "art", "draw", "visual", "diffusion"],
    },
    {
        "id": "agent-researcher-01",
        "name": "Research Orchestrator Agent",
        "description": "Fetches real Wikipedia knowledge on any topic, then autonomously hires a Summarizer Agent via x402 to distill and structure the findings.",
        "category": "researcher",
        "priceAlgo": 0.12,
        "reputationScore": 97,
        "endpoint": "https://en.wikipedia.org/w/api.php",
        "walletAddress": "RSCH7X3KFAKEADDRESSALGORAND1234567890ABCDEF",
        "tags": ["research", "wikipedia", "topic", "information", "knowledge", "study", "explain"],
    },
    {
        "id": "agent-market-01",
        "name": "Market Intelligence Agent",
        "description": "Fetches live crypto prices (ALGO, BTC, ETH, SOL) from CoinGecko, then hires a Chart Agent via x402 to visualize market trends.",
        "category": "market",
        "priceAlgo": 0.09,
        "reputationScore": 95,
        "endpoint": "https://api.coingecko.com/api/v3/simple/price",
        "walletAddress": "MRKT7X3KFAKEADDRESSALGORAND1234567890ABCDEF",
        "tags": ["crypto", "price", "market", "algo", "bitcoin", "ethereum", "solana", "trading"],
    },
    {
        "id": "agent-qr-01",
        "name": "QR Code Generator Agent",
        "description": "Converts any URL, wallet address, or text into a scannable QR code image instantly. Free, instant, pay-per-use via x402.",
        "category": "qr",
        "priceAlgo": 0.03,
        "reputationScore": 99,
        "endpoint": "https://api.qrserver.com/v1/create-qr-code",
        "walletAddress": "QRGEN7X3KFAKEADDRESSALGORAND1234567890ABCDE",
        "tags": ["qr", "code", "scan", "barcode", "url", "wallet", "link", "generate"],
    },
    {
        "id": "agent-weather-01",
        "name": "Weather Intelligence Agent",
        "description": "Fetches live weather conditions for any city worldwide. Temperature, humidity, wind speed, and forecast.",
        "category": "weather",
        "priceAlgo": 0.02,
        "reputationScore": 94,
        "endpoint": "https://wttr.in",
        "walletAddress": "WTHR7X3KFAKEADDRESSALGORAND1234567890ABCDE",
        "tags": ["weather", "temperature", "rain", "forecast", "city", "climate", "wind", "humidity"],
    },
]


@router.get("/", response_model=List[dict])
async def get_registry():
    """Return all registered seller agents."""
    return AGENTS


@router.get("/categories")
async def get_registry_categories():
    """Return all unique categories with the count of agents in each."""
    counts: dict = {}
    for agent in AGENTS:
        category = agent["category"]
        counts[category] = counts.get(category, 0) + 1
    return counts


@router.get("/{agent_id}", response_model=dict)
async def get_agent(agent_id: str):
    """Return a specific agent by ID."""
    agent = next((a for a in AGENTS if a["id"] == agent_id), None)
    if not agent:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    return agent
