# Mock Interview AI

A full-stack AI-powered mock interview platform for software developers. Practice HR screens, technical interviews, and culture fit interviews tailored to your CV and job description. Get evaluated, receive best-practice answers, and track your progress.

---

## Features

- **Phone login** — no password, no OTP; enter your number and go
- **Personalized interview plan** — AI generates rounds based on your CV + JD
- **AI interviewer** — asks real, contextual questions per round type
- **Live evaluation** — score, strengths, weaknesses, English feedback per answer
- **Best-practice answers** — model answers generated after each evaluation
- **Answer library** — save and revisit best-practice answers
- **Session history** — full Q&A transcript with evaluations
- **Rate limiting** — per-user daily caps to control AI costs
- **Structured logging** — JSON logs in production, pretty logs in dev

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| File Storage | Supabase Storage |
| AI | OpenAI GPT-4o-mini (configurable) |
| PDF Parsing | pdf-parse |
| Validation | Zod |
| Forms | react-hook-form |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Next.js App Router                  │
│                                                     │
│  /app/(auth)        → Login page                   │
│  /app/(dashboard)   → Dashboard, Session, Library  │
│  /app/api           → All API routes               │
└──────┬────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────┐
│  Services Layer                                      │
│  ai.service       → All OpenAI calls               │
│  rate-limit       → Daily per-user caps             │
│  analytics        → Event tracking                 │
└──────┬──────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────┐
│  Repository Layer                                    │
│  user / session / round / message / evaluation /    │
│  saved-answer repositories                          │
└──────┬──────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────┐
│  Supabase (PostgreSQL + Storage)                    │
└─────────────────────────────────────────────────────┘
```

### Key Design Patterns

- **Repository pattern** — one class per DB table, all queries centralized
- **Service layer** — business logic separated from API route handlers
- **Lazy client init** — Supabase and OpenAI clients initialize on first use (build-safe)
- **Structured logging** — `lib/logger.ts` outputs JSON in production, pretty text in dev
- **Custom errors** — `AppError`, `AIError`, `ValidationError`, `RateLimitError` with HTTP status codes
- **Zod schemas** — all AI outputs validated before use; API inputs validated before DB write
- **Retry with backoff** — all AI calls retry up to 2 times with exponential backoff

---

## Project Structure

```
mock-interview-assistant-ai/
├── app/
│   ├── (auth)/login/           # Login page
│   ├── (dashboard)/
│   │   ├── dashboard/          # Session list
│   │   ├── sessions/new/       # Create session + upload CV/JD
│   │   ├── sessions/[id]/
│   │   │   ├── review/         # AI plan review & confirm
│   │   │   ├── round/[roundId]/        # Interview chat UI
│   │   │   ├── round/[roundId]/result/ # Round verdict
│   │   │   └── history/        # Full session review
│   │   └── library/            # Saved answer library
│   └── api/
│       ├── auth/login/         # Login / logout
│       ├── sessions/           # CRUD sessions
│       ├── sessions/[id]/plan/ # Generate & confirm plan
│       ├── sessions/[id]/rounds/[roundId]/
│       │   ├── questions/      # Generate question
│       │   ├── evaluate/       # Evaluate + best answer
│       │   ├── verdict/        # Round verdict
│       │   └── save/           # Save to library
│       ├── upload/             # PDF upload + text extract
│       └── library/            # Saved answers CRUD
├── components/
│   ├── auth/                   # LoginForm
│   ├── dashboard/              # SessionCard, skeleton
│   ├── interview/              # ChatBubble, EvaluationCard, AnswerInput, RoundProgress
│   ├── session/                # FileUploadZone, RoundPlanCard
│   └── shared/                 # NavBar, EmptyState, ScoreBadge, VerdictBadge
├── hooks/
│   ├── useAuth.ts              # Login / logout logic
│   └── useInterview.ts         # Full interview state machine
├── lib/
│   ├── auth.ts                 # Cookie-based session
│   ├── errors.ts               # Custom error classes
│   ├── logger.ts               # Structured logger
│   ├── utils.ts                # Helpers + retry logic
│   ├── supabase/client.ts      # Browser Supabase client
│   ├── supabase/server.ts      # Service role client (server only)
│   └── openai/client.ts        # OpenAI client
├── prompts/                    # All AI system + user prompts
│   ├── plan.ts                 # Interview plan generation
│   ├── question.ts             # Question generation
│   ├── evaluate.ts             # Answer evaluation
│   ├── best-answer.ts          # Best practice answer
│   └── verdict.ts              # Round verdict
├── repositories/               # DB access layer
├── services/                   # Business logic layer
├── types/
│   ├── database.ts             # All DB entity types
│   └── ai.ts                   # Zod schemas for AI outputs
└── supabase/schema.sql         # Database schema + RLS
```

---

## Getting Started

### 1. Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)
- An [OpenAI](https://platform.openai.com) API key

### 2. Set up Supabase

1. Create a new Supabase project
2. Go to **SQL Editor** and run `supabase/schema.sql`
3. Go to **Storage** → Create a bucket named `interview-docs` (private)
4. Copy your **Project URL**, **anon key**, and **service role key**

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4o-mini
```

### 4. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set all environment variables in **Vercel → Project → Settings → Environment Variables**.

---

## AI Cost Guide

| Scenario | Model | Cost/session |
|---|---|---|
| MVP testing | gpt-4o-mini | ~$0.04 |
| Production (accuracy) | gpt-4o | ~$0.74 |
| Budget | gemini-2.0-flash | ~$0.03 |

Change model: set `OPENAI_MODEL=gpt-4o` in your `.env.local`.

---

## Rate Limits

Default per-user daily limits (configurable in `services/rate-limit.service.ts`):

| Limit | Default |
|---|---|
| Sessions per day | 3 |
| AI calls per day | 100 |
| Questions per round | 10 (hard cap) |

---

## Logging

In **development** (`NODE_ENV=development`): pretty-printed logs to console.

In **production**: structured JSON logs — pipe to any log aggregator (Datadog, Logtail, etc.).

```ts
import { logger } from '@/lib/logger'

logger.info('Something happened', { sessionId, userId })
logger.error('AI call failed', error, { task: 'evaluate' })
```

---

## Investigating Issues

All AI calls log:
- `AI call starting` with model name and task
- `AI call succeeded` on success
- `AI returned invalid JSON` with raw response on parse failure

All API errors log with:
- Full error object (in dev: stack trace)
- Request context (user ID, session ID, round ID)

Search logs by `task`, `userId`, or `sessionId` to trace any issue end-to-end.

---

## Database Schema Overview

| Table | Purpose |
|---|---|
| `users` | Phone-identified accounts |
| `sessions` | Interview sessions with CV/JD text |
| `rounds` | Individual interview rounds (HR/Technical/Culture) |
| `messages` | Q&A chat messages per round |
| `evaluations` | AI scores + feedback per answer |
| `round_results` | Final verdict per round |
| `saved_answers` | User's answer library |
| `events` | Analytics event log |
| `daily_usage` | Rate limiting counters |
