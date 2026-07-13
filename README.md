# SettlementSense — Appointments & Booking Module

A full-stack appointment management system built with **Next.js 15** and **PostgreSQL**.
Handles end-to-end appointment lifecycle: booking, cancellation, rescheduling, availability management, and AI-assisted scheduling.

---

## What's Inside

### Pages

| Route | Description |
|---|---|
| `/login` | Staff / doctor login |
| `/onboarding` | New user onboarding wizard |
| `/appointments` | Main dashboard — view, filter, manage all appointments |
| `/booking` | Patient-facing public booking page |

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate user, returns JWT |
| `POST` | `/api/auth/register` | Register new user |
| `GET` | `/api/appointments` | List appointments (filter by doctor, patient, date, status) |
| `POST` | `/api/appointments` | Book a new appointment |
| `GET` | `/api/appointments/:id` | Get single appointment detail |
| `PATCH` | `/api/appointments/:id` | Update appointment (reschedule / cancel / change status) |
| `GET` | `/api/appointments/analytics` | Aggregated stats for the dashboard |
| `GET` | `/api/availability` | Get available time slots for a doctor on a given date |
| `PUT` | `/api/availability` | Update a doctor's availability settings |

### Key Features

- **Smart Booking** — double-booking prevention, daily limit enforcement, auto-waitlisting
- **Availability Engine** — configurable working days, slot duration, and daily appointment caps per doctor
- **AI Scheduler Simulator** — Gemini AI-powered scheduling assistant
- **Analytics Dashboard** — KPIs: total appointments, cancellation rate, most active doctors
- **JWT Authentication** — all API routes are protected; token decoded server-side
- **Zod Validation** — all API inputs are validated with strict schemas
- **PostgreSQL** — uses `uuid`, `timestamptz`, parameterised queries, GIN indexes on JSONB

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL 16 |
| DB Client | `pg` (node-postgres) |
| Styling | Tailwind CSS |
| Validation | Zod |
| AI Feature | Google Gemini API |

---

## Prerequisites

Before running locally, make sure you have:

- [Node.js 18+](https://nodejs.org/)
- [PostgreSQL 16](https://www.postgresql.org/download/) installed and running
- [pgAdmin 4](https://www.pgadmin.org/) (optional, for GUI)
- A Google Gemini API key (for the AI scheduler feature)

---

## Local Setup — Step by Step

### Step 1 — Clone the repo

```bash
git clone https://github.com/Sadbhavcodes/settlement-sense-appointment-and-booking-module.git
cd settlement-sense-appointment-and-booking-module
```

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Create the database

Open **psql** or **pgAdmin** and run:

```sql
CREATE DATABASE settlement_sense;
```

### Step 4 — Run the schema

Connect to `settlement_sense` and run the following SQL in order:

```sql
-- Users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Patients
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Doctors
CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  availability_json jsonb
);
CREATE INDEX IF NOT EXISTS doctors_availability_json_idx ON doctors USING gin (availability_json);
```

Then run the file at `db/migration-appointments.sql` to create the appointments table and indexes.

> You can run it directly in psql:
> ```bash
> psql -U postgres -d settlement_sense -f db/migration-appointments.sql
> ```

### Step 5 — Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
# Your Gemini API key
GEMINI_API_KEY=your_gemini_api_key_here

# PostgreSQL connection string
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/settlement_sense
```

> **Where to get a Gemini API key?**
> Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and generate one for free.

### Step 6 — Start the app

```bash
npm run dev
```

App runs at: **http://localhost:3000**

---

## Project Structure

```
src/
├── api/                  # Next.js API route handlers
│   ├── appointments/     # GET, POST, PATCH appointments + analytics
│   ├── auth/             # Login & register (proxies to auth server)
│   └── availability/     # Doctor slot availability
├── app/                  # Next.js pages (App Router)
│   ├── appointments/     # Main appointments dashboard
│   ├── booking/          # Patient booking page
│   ├── login/            # Login page
│   └── onboarding/       # Onboarding wizard
├── components/           # Reusable UI components
│   ├── appointments/     # Dashboard, calendar, form, analytics, AI scheduler
│   ├── booking/          # Public booking flow
│   ├── onboarding/       # Onboarding wizard steps
│   └── ui/               # Base components: button, card, table, dialog, badge
├── lib/
│   ├── auth.ts           # Client-side JWT helpers
│   ├── validation.ts     # Zod schemas
│   └── db/
│       ├── client.ts     # PostgreSQL connection pool
│       └── session.ts    # Server-side JWT session decoder
└── types/                # TypeScript type definitions
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string |
| `GEMINI_API_KEY` | ✅ Yes | Google Gemini API key for AI scheduler |

---

## Notes

- The auth server (login/register) runs separately. By default the login API proxies to `http://localhost:3099`. Update `NEXT_PUBLIC_API_BASE` in `.env` if your auth server runs on a different port.
- All API routes require a valid `Authorization: Bearer <token>` header (set automatically after login).
- The `availability_json` column on doctors stores a JSONB config: `{ workingDays, startTime, endTime, durationMinutes, maxDailyLimit }`.
