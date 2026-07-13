# Settlement Sense OS - Developer Internship Test Task
## Subject: Appointment Journey Module Implementation

Welcome to your internship coding test! You are tasked with implementing the **Appointment Journey Module** for our AI-Native Healthcare Operations Platform, **Settlement Sense**.

This document describes the task scope, data models, business rules, API endpoints, user interface components, and evaluation guidelines. Skeletons and boilerplate code have been pre-scaffolded for you across the workspace. Search for `TODO: Intern Implementation` to find where you need to write code.

---

## 1. Overview & Scope

The **Appointment Journey Module** handles how patients book, reschedule, cancel, and manage appointments. The system accommodates reception desk scheduling, doctor availability management, slot calculations, and provides an **AI Voice Agent & WhatsApp scheduling simulator** to test incoming automated calls.

In production, the system must interface with real-time slot recommendation engines, check constraints (double booking, slot overrides), send reminders, handle waitlists, and automatically transition checked-in patients into the active clinical consultation queue.

---

## 2. Technical Stack & Infrastructure
- **Core Stack**: Next.js App Router (React), TypeScript, Tailwind CSS, shadcn/ui-styled components.
- **Database**: PostgreSQL. Access the database using direct query statements via the pool client defined in `src/lib/db/client.ts`.
- **Validation**: Zod (for request body schemas).
- **Authentication**: Role-based access. Check user permissions using `getCurrentUser()` from `src/lib/db/session.ts`.

---

## 3. Database Schema

You need to set up the `appointments` table. The boilerplate files contain a self-healing block that runs table creation on API startup, but you should also add the schema to `db/migration-appointments.sql` for deployment verification.

### Appointment Schema Structure
- `id`: UUID (Primary Key, default: `gen_random_uuid()`)
- `patient_id`: UUID (Foreign Key references `patients(id)` on delete cascade)
- `doctor_id`: UUID (Foreign Key references `users(id)` on delete cascade)
- `department_id`: TEXT (Nullable, name of department, e.g., 'Cardiology')
- `appointment_date`: DATE (Not Null)
- `start_time`: TEXT (Not Null, format e.g. `'09:00 AM'` or `'09:00'`)
- `end_time`: TEXT (Not Null, format e.g. `'09:15 AM'` or `'09:15'`)
- `status`: TEXT (Not Null, default: `'created'`). Valid values:
  - `'created'`: Appointment recorded.
  - `'confirmed'`: Schedule locked.
  - `'reminder_sent'`: Notification dispatched.
  - `'checked_in'`: Patient arrived at front desk. (Triggers addition to Queue Board!).
  - `'consultation_completed'`: Consultation record created by doctor.
  - `'cancelled'`: Patient/Admin revoked slot.
  - `'waitlisted'`: Limit reached, waiting for openings.
- `source`: TEXT (Not Null, default: `'reception'`). Valid values: `'ai_voice'`, `'website'`, `'mobile'`, `'whatsapp'`, `'reception'`.
- `created_at`: TIMESTAMPTZ (Not Null, default: `now()`)
- `updated_at`: TIMESTAMPTZ (Not Null, default: `now()`)

### Doctor Availability Settings (stored in `doctors.availability_json`)
Availability parameters are saved inside the `doctors` table in the JSON column `availability_json`. The expected JSON structure is:
```json
{
  "workingDays": [1, 2, 3, 4, 5],
  "startTime": "09:00 AM",
  "endTime": "05:00 PM",
  "durationMinutes": 15,
  "maxDailyLimit": 30,
  "cancellationWindowHours": 2
}
```
*Note: Monday is 1, Tuesday is 2, etc. Duration can be 15, 30, or 60 minutes.*

---

## 4. Key Business Rules to Implement

1. **No Double Bookings**: A doctor cannot have two active (non-cancelled, non-waitlisted) appointments in the exact same time slot on the same date.
2. **Configurable Daily Limits**: Verify that the number of appointments for a doctor on a given day does not exceed their configured `maxDailyLimit`. If it does, automatically offer to place the appointment in the `'waitlisted'` status.
3. **Future Dates Only**: Bookings or reschedules must only be set for dates starting from the current date onwards.
4. **Cancellation Window Validation**: If a cancellation is requested (via `DELETE /api/appointments/[id]`), calculate the hours remaining before the appointment start time. If the hours are less than the doctor's `cancellationWindowHours`, return an error indicating that the cancellation window has expired.
5. **Checked-In Synchronization**: When updating status to `'checked_in'`, make a call to insert a new entry into the `queue_entries` table. You can use the logic in `src/app/api/queue/route.ts` as a reference.

---

## 5. API Endpoints to Implement

You must write the logic inside the following file paths:

### 1. `GET /api/availability?doctorId={uuid}&date={yyyy-mm-dd}`
- **Location**: `src/app/api/availability/route.ts`
- **Logic**:
  1. Retrieve the doctor profile and parse their `availability_json`.
  2. Confirm the selected date falls on a configured working day.
  3. Divide the working day duration into slot intervals (e.g., 9:00 AM - 5:00 PM in 15-minute increments).
  4. Query the `appointments` table for active appointments for this doctor on this date.
  5. Cross-reference lists to identify occupied slots, and return the complete list of slots marked as `available: true` or `available: false`.

### 2. `POST /api/appointments`
- **Location**: `src/app/api/appointments/route.ts`
- **Payload**: `{ patientId, doctorId, appointmentDate, startTime, endTime, source }`
- **Logic**:
  1. Validate payload using Zod.
  2. Validate business rules (no double bookings, check daily limits, future dates).
  3. Insert into the database. Return the new appointment `id` and `status`.

### 3. `GET /api/appointments`
- **Location**: `src/app/api/appointments/route.ts`
- **Query Params**: `doctorId`, `patientId`, `date`, `status`, `search`
- **Logic**: Query active schedules, ordering them chronologically by date and start time.

### 4. `PATCH /api/appointments/[id]`
- **Location**: `src/app/api/appointments/[id]/route.ts`
- **Payload**: `{ status, appointmentDate, startTime, endTime }`
- **Logic**:
  1. If status is updated to `'checked_in'`, insert the patient details and target doctor into the `queue_entries` table (Queue Board system).
  2. If rescheduling details are provided, confirm the new slot is available and check future-date rules.
  3. Update the database record.

### 5. `DELETE /api/appointments/[id]`
- **Location**: `src/app/api/appointments/[id]/route.ts`
- **Logic**:
  1. Verify the cancellation window hours policy.
  2. Update status to `'cancelled'`. Do not delete the database row entirely (keep for auditing and analytics).

---

## 6. Frontend Scaffolding Instructions

We have prepared the UI layout at `/appointments`. You need to implement client-side fetch logic, state synchronization, forms validation, and simulator actions inside:
- **`src/components/appointments/appointment-calendar.tsx`**: Add code to fetch the list of appointments and connect click handlers for updating statuses.
- **`src/components/appointments/appointment-form.tsx`**: Bind input listeners, trigger `/api/availability` when date/doctor changes to load open slots dynamically, and submit the booking.
- **`src/components/appointments/ai-scheduler-simulator.tsx`**: Program the conversational simulator. Build a step-by-step response parser that matches keywords (e.g. "schedule", "reschedule", "cancel") and triggers actual bookings.
- **`src/components/appointments/availability-settings.tsx`**: Add fields binding to update a doctor's work hours, slot durations, and limits.

---

## 7. Grading & Validation Rubric

Your implementation will be evaluated based on the following:

| Evaluation Criteria | Weight | Details |
| :--- | :---: | :--- |
| **API Correctness & Robustness** | **30%** | All APIs must return appropriate status codes (200, 201, 400, 401, 404, 500) and structured JSON responses. |
| **Business Logic Checks** | **30%** | Ensure no double booking occurs and the cancellation window rejects invalid cancellations. |
| **UI Aesthetics & Responsiveness** | **20%** | Layout transitions must be smooth. Use HSL styling tokens, responsive grids, and clean hover states. |
| **AI Conversational Flow** | **10%** | Simulator must successfully parse user instructions and correctly call backend availability and booking APIs. |
| **Code Hygiene** | **10%** | Use clean typescript declarations, proper SQL query parameters (prevent injections!), and Zod validation. |

---

### Verification CLI Commands
Before turning in your task, run these verification checks:
```powershell
# 1. Check TypeScript compile rules
npm run typecheck

# 2. Check production bundle builder
npm run build
```

Good luck with your implementation! Please ask your supervisor if you have questions.
