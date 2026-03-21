# Buddy — Financial Well-being for Students

> "We didn't change money. We changed trust."

A student financial platform where **credibility is currency**. Ask questions, share knowledge, earn trust — and the AI already knows who to believe.

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
