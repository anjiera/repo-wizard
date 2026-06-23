# Application Security (AppSec) Hardening Guide

This document serves as the repository's source of truth for application-level security defenses, secure HTTP headers, concurrent rate-limiting middleware, input sanitization rules, and static application security testing (SAST).

---

## 1. Secure HTTP Headers & CORS Configurations

Enforcing secure headers prevents Cross-Site Scripting (XSS), clickjacking, MIME-type sniffing, and protocol downgrades.

### 1.1 Secure Headers Specification
All web application servers must configure the following headers in response middleware:

| Header | Recommended Setting | Purpose |
| :--- | :--- | :--- |
| `Content-Security-Policy` (CSP) | `default-src 'self';` (Restrictive) | Restricts resource loading to trusted sources. |
| `Strict-Transport-Security` (HSTS)| `max-age=63072000; includeSubDomains; preload` | Forces HTTPS connection for 2 years. |
| `X-Content-Type-Options` | `nosniff` | Blocks MIME-type sniffing exploits. |
| `X-Frame-Options` | `DENY` or `SAMEORIGIN` | Protects against Clickjacking attacks. |
| `X-XSS-Protection` | `0` | Disables outdated and exploitable browser XSS filters. |
| `Referrer-Policy` | `no-referrer` or `strict-origin-when-cross-origin` | Protects privacy by omitting referrers. |

### 1.2 Node.js Express (Helmet Integration)
Use the `helmet` package to quickly apply secure headers.

```javascript
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const app = express();

// Apply secure headers middleware
app.use(helmet());

// Configure strict CORS policy
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
```

### 1.3 Python FastAPI (Secure Headers Middleware)
FastAPI provides native CORS support. Secure headers can be added via custom middleware or `secure.py`.

```python
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# Setup strict CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

# Custom Secure Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response
```

---

## 2. Rate Limiting Middleware

Rate limiting prevents Denial of Service (DoS) and brute-force password attacks on sensitive API endpoints.

### 2.1 Node.js (express-rate-limit)
```javascript
const rateLimit = require('express-rate-limit');

// Rate limit for standard API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests, please try again later.' }
});

// Stricter rate limit for authentication endpoints (e.g. login, password resets)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 failed attempts per hour
  message: { error: 'Too many login attempts, please try again in an hour.' }
});

app.use('/api/v1/', apiLimiter);
app.use('/api/v1/auth/login', authLimiter);
```

### 2.2 Python (Slowapi / Limits)
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.get("/api/v1/health")
@limiter.limit("100/minute")
async def health_check(request: Request):
    return {"status": "ok"}
```

---

## 3. Input Sanitization & Parameter Validation

Input sanitization blocks Cross-Site Scripting (XSS) and SQL Injection (SQLi) before data reaches compilers or database drivers.

### 3.1 SQL Injection Prevention Rules
- [ ] **Prepared Statements:** Never concatenate variables into SQL queries (e.g. `SELECT * FROM users WHERE id = ` + user_id). Always use parameterized placeholder queries provided by the DB driver.
- [ ] **ORM Mapping:** Rely on Object-Relational Mappers (ORMs) that auto-parameterize inputs (e.g., Prisma, SQLAlchemy, Sequelize).
- [ ] **Type Casting:** Cast inputs (e.g., parsing a string request parameter to integer using `parseInt` or `int()`) immediately upon receipt.

### 3.2 HTML Escaping & Sanitization (Node.js)
```javascript
const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Sanitize rich-text input to block inline XSS payloads
function sanitizeInput(dirtyHtml) {
  return purify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
}
```

---

## 4. Static Application Security Testing (SAST)

Integrate automated security scanning into the local development build using Semgrep.

### 4.1 Semgrep Local Configuration (`.semgrep.yaml`)
```yaml
rules:
  - id: detect-raw-sql-concatenation
    pattern-either:
      - pattern: $DB.query("..." + $VAL + "...")
      - pattern: $DB.execute("..." + $VAL + "...")
    message: "WARNING: SQL Query concatenation detected. Use parameterized queries to prevent SQL injection."
    languages:
      - javascript
      - typescript
      - python
    severity: ERROR

  - id: disable-strict-cors-wildcard
    pattern: cors({origin: '*'})
    message: "WARNING: CORS wildcard configuration detected. Restrict origins to specific domain lists."
    languages:
      - javascript
    severity: WARNING
```
Run locally using: `semgrep scan --config=.semgrep.yaml`
