# SettlementSense — Appointments & Booking Module

A full-stack appointment management system built with **Next.js 15**, **PostgreSQL (Neon)**, and **AI Voice Receptionist (Vapi)**.
Handles end-to-end appointment lifecycle: booking, cancellation, rescheduling, availability management, AI-assisted scheduling, and voice-based patient intake.

## 🌐 Live Demo

> **[https://settlement-sense-appointment-and-bo.vercel.app](https://settlement-sense-appointment-and-bo.vercel.app)**

| Credential | Value |
|---|---|
| Email | `admin@settlementsense.com` |
| Password | `admin123` |

---

## What's Inside

### Pages

| Route | Description |
|---|---|
| `/login` | Staff / doctor login & register |
| `/onboarding` | New user onboarding wizard |
| `/appointments` | Main dashboard — view, filter, manage all appointments |
| `/booking` | Patient-facing public booking page |
| `/admin/ai-receptionist` | AI Voice Receptionist control panel & call logs |

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
| `POST` | `/api/webhooks/voice-booking` | Vapi AI voice agent webhook |
| `GET` | `/api/admin/call-logs` | Retrieve AI voice call logs |
| `GET/POST` | `/api/admin/ai-settings` | Read / update AI receptionist config |

### Key Features

- **Smart Booking** — double-booking prevention, daily limit enforcement, auto-waitlisting
- **Availability Engine** — configurable working days, slot duration, and daily appointment caps per doctor
- **AI Scheduler** — Gemini AI-powered scheduling assistant
- **AI Voice Receptionist** — Vapi-powered phone agent that books appointments automatically
- **Analytics Dashboard** — KPIs: total appointments, cancellation rate, most active doctors
- **JWT Authentication** — all API routes are protected; token decoded server-side
- **Zod Validation** — all API inputs are validated with strict schemas
- **PostgreSQL on Neon** — uses `uuid`, `timestamptz`, parameterised queries, GIN indexes on JSONB

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL 18 (Neon cloud) |
| DB Client | `pg` (node-postgres) |
| Styling | Tailwind CSS |
| Validation | Zod |
| AI Scheduling | Google Gemini API |
| AI Voice Agent | Vapi AI |
| Voice Provider | Twilio |
| Deployment | Vercel |

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

### Step 3 — Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values (see reference table below). At minimum you need:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/settlement_sense
GEMINI_API_KEY=your_gemini_api_key_here
```

> **Gemini API key:** [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — free tier available.

### Step 4 — Set up the database

You need a PostgreSQL instance running. For **local dev**, use pgAdmin or psql.
For **production**, use [Neon](https://neon.tech) (free tier).

Run the schema migrations in order:

```bash
# Option A — psql
psql -U postgres -d settlement_sense -f db/migration-appointments.sql
psql -U postgres -d settlement_sense -f db/migration-voice-ai.sql

# Option B — Node (if psql not installed)
node -e "
const {Client}=require('pg');
const fs=require('fs');
const c=new Client({connectionString:process.env.DATABASE_URL});
c.connect().then(()=>c.query(fs.readFileSync('db/migration-appointments.sql','utf8'))).then(()=>c.query(fs.readFileSync('db/migration-voice-ai.sql','utf8'))).then(()=>{console.log('Done');c.end()});
"
```

### Step 5 — Start the app

```bash
npm run dev
```

App runs at: **http://localhost:3000**

---

## Deployment (Vercel + Neon)

This project is production-deployed on **Vercel** with **Neon PostgreSQL**.

### Quick Deploy Steps

1. **Fork / push** this repo to GitHub
2. **Create a Neon project** at [neon.tech](https://neon.tech) → copy the connection string
3. **Import** the repo on [vercel.com/new](https://vercel.com/new)
4. **Add environment variables** in Vercel dashboard (see table below)
5. **Deploy** — Vercel auto-detects Next.js, no config needed

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ Yes | PostgreSQL / Neon connection string |
| `GEMINI_API_KEY` | ✅ Yes | Google Gemini API key for AI scheduler |
| `VAPI_API_KEY` | ✅ Yes | Vapi private API key |
| `VAPI_ASSISTANT_ID` | ✅ Yes | Vapi voice assistant ID |
| `VAPI_WEBHOOK_SECRET` | ✅ Yes | Shared secret for Vapi webhook verification |
| `NEXT_PUBLIC_VAPI_PUBLIC_KEY` | ✅ Yes | Vapi public key (exposed to browser) |
| `NEXT_PUBLIC_VAPI_ASSISTANT_ID` | ✅ Yes | Vapi assistant ID (exposed to browser) |
| `TWILIO_ACCOUNT_SID` | ✅ Yes | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | ✅ Yes | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | ✅ Yes | Twilio phone number in E.164 format |

---

## Project Structure

```
src/
├── app/                  # Next.js pages & API routes (App Router)
│   ├── api/
│   │   ├── auth/         # Login & register (Neon DB direct)
│   │   ├── admin/        # Call logs, AI settings
│   │   └── webhooks/     # Vapi voice booking webhook
│   ├── appointments/     # Main appointments dashboard
│   ├── admin/
│   │   └── ai-receptionist/  # Voice agent control panel
│   ├── booking/          # Patient booking page
│   ├── login/            # Login / register page
│   └── onboarding/       # Onboarding wizard
├── api/                  # Legacy route stubs (appointments, availability)
├── components/           # Reusable UI components
│   ├── admin/            # AI receptionist UI
│   ├── appointments/     # Dashboard, calendar, form, analytics, AI scheduler
│   ├── auth/             # Auth guard
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

## Notes

- All API routes require a valid `Authorization: Bearer <token>` header (set automatically after login).
- The `availability_json` column on doctors stores a JSONB config: `{ monday, tuesday, ... }` with `{ start, end }` per day.
- The Vapi webhook endpoint is `/api/webhooks/voice-booking` — configure this URL in your Vapi assistant's Server URL setting.
