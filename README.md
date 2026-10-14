# Educational AI Chatbot (Full-Stack Architecture)

A modern, production-grade conversational AI application built with **React 19 + Vite 8 + Tailwind CSS** on the frontend, **Python 3.12+ + FastAPI** on the backend, and powered by the **Google Gemini API** via the official `google-genai` SDK.

---

## 1. Architecture & Tech Stack

```text
Chatbot/
├── .gitignore                   # Excludes .env, virtual environments, node_modules, build outputs
├── README.md                    # System architecture and deployment manual
├── run_all_tests.py             # Root test orchestrator (Backend + Frontend + Live probes)
├── backend/
│   ├── .env.example             # Backend environment template
│   ├── .env                     # Local secrets (never committed to git)
│   ├── requirements.txt         # Pinned Python backend dependencies
│   ├── run_tests.py             # Backend unittest runner
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, security headers & error handlers
│   │   ├── api/
│   │   │   └── chat.py          # POST /api/chat routing & HTTP status mapping
│   │   ├── core/
│   │   │   ├── config.py        # Pydantic Settings environment configuration
│   │   │   ├── logging_config.py# Sensitive data filter (API key redaction)
│   │   │   └── personas.py      # Configurable system instructions & persona definitions
│   │   ├── schemas/
│   │   │   └── chat.py          # Request/response validation, length constraints
│   │   └── services/
│   │       └── gemini_service.py# Google GenAI client, sliding window context & model fallback
│   └── tests/
│       ├── test_health.py       # Health check unit tests
│       ├── test_chat_endpoint.py# Chat endpoint and error scenario test suite (21 tests)
│       └── test_live_scenarios.py# Live HTTP server verification probes
└── frontend/
    ├── .env.example             # Frontend environment template
    ├── package.json             # NPM scripts and dependencies
    ├── vite.config.js           # Vite dev proxy configuration & test runner
    ├── src/
    │   ├── App.jsx              # Application root
    │   ├── components/          # Polished, accessible UI components
    │   │   ├── ChatWindow.jsx   # Top-level layout container & modal controls
    │   │   ├── Header.jsx       # Brand, status badge, persona selector & actions
    │   │   ├── MessageList.jsx  # Scrollable message transcript container
    │   │   ├── MessageBubble.jsx# Rendered markdown bubbles with copy actions
    │   │   ├── ChatInput.jsx    # Multiline textarea with auto-resize & keyboard controls
    │   │   ├── EmptyState.jsx   # Responsive quick-prompt suggestion cards
    │   │   └── LoadingIndicator.jsx # Animated thinking indicator
    │   ├── hooks/
    │   │   └── useChat.js       # Client conversation state, retry logic & error handling
    │   ├── services/
    │   │   └── api.js           # API service with timeout, offline detection & retry support
    │   └── test/
    │       ├── chat.test.jsx    # React component integration tests (12 tests)
    │       └── responsive.test.jsx # Mobile and responsive layout tests (5 tests)
```

---

## 2. Environment Variables Specification

### Backend Variables (`backend/.env`)

| Variable | Type | Required? | Default | Description |
|---|---|:---:|---|---|
| `GEMINI_API_KEY` | String | **Yes** | *None* | Google Gemini API key from [Google AI Studio](https://aistudio.google.com/). |
| `ENVIRONMENT` | String | No | `development` | Environment mode (`development`, `staging`, `production`). In `production`, Swagger `/docs` is disabled by default. |
| `LOG_LEVEL` | String | No | `INFO` | Logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`). |
| `MODEL_NAME` | String | No | `gemini-3.5-flash-lite` | Primary Gemini model. |
| `FALLBACK_MODELS` | String | No | `gemini-3.1-flash-lite,gemini-3-flash-preview,gemini-3.8-flash` | Comma-separated list of fallback models tried on transient 503 high-demand errors. |
| `MAX_HISTORY_MESSAGES` | Integer | No | `20` | Maximum conversation turns retained in context window (sliding window safeguard). |
| `CHATBOT_PERSONA` | String | No | `default` | Default system persona (`default`, `student_tutor`, `coding_assistant`, `customer_support`, `movie_recommender`, `business_assistant`). |
| `CUSTOM_SYSTEM_INSTRUCTION`| String | No | *None* | Optional custom instruction overriding preset personas. |
| `HOST` | String | No | `127.0.0.1` | Network interface to bind (`127.0.0.1` for local dev; `0.0.0.0` for Docker/production). |
| `PORT` | Integer | No | `8000` | Port number for FastAPI. |
| `ALLOWED_ORIGINS` | String | No | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated list of allowed frontend origins for CORS. In production, set to your frontend domain. |
| `ENABLE_DOCS` | Boolean | No | `true` | When set to `false` (or when `ENVIRONMENT=production`), disables `/docs` and `/redoc`. |
| `SECURITY_HEADERS` | Boolean | No | `true` | Attaches `X-Frame-Options`, `X-Content-Type-Options`, and `X-XSS-Protection` to responses. |

> [!CAUTION]
> **Never commit `.env` to Git.** Store real production keys in your hosting platform's secret manager (e.g. AWS Secrets Manager, GCP Secret Manager, Render / Fly.io secrets).

---

### Frontend Variables (`frontend/.env`)

| Variable | Type | Required? | Default | Description |
|---|---|:---:|---|---|
| `VITE_API_BASE_URL` | String | No | `""` (Empty string) | Base URL for FastAPI backend. Leave blank in local development (handled by Vite proxy) or when frontend and backend share a reverse proxy domain. In separate-domain production setups, set to the backend origin (e.g., `https://api.mychatbot.com`). |

---

## 3. Backend Setup

### Prerequisites
- Python 3.12 or newer
- Valid Google Gemini API Key

### Installation

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create virtual environment
python -m venv venv

# 3. Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (CMD):
.\venv\Scripts\activate.bat
# Linux / macOS:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Create environment configuration
cp .env.example .env
```
Edit `backend/.env` and paste your Google Gemini API key:
```ini
GEMINI_API_KEY=AIzaSy...your_actual_key_here...
```

### Development Command
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The development server will be accessible at:
- API Base: `http://127.0.0.1:8000`
- Health Endpoint: `http://127.0.0.1:8000/health`
- Interactive Swagger: `http://127.0.0.1:8000/docs`

### Production Commands

#### Single-process production (containers / small VMs):
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips "*"
```

#### High-throughput multi-worker production:
```bash
# Using uvicorn workers
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4 --proxy-headers --forwarded-allow-ips "*"

# Or using Gunicorn process manager (Linux)
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --access-logfile -
```

---

## 4. Frontend Setup

### Prerequisites
- Node.js 18.x or newer
- npm 9.x or newer

### Installation

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Create environment configuration (optional for local dev)
cp .env.example .env
```

### Development Command
```bash
npm run dev
```
The Vite development server will be accessible at `http://localhost:5173`. Requests to `/api` and `/health` are automatically proxied to `http://127.0.0.1:8000`.

### Production Build
```bash
# Compile and optimize production bundle
npm run build
```
Production assets are compiled to `frontend/dist/`.

### Production Preview (Local Verification)
```bash
npm run preview
```

### Production Static Serving Options
1. **Nginx / Caddy / Cloud Reverse Proxy**: Serve `dist/` as static files and proxy `/api/*` and `/health` to FastAPI.
2. **Cloudflare Pages / Vercel / Netlify**: Deploy `dist/` with `VITE_API_BASE_URL=https://api.yourdomain.com`.
3. **AWS S3 + CloudFront**: Host `dist/` in an S3 bucket with CloudFront distribution.

---

## 5. Automated Testing

The project includes 40 automated tests and 9 live HTTP probes covering backend contracts, frontend components, error recovery, and mobile responsiveness.

### Run All Test Suites (One Command)
From the project root:
```powershell
.\backend\venv\Scripts\python run_all_tests.py
```

### Run Backend Tests Only
```bash
cd backend
python run_tests.py
```

### Run Frontend Tests Only
```bash
cd frontend
npm test -- --run
```

### Run Live Server Probes Only
```bash
cd backend
python tests/test_live_scenarios.py
```

---

## 6. Production Security & Resilience Measures

1. **Secret Scrubbing**: All logs pass through `SensitiveDataFilter`, which scrubs active and pattern-matched Gemini API keys (`[REDACTED_API_KEY]`).
2. **Zero Stack Trace Leaks**: Global exception handlers catch unhandled errors and return sanitized HTTP 500 error messages.
3. **Sliding Window Token Protection**: Historical turns are bounded to `MAX_HISTORY_MESSAGES` (default 20), preventing context overflow and runaway API costs.
4. **Input Length Safeguards**: Frontend textarea has `maxLength={10000}` with client pre-flight checks, and backend Pydantic schemas enforce strict length limits.
5. **Security Headers**: Standard headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`) are applied to every response.
6. **Graceful Error Recovery**: Network drops and transient API outages provide user-friendly banners with single-click **Retry** functionality.
