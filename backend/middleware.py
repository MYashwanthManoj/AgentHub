"""
middleware.py — cross-cutting ASGI middleware.

RateLimitMiddleware: a per-client sliding-window limiter. Each client IP may
make at most `max_requests` requests per `window_seconds` (default 30 / 60s).
Exceeding the limit returns HTTP 429 with a `Retry-After` header (seconds until
the oldest request in the window ages out) plus `X-RateLimit-*` headers.

Client identity prefers the left-most hop in `X-Forwarded-For` (so a proxy /
Render deployment rate-limits the real caller, not the proxy), falling back to
the socket peer address.

Health, docs, and CORS preflight are exempt so uptime probes and Swagger never
trip the limit.
"""

import time
from collections import defaultdict, deque
from typing import Deque, Dict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

# Paths that must never be rate limited (uptime probes, API docs, preflight).
_EXEMPT_PREFIXES = ("/health", "/docs", "/redoc", "/openapi.json", "/ws")


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 30, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        # client_ip → deque of monotonic request timestamps within the window.
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)

    def _client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    async def dispatch(self, request: Request, call_next):
        # CORS preflight and exempt paths bypass the limiter entirely.
        if request.method == "OPTIONS" or request.url.path.startswith(_EXEMPT_PREFIXES):
            return await call_next(request)

        now = time.monotonic()
        window_start = now - self.window_seconds
        ip = self._client_ip(request)

        hits = self._hits[ip]
        while hits and hits[0] < window_start:
            hits.popleft()

        if len(hits) >= self.max_requests:
            retry_after = max(1, int(self.window_seconds - (now - hits[0])))
            return JSONResponse(
                status_code=429,
                content={
                    "status": 429,
                    "error": "Too Many Requests",
                    "detail": (
                        f"Rate limit exceeded: max {self.max_requests} requests "
                        f"per {self.window_seconds}s. Retry in {retry_after}s."
                    ),
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(self.max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(retry_after),
                },
            )

        hits.append(now)
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(self.max_requests - len(hits))
        return response
