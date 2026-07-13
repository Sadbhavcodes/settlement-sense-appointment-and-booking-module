import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/db/session";
import { query } from "@/lib/db/client";
import { z } from "zod";

// Zod validation schema for booking an appointment
const bookAppointmentSchema = z.object({
  patientId: z.string().uuid("Invalid patient ID"),
  doctorId: z.string().uuid("Invalid doctor ID"),
  departmentId: z.string().optional(),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  startTime: z.string(), // e.g. '09:00 AM'
  endTime: z.string(), // e.g. '09:15 AM'
  source: z.enum(["ai_voice", "website", "mobile", "whatsapp", "reception"])
});

// Self-healing database migration function
async function runSelfHealingMigration() {
  await query(`
    CREATE TABLE IF NOT EXISTS appointments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      department_id text,
      appointment_date date NOT NULL,
      start_time text NOT NULL,
      end_time text NOT NULL,
      status text NOT NULL DEFAULT 'created',
      source text NOT NULL DEFAULT 'reception',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  // Ensure indexes are set up for performance
  await query(`CREATE INDEX IF NOT EXISTS appointments_doctor_date_idx ON appointments (doctor_id, appointment_date);`);
  await query(`CREATE INDEX IF NOT EXISTS appointments_patient_idx ON appointments (patient_id);`);
}

// GET /api/appointments - Retrieve appointments with query filters
export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await runSelfHealingMigration();

    const url = new URL(request.url);
    const doctorId = url.searchParams.get("doctorId");
    const patientId = url.searchParams.get("patientId");
    const date = url.searchParams.get("date");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search"); // Search by patient name or phone

    let sql = `
      SELECT a.*, 
             p.first_name || ' ' || p.last_name as patient_name,
             p.phone as patient_phone,
             u.full_name as doctor_name
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      JOIN users u ON u.id = a.doctor_id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    // TODO: Intern Implementation - Add filters for query parameters:
    // 1. If doctorId is provided, filter by a.doctor_id
    if (doctorId) {
      params.push(doctorId);
      sql += ` AND a.doctor_id = $${params.length}`;
    }
    // 2. If patientId is provided, filter by a.patient_id
    if (patientId) {
      params.push(patientId);
      sql += ` AND a.patient_id = $${params.length}`;
    }
    // 3. If date is provided, filter by a.appointment_date
    if (date) {
      params.push(date);
      sql += ` AND a.appointment_date = $${params.length}`;
    }
    // 4. If status is provided, filter by a.status
    if (status) {
      params.push(status);
      sql += ` AND a.status = $${params.length}`;
    }
    // 5. If search is provided, filter by patient name (p.first_name, p.last_name) or phone (p.phone) using ILIKE
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (p.first_name ILIKE $${params.length} OR p.last_name ILIKE $${params.length} OR p.phone ILIKE $${params.length})`;
    }

    // Ensure all variables are bound as parameters ($1, $2, etc.) to prevent SQL injections!

    // Default sorting chronologically by date and start_time
    sql += ` ORDER BY a.appointment_date ASC, a.start_time ASC LIMIT 100`;

    const result = await query(sql, params);

    // Convert DB snake_case columns back to camelCase properties for frontend matching
    const appointments = result.rows.map((row: any) => ({
      id: row.id,
      patientId: row.patient_id,
      patientName: row.patient_name,
      patientPhone: row.patient_phone,
      doctorId: row.doctor_id,
      doctorName: row.doctor_name,
      departmentId: row.department_id,
      appointmentDate: new Date(row.appointment_date).toISOString().split('T')[0],
      startTime: row.start_time,
      endTime: row.end_time,
      status: row.status,
      source: row.source,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error("GET appointments error:", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}

// POST /api/appointments - Book a new appointment
export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await runSelfHealingMigration();
    const body = await request.json();

    // Validate the incoming JSON structure
    const parsed = bookAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { patientId, doctorId, departmentId, appointmentDate, startTime, endTime, source } = parsed.data;

    // Check future date policy
    const selectedDate = new Date(appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return NextResponse.json({ error: "Cannot book appointments in the past" }, { status: 400 });
    }

    // TODO: Intern Implementation - Check availability & limits:
    //
    // STEP 1: Fetch doctor's availability_json from the `doctors` table (join on user_id)
    // Validate if the doctor works on that day of the week (1=Mon, 7=Sun).
    // Ensure the slot time falls within the doctor's start_time and end_time.
    const doctorRes = await query(
      `SELECT d.availability_json FROM doctors d WHERE d.user_id = $1`,
      [doctorId]
    );
    const avail = {
      workingDays: [1, 2, 3, 4, 5],
      maxDailyLimit: 30,
      ...(doctorRes.rows[0]?.availability_json || {})
    };
    let dow = new Date(appointmentDate).getDay();
    if (dow == 0) dow = 7;
    if (!avail.workingDays.includes(dow)) {
      return NextResponse.json({ error: "Doctor does not work on this day" }, { status: 400 });
    }
    // STEP 2: Double-Booking Validation
    // Query if there's any active appointment ('created', 'confirmed', 'reminder_sent', 'checked_in') 
    // for this doctor, date, and startTime.
    // If a collision exists, return a 400 validation error: "Time slot is already occupied".
    const conflict = await query(
      `SELECT id FROM appointments 
  WHERE doctor_id = $1 AND appointment_date = $2 AND start_time = $3
   AND status NOT IN ('cancelled', 'waitlisted')`,
      [doctorId, appointmentDate, startTime]
    );
    if (conflict.rows.length > 0) {
      return NextResponse.json({ error: "Time slot is already occupied" }, { status: 400 });
    }

    // STEP 3: Daily Limits Verification
    // Query count of active appointments for this doctor on this date.
    // If count >= maxDailyLimit (from doctor availability_json):
    //   - Offer to save the appointment as status = 'waitlisted' or return an error.
    const countRes = await query(
      `SELECT COUNT(*) as cnt FROM appointments 
   WHERE doctor_id = $1 AND appointment_date = $2
   AND status NOT IN ('cancelled', 'waitlisted')`,
      [doctorId, appointmentDate]
    );
    const dailyCount = parseInt(countRes.rows[0].cnt);
    const status = dailyCount >= avail.maxDailyLimit ? 'waitlisted' : 'created';

    // STEP 4: Insert record
    // Default status: If limits exceeded, status is 'waitlisted', else 'created'.
    // Perform INSERT SQL query and return the new id.

    // Dummy insert query placeholder - Replace with actual implementation:
    const result = await query(
      `INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_date, start_time, end_time, status, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [patientId, doctorId, departmentId || null, appointmentDate, startTime, endTime, status, source]
    );

    return NextResponse.json({ id: result.rows[0].id, status }, { status: 201 });
  } catch (error) {
    console.error("POST appointment error:", error);
    return NextResponse.json({ error: "Failed to book appointment" }, { status: 500 });
  }
}