# Buddy — Financial Well-being for Students

> "We didn't change money. We changed trust."

A student financial platform where **credibility is currency**. Ask questions, share knowledge, earn trust — and the AI already knows who to believe.

**Live:** https://quackathon-2026.vercel.app

---

## Quick Start

### 1. Database Setup (Supabase)

1. Go to your [Supabase SQL Editor](https://supabase.com/dashboard/project/ewyenqtrkdzgckrncwvb/sql/new)
2. Copy and paste the entire contents of `supabase/migrations/001_initial_schema.sql`
3. Click **Run**

That's it — all tables, views, functions, triggers, and RLS policies are created.

### 2. Get Your Supabase Keys

From [Supabase Dashboard → Settings → API](https://supabase.com/dashboard/project/ewyenqtrkdzgckrncwvb/settings/api):

| Key | Where used |
|---|---|
| `anon` / `publishable` key | Frontend + backend `.env` |
| `service_role` key | Backend `.env` only — **keep secret** |
| JWT Secret | Backend `.env` only — **keep secret** |

### 3. Backend

```bash
cd backend

# Copy and fill env file
cp .env.example .env
# Edit .env — add SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET, ANTHROPIC_API_KEY

# Create virtual environment
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 4. Frontend

```bash
cd frontend

# Copy and fill env file
cp .env.example .env.local
# Edit .env.local — set NEXT_PUBLIC_API_URL

# Install dependencies
npm install

# Run
npm run dev
```

App available at: http://localhost:3000

---

## Containerization (Docker)

This project now includes a container-first setup:

- `backend/Dockerfile` for FastAPI (`uvicorn` on port `8000`)
- `frontend/Dockerfile` multi-stage build for Next.js (`next start` on port `3000`)
- `docker-compose.yml` to run both services together
- `.dockerignore` files for frontend and backend

### Prerequisites

1. Copy env templates if you haven't already:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

2. Fill required env values in:

- `backend/.env`
- `frontend/.env.local`

### Run with Docker Compose

From repository root:

```bash
docker compose up --build
```

Then open:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

### Stop services

```bash
docker compose down
```

### Production-friendly approach

1. Keep one Docker image per service (frontend/backend).
2. Build once in CI and tag images with commit SHA.
3. Push images to a container registry.
4. Deploy by updating image tag in your target environment (Render/Fly/Kubernetes/App Service/etc).
5. Inject runtime secrets from platform secret manager (never bake secrets into images).

---

## CI/CD (GitHub Actions)

This repository now includes two workflows:

- `.github/workflows/ci.yml`
    - Runs on pull requests and pushes to `main`
    - Frontend: `npm ci`, `npm run lint`, `npm run build`
    - Backend: dependency install, syntax compile check, `pip check`

- `.github/workflows/cd.yml`
    - Runs on pushes to `main` and manual dispatch
    - Executes a production quality gate (frontend build + backend syntax check)
    - Triggers deployment hooks if secrets are configured

### Required GitHub Secrets (for CD deploy triggers)

- `FRONTEND_DEPLOY_HOOK_URL` (optional)
- `BACKEND_DEPLOY_HOOK_URL` (optional)

If these secrets are not set, deploy jobs will be skipped safely, while CI still validates code quality.

---

## Vercel Deployment

The frontend deploys to Vercel automatically on push to `main`. The `vercel.json` at the repo root tells Vercel the Next.js app lives in `frontend/`.

### Required environment variables

Set these in **Vercel Dashboard → Project → Settings → Environment Variables**:

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ewyenqtrkdzgckrncwvb.supabase.co` | Public — safe to expose |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_mYH-9p1vW-PHnVwXTPtmLQ__WPCv1SZ` | Public — safe to expose |
| `ANTHROPIC_API_KEY` | from console.anthropic.com | **Secret** — powers the AI advisor |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase → Settings → API | **Secret** — needed to write AI responses to DB |
| `NEXT_PUBLIC_API_URL` | *(leave empty or omit)* | Backend not deployed; frontend falls back to demo mode |

> **Without `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY`** the AI advisor will return a 500 error on live posts (demo posts still work client-side). Without `NEXT_PUBLIC_SUPABASE_*` keys the build itself will succeed but auth and post fetching will fail at runtime.

---

## Project Structure

```
buddy/
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    ← Run this in Supabase SQL Editor
│
├── backend/                          ← FastAPI (Python)
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── core/
│   │   ├── auth.py                   ← JWT verification (Supabase tokens)
│   │   ├── config.py                 ← Settings from .env
│   │   └── database.py               ← Supabase client singletons
│   ├── routers/
│   │   ├── auth.py                   ← /auth/* — profile, onboarding
│   │   ├── posts.py                  ← /posts/* — questions
│   │   ├── answers.py                ← /answers/* — responses
│   │   ├── votes.py                  ← /votes/* — credibility-weighted voting
│   │   └── credibility.py            ← /credibility/* — scores, history, leaderboard
│   ├── services/
│   │   └── credibility_engine.py     ← Single source of truth for all cred mutations
│   └── agents/
│       └── advisor.py                ← AI Advisor Agent (Claude)
│
└── frontend/                         ← Next.js 15 (App Router)
    ├── app/
    │   ├── page.tsx                  ← Landing page
    │   ├── onboarding/page.tsx       ← 3-step onboarding wizard
    │   ├── (auth)/
    │   │   ├── login/page.tsx        ← Magic link login
    │   │   └── callback/route.ts     ← Supabase auth callback
    │   └── feed/                     ← (to be built) Question feed
    ├── components/
    │   └── CredibilityBadge.tsx      ← Score badge with tier colours
    ├── lib/
    │   ├── api.ts                    ← Typed backend API client
    │   └── supabase/
    │       ├── client.ts             ← Browser client
    │       └── server.ts             ← Server component client
    ├── middleware.ts                  ← Session refresh + route protection
    └── types/
        └── database.ts               ← TypeScript types matching DB schema
```

---

## Auth Flow

```
User enters email → Supabase sends magic link
→ User clicks link → /auth/callback route
→ Code exchanged for session → JWT stored in cookies
→ Middleware refreshes session on every request
→ Backend verifies JWT using SUPABASE_JWT_SECRET
→ Backend uses service_role key for all DB writes
```

---

## Credibility System

| Tier | Score | Badge |
|---|---|---|
| Newcomer | 0–99 | Grey |
| Learner | 100–299 | Blue |
| Contributor | 300–599 | Green |
| Trusted | 600–899 | Gold |
| Advisor | 900–1199 | Purple |
| Oracle | 1200+ | Cyan |

All credibility changes are recorded as immutable events in `credibility_events`.
The AI Advisor explicitly weights answers by author credibility and tells users why.

---

## Key Supabase Dashboard Links

- [SQL Editor](https://supabase.com/dashboard/project/ewyenqtrkdzgckrncwvb/sql/new)
- [Table Editor](https://supabase.com/dashboard/project/ewyenqtrkdzgckrncwvb/editor)
- [Auth Users](https://supabase.com/dashboard/project/ewyenqtrkdzgckrncwvb/auth/users)
- [API Settings](https://supabase.com/dashboard/project/ewyenqtrkdzgckrncwvb/settings/api)
- [Auth Settings](https://supabase.com/dashboard/project/ewyenqtrkdzgckrncwvb/auth/providers) — enable Email (magic link)
