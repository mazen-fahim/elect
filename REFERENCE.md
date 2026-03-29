# Elect - Project Reference

A full-stack digital elections platform for organizations to create, manage, and run secure elections. Built for Egyptian civic/organizational use cases but flexible enough for any context (student unions, corporate boards, municipal votes, etc.).

## Problem

Traditional offline elections are slow and error-prone. Ad-hoc digital solutions lack identity verification, auditability, role-based access, and integrations with payment/messaging systems. Elect handles the full lifecycle: registration, election setup, voter verification, vote casting, and results.

## Tech Stack

### Backend
| Tool | Why |
|------|-----|
| **FastAPI** | Async Python framework - fast, auto-generates OpenAPI docs, native Pydantic validation |
| **PostgreSQL 15** | Relational DB for complex election/voter/candidate relationships with integrity constraints |
| **SQLAlchemy 2.0** (async) | ORM with asyncpg driver for non-blocking DB access |
| **Alembic** | Database migration management - tracks schema changes across environments |
| **Redis** | Backing store for rate limiting (fastapi-limiter) and session management |
| **python-jose + bcrypt** | JWT token auth and password hashing |
| **fastapi-mail** | Async email for verification tokens and notifications |
| **Twilio** | SMS-based OTP delivery for voter identity verification |
| **Stripe** | Payment processing - wallet top-ups via Checkout Sessions + webhooks |
| **Cloudinary** | Cloud image storage for candidate photos and party symbols |
| **APScheduler** | Background job scheduler - auto-updates election statuses (upcoming/running/finished) |
| **httpx** | Async HTTP client for Gemini API calls and external API integrations |
| **Google Gemini API** | Powers the RAG-based AI analytics feature for election insights |

### Frontend
| Tool | Why |
|------|-----|
| **React 19** | Component-based UI with hooks |
| **Vite** | Fast dev server with HMR, much faster than CRA/webpack |
| **React Router v7** | Client-side routing for SPA navigation |
| **TanStack React Query** | Server state management - caching, refetching, loading states |
| **Tailwind CSS** | Utility-first CSS - rapid prototyping without writing custom stylesheets |
| **Lucide React** | Lightweight icon library |

### Infrastructure
| Tool | Why |
|------|-----|
| **Docker Compose** | One command spins up all services (backend, frontend, postgres, redis, nginx, pgadmin) |
| **Nginx** | Reverse proxy - routes `/api/*` to backend (port 8000), everything else to frontend (port 3000) |
| **PgAdmin** | Optional DB admin UI on port 5051 |

## Project Structure

```
elect/
├── backend/
│   ├── main.py              # FastAPI app entry, lifespan, middleware, CORS
│   ├── core/
│   │   ├── settings.py      # Env-based config (DB, mail, JWT, Stripe, etc.)
│   │   ├── dependencies.py  # get_db, get_current_user DI providers
│   │   ├── shared.py        # Shared utils (hash_id with SHA-256)
│   │   ├── error_handler.py # Global exception handlers
│   │   ├── scheduler.py     # APScheduler setup for election status updates
│   │   └── base.py          # SQLAlchemy declarative base
│   ├── models/              # SQLAlchemy ORM models (one file per entity)
│   ├── schemas/             # Pydantic request/response schemas
│   ├── routers/             # API route handlers (one file per domain)
│   ├── services/            # Business logic (auth, email, payment, AI, etc.)
│   └── alembic/             # DB migration versions
├── frontend/
│   └── src/
│       ├── App.jsx          # Route definitions
│       ├── pages/           # Full-page components (dashboards, login, voting, etc.)
│       ├── components/      # Reusable UI (modals, cards, forms, sidebars)
│       ├── services/        # API client layer (axios-like fetch wrappers)
│       ├── hooks/           # useAuth, useOrganization
│       └── context/         # AppContext for global state
├── ai/
│   ├── scripts/             # generate_data.py, train_model.py (scikit-learn)
│   ├── data/                # Synthetic election data CSV
│   └── model/               # Trained participation prediction model (.pkl)
├── csv_elections/           # Sample CSV files for testing election imports
├── nginx/nginx.conf         # Reverse proxy config
└── docker-compose.yml       # Full stack orchestration
```

## Data Model (Key Entities)

- **User** - email, password, role (admin | organization | organization_admin | voter), wallet balance, stripe_session_id
- **Organization** - linked to a User (PK = user_id), name, country, status (pending/accepted/rejected), is_paid
- **OrganizationAdmin** - secondary admins under an organization, must verify email
- **Election** - title, type (simple/district/governorate_based/api_managed), status, start/end times, method (csv/api), vote limit per voter, organization FK
- **Candidate** - hashed_national_id (PK), name, party, district/governorate, photo/symbol URLs, organization FK
- **CandidateParticipation** - junction table (candidate + election), tracks vote count, has_won, rank
- **Voter** - composite PK (voter_national_id + election_id), phone, OTP fields, verification state
- **VotingProcess** - records each successful vote event (voter + election)
- **Notification** - rich enum types covering election/candidate/voter/system events, priority levels, read flags
- **Transaction** - wallet top-up and spending records per user
- **VerificationToken** - email verification and password reset tokens

## User Roles & Flows

**System Admin** - approves/rejects organizations, oversees all elections, manages org admins

**Organization Owner** - registers, verifies email, gets approved by admin, tops up wallet via Stripe, creates elections (CSV or API method), manages candidates with Cloudinary images

**Organization Admin** - created by owner, must verify email, has day-to-day operational privileges (election/candidate management)

**Voter** - onboarded via CSV or API verification, authenticates with OTP (Twilio SMS), casts votes during election runtime window

## API Endpoints

All prefixed with `/api`. Auth via `Authorization: Bearer <JWT>`.

### Auth (`/auth`)
- `POST /login` - returns JWT
- `POST /register` - organization registration
- Email verification, password reset endpoints

### Elections (`/election`)
- `GET /organization` - list org's elections (search, filter by status/type, pagination)
- `POST /` - create election (API method)
- `POST /create-with-csv` - create with candidate/voter CSV uploads
- `POST /{id}/candidates/csv` | `/{id}/voters/csv` - add via CSV
- `PUT /{id}` - update election
- `DELETE /{id}` - delete election
- `POST /sync-statuses` - manually trigger status transitions
- `GET /templates/candidates-csv` | `/templates/voters-csv` - download CSV templates

### Candidates (`/candidate`)
- Full CRUD + bulk create, update with files, manage participations

### Voting (`/voting`)
- `GET /election/{id}/candidates` - get ballot
- `GET /election/{id}/voter/{hashed_id}/status` - check voter eligibility
- `POST /election/{id}/vote` - cast vote (enforces: election running, voter verified, not already voted, correct candidate count)

### Voters (`/voter`)
- `POST /request-otp` - send OTP via Twilio SMS
- `POST /verify-otp` - verify and mark voter as eligible

### Results (`/results`)
- `GET /election/{id}` - full results
- `GET /election/{id}/summary` - summary stats
- `POST /election/{id}/finalize` - lock results

### Payment (`/payment`)
- `POST /create-checkout-session` - Stripe Checkout for wallet top-up
- `POST /webhook` - Stripe webhook for idempotent crediting
- `GET /wallet` | `/transactions` | `/config`

### AI Analytics (`/ai-analytics`)
- `GET /election/{id}` - per-election insights via Gemini API
- `GET /organization` - cross-election trends and recommendations

### Organization (`/organization`)
- Dashboard stats, grouped elections, admin info

### Organization Admin (`/organization-admin`)
- CRUD for secondary admins, self-update

### Notifications (`/notification`)
- List, read, mark-all-read, delete, filter by type/priority

### System Admin (`/system-admin`)
- Organization management, global election oversight, admin CRUD

### Dummy Service (`/dummy-service`)
- Internal mock API for testing API-managed elections (simulates external voter/candidate verification)

## Key Design Decisions

- **National IDs are SHA-256 hashed** (`core/shared.hash_id`) before storage - voters are identified by hash, never by raw ID
- **Election status is dual-tracked**: a DB field updated by APScheduler every minute, plus computed status on the frontend from timestamps. Manual sync endpoints exist as fallback.
- **Two election methods**: CSV (upload voter/candidate lists) vs API (integrate with external verification service). The "dummy service" acts as a built-in mock API for testing the API flow.
- **Wallet-based payments**: organizations top up via Stripe, then spend from wallet to create elections. Webhook ensures crediting even if redirect fails.
- **OTP for voters**: Twilio SMS with expiration and rate limiting. Voter must be verified before casting a vote.
