-- Migration: Appointment Journey Module Schema
-- TODO: Intern Implementation - Review the table columns, indices, and constraints below.

-- 1. Create Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id text, -- nullable name of the department
  appointment_date date NOT NULL,
  start_time text NOT NULL, -- format e.g. '09:00 AM'
  end_time text NOT NULL, -- format e.g. '09:15 AM'
  status text NOT NULL DEFAULT 'created', -- 'created', 'confirmed', 'reminder_sent', 'checked_in', 'consultation_completed', 'cancelled', 'waitlisted'
  source text NOT NULL DEFAULT 'reception', -- 'ai_voice', 'website', 'mobile', 'whatsapp', 'reception'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create Search & Constraint Optimization Indexes
CREATE INDEX IF NOT EXISTS appointments_doctor_date_idx ON appointments (doctor_id, appointment_date);
CREATE INDEX IF NOT EXISTS appointments_patient_idx ON appointments (patient_id);
CREATE INDEX IF NOT EXISTS appointments_status_idx ON appointments (status);

-- 3. Add default availability configuration parameter to doctors profile table if missing
-- Note: doctors table has availability_json column. If you need any specific index on json fields, add it here.
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS availability_json jsonb;
CREATE INDEX IF NOT EXISTS doctors_availability_json_idx ON doctors USING gin (availability_json);