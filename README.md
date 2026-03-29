# Elect

An election management platform where organizations can create and run elections online. Handles everything from registering organizations and onboarding voters/candidates to casting votes and viewing results.

Built as a full-stack project with FastAPI on the backend and React on the frontend, containerized with Docker.

## How it works

1. An organization signs up, verifies their email, and waits for a system admin to approve them
2. Once approved, they top up their wallet via Stripe and create elections (either by uploading CSVs of voters/candidates or by hooking into an external API)
3. Voters get an OTP via SMS (Twilio) to verify their identity, then cast their votes during the election window
4. Results are computed and displayed when the election ends

There are four user roles: **system admin**, **organization owner**, **organization admin**, and **voter** -- each with their own dashboard and permissions.

## Tech stack

### Backend
- **FastAPI** + **Uvicorn** -- async Python web framework
- **PostgreSQL** with **SQLAlchemy 2.0** (async via asyncpg) for the ORM
- **Alembic** for database migrations
- **Redis** for rate limiting (fastapi-limiter)
- **APScheduler** for background jobs (auto-updating election statuses)
- **JWT** (python-jose) + **bcrypt** for auth
- **Stripe** for payments (wallet top-ups via Checkout Sessions + webhooks)
- **Twilio** for SMS OTP verification
- **Cloudinary** for image uploads (candidate photos, party symbols)
- **Google Gemini API** for AI-powered election analytics (RAG-based insights)
- **fastapi-mail** for email verification and password resets

### Frontend
- **React 19** with **Vite**
- **React Router v7** for routing
- **TanStack React Query** for data fetching/caching
- **Tailwind CSS** for styling

### Infrastructure
- **Docker Compose** to spin up everything (backend, frontend, postgres, redis, nginx, pgadmin)
- **Nginx** as a reverse proxy -- routes `/api/*` to the backend, everything else to the frontend

## Running locally

```bash
git clone https://github.com/mazen-fahim/elect.git
cd elect
cp .env.example .env   # fill in your keys
docker-compose up --build
```

The app will be available at `http://localhost`. Backend API docs at `http://localhost/api/docs`.

## Database

13 tables total. The main ones:

- **Users** -- shared across all roles, with a role enum (admin/organization/organization_admin/voter)
- **Organizations** -- linked to a user, has approval status (pending/accepted/rejected)
- **Elections** -- title, type (simple/district/governorate-based), start/end times, method (csv/api)
- **Candidates** -- hashed national ID as PK, linked to elections via a participation junction table
- **Voters** -- composite PK (national ID hash + election ID), stores OTP state
- **VotingProcess** -- records each vote event
- **Transactions** -- wallet top-ups and charges
- **Notifications** -- tracks system events with priority levels

National IDs are SHA-256 hashed before storage -- voters are never identified by their raw ID.
