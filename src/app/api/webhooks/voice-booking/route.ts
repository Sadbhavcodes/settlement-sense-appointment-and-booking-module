import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VapiToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

interface VapiWebhookBody {
  message?: {
    type: string;
    call?: { id?: string; phoneNumber?: string };
    toolCallList?: VapiToolCall[];
  };
  // Plain REST fallback body fields
  action?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Security — x-vapi-secret header check (optional but recommended)
// ---------------------------------------------------------------------------

function verifyVapiSecret(request: NextRequest): boolean {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (!secret) return true; // Skip if not configured
  const header = request.headers.get("x-vapi-secret");
  return header === secret;
}

// ---------------------------------------------------------------------------
// Tool Handlers — each returns a plain string result for Vapi
// ---------------------------------------------------------------------------

async function handleCheckPatient(args: Record<string, unknown>): Promise<string> {
  const phoneNumber = args.phone_number as string;
  if (!phoneNumber) return JSON.stringify({ found: false, error: "phone_number argument is required" });

  const result = await query(
    `SELECT id, first_name, last_name, phone, email
     FROM patients
     WHERE phone = $1
     LIMIT 1`,
    [phoneNumber]
  );

  if (result.rows.length === 0) {
    return JSON.stringify({ found: false, message: "No patient found with this phone number. They may need to register." });
  }

  const p = result.rows[0];
  return JSON.stringify({
    found: true,
    patient: {
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name || "",
      phone: p.phone,
      email: p.email,
    },
  });
}

async function handleGetDoctors(_args: Record<string, unknown>): Promise<string> {
  const result = await query(`
    SELECT u.id AS user_id, u.full_name AS name, d.availability_json
    FROM users u
    INNER JOIN doctors d ON u.id = d.user_id
    WHERE u.role = 'doctor'
    ORDER BY u.full_name
  `);

  const doctors = result.rows.map((d) => ({
    id: d.user_id,   // appointments.doctor_id references users.id
    name: d.name,
    specialization: "General Physician",
    consultation_fee: 50,
    available: true,
  }));

  if (doctors.length === 0) {
    return JSON.stringify({ doctors: [], message: "No doctors are currently available." });
  }

  return JSON.stringify({ doctors });
}

async function handleRegisterPatient(args: Record<string, unknown>): Promise<string> {
  const { first_name, last_name, phone, email } = args as Record<string, string>;

  if (!first_name || !phone) {
    return JSON.stringify({ success: false, error: "first_name and phone are required to register a patient." });
  }

  // Check if patient already exists
  const existing = await query(`SELECT id FROM patients WHERE phone = $1 LIMIT 1`, [phone]);
  if (existing.rows.length > 0) {
    return JSON.stringify({ success: false, error: "A patient with this phone number already exists. Use check_patient to look them up." });
  }

  const result = await query(
    `INSERT INTO patients (first_name, last_name, phone, email, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id, first_name, last_name, phone, email`,
    [first_name, last_name || "", phone, email || null]
  );

  const p = result.rows[0];
  return JSON.stringify({
    success: true,
    patient: { id: p.id, first_name: p.first_name, last_name: p.last_name, phone: p.phone },
    message: `Patient ${p.first_name} registered successfully.`,
  });
}

async function handleCreateBooking(args: Record<string, unknown>): Promise<string> {
  const { patient_id, doctor_id, appointment_date, department_id } = args as Record<string, string>;

  if (!patient_id || !doctor_id || !appointment_date) {
    return JSON.stringify({ success: false, error: "patient_id, doctor_id, and appointment_date are required." });
  }

  // Get the next available start time slot for this doctor on this date
  const startTimeResult = await query(
    `SELECT COALESCE(MAX(end_time), '09:00 AM') as last_end_time
     FROM appointments
     WHERE doctor_id = $1 AND appointment_date = $2`,
    [doctor_id, appointment_date]
  );

  let startTime = "09:00 AM";
  const lastEnd = startTimeResult.rows[0]?.last_end_time;
  if (lastEnd && lastEnd !== "09:00 AM") {
    // Parse and add 15 minutes
    const isPM = lastEnd.includes("PM");
    const timeStr = lastEnd.replace(" AM", "").replace(" PM", "");
    const [hStr, mStr] = timeStr.split(":");
    let totalMins = parseInt(hStr) * 60 + parseInt(mStr);
    if (isPM && parseInt(hStr) !== 12) totalMins += 12 * 60;
    if (!isPM && parseInt(hStr) === 12) totalMins -= 12 * 60;
    totalMins += 15;
    const newH = Math.floor(totalMins / 60) % 24;
    const newM = totalMins % 60;
    const period = newH >= 12 ? "PM" : "AM";
    const displayH = newH % 12 || 12;
    startTime = `${String(displayH).padStart(2, "0")}:${String(newM).padStart(2, "0")} ${period}`;
  }

  // Calculate end time (+15 minutes)
  const isPM = startTime.includes("PM");
  const timeStr = startTime.replace(" AM", "").replace(" PM", "");
  const [hStr, mStr] = timeStr.split(":");
  let totalMins = parseInt(hStr) * 60 + parseInt(mStr);
  if (isPM && parseInt(hStr) !== 12) totalMins += 12 * 60;
  totalMins += 15;
  const endH = Math.floor(totalMins / 60) % 24;
  const endM = totalMins % 60;
  const endPeriod = endH >= 12 ? "PM" : "AM";
  const displayEndH = endH % 12 || 12;
  const endTime = `${String(displayEndH).padStart(2, "0")}:${String(endM).padStart(2, "0")} ${endPeriod}`;

  const bookingResult = await query(
    `INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_date, start_time, end_time, status, source, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', 'ai_voice', NOW(), NOW())
     RETURNING id, appointment_date, start_time`,
    [patient_id, doctor_id, department_id || null, appointment_date, startTime, endTime]
  );

  const booking = bookingResult.rows[0];
  return JSON.stringify({
    success: true,
    booking: {
      id: booking.id,
      appointment_date: booking.appointment_date,
      start_time: booking.start_time,
      end_time: endTime,
    },
    message: `Appointment confirmed for ${appointment_date} at ${booking.start_time}.`,
  });
}

async function handleSaveCallLog(args: Record<string, unknown>): Promise<string> {
  const { phone_number, call_sid, direction, status, duration_seconds, transcript, recording_url, ai_summary } = args as Record<string, unknown>;

  if (!phone_number) {
    return JSON.stringify({ success: false, error: "phone_number is required." });
  }

  // Look up patient by phone
  const patientResult = await query(`SELECT id FROM patients WHERE phone = $1 LIMIT 1`, [phone_number]);
  const patientId = patientResult.rows[0]?.id || null;

  const result = await query(
    `INSERT INTO call_logs (patient_id, phone_number, call_sid, direction, status, duration_seconds, transcript, recording_url, ai_summary, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     ON CONFLICT (call_sid) DO NOTHING
     RETURNING id`,
    [patientId, phone_number, call_sid || null, direction || "incoming", status || "completed", duration_seconds || 0, transcript || null, recording_url || null, ai_summary || null]
  );

  return JSON.stringify({ success: true, call_log_id: result.rows[0]?.id || null });
}

// ---------------------------------------------------------------------------
// Tool dispatcher
// ---------------------------------------------------------------------------

async function dispatchTool(toolName: string, args: Record<string, unknown>): Promise<string> {
  switch (toolName) {
    case "check_patient":
      return handleCheckPatient(args);
    case "get_doctors":
      return handleGetDoctors(args);
    case "register_patient":
      return handleRegisterPatient(args);
    case "create_booking":
      return handleCreateBooking(args);
    case "save_call_log":
      return handleSaveCallLog(args);
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

// ---------------------------------------------------------------------------
// POST — handles both Vapi tool-call format AND plain REST fallback
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!verifyVapiSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: VapiWebhookBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ── Vapi Tool-Call Format ──────────────────────────────────────────────
  if (body.message?.type === "tool-calls" && Array.isArray(body.message.toolCallList)) {
    try {
      const results = await Promise.all(
        body.message.toolCallList.map(async (tc: VapiToolCall) => {
          const resultStr = await dispatchTool(tc.function.name, tc.function.arguments || {});
          return { toolCallId: tc.id, result: resultStr };
        })
      );
      return NextResponse.json({ results });
    } catch (error) {
      console.error("Vapi tool-call error:", error);
      return NextResponse.json({ results: [{ toolCallId: "error", result: JSON.stringify({ error: "Internal server error" }) }] }, { status: 500 });
    }
  }

  // ── Status/end-of-call-report webhooks from Vapi (not tool-calls) ──────
  if (body.message?.type === "status-update" || body.message?.type === "end-of-call-report") {
    // Acknowledge silently — these are informational
    console.info("[voice-webhook] Vapi event received:", body.message?.type);
    return NextResponse.json({ received: true });
  }

  // ── Plain REST fallback (for manual testing) ──────────────────────────
  const action = body.action as string;
  try {
    if (!action) {
      return NextResponse.json({ error: "Missing action or unrecognized message type" }, { status: 400 });
    }
    const args = body as unknown as Record<string, unknown>;
    const result = await dispatchTool(action, args);
    return NextResponse.json(JSON.parse(result));
  } catch (error) {
    console.error("Voice webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// GET — REST testing endpoints (check_patient, get_doctors)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const action = request.nextUrl.searchParams.get("action");
  const apiKey = request.headers.get("x-api-key");

  // Optional: verify a simpler API key for GET requests from browser testing
  const configuredKey = process.env.VOICE_WEBHOOK_API_KEY;
  if (configuredKey && apiKey !== configuredKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    switch (action) {
      case "check_patient": {
        const phone = request.nextUrl.searchParams.get("phone_number") || "";
        const result = await handleCheckPatient({ phone_number: phone });
        return NextResponse.json(JSON.parse(result));
      }
      case "get_doctors": {
        const result = await handleGetDoctors({});
        return NextResponse.json(JSON.parse(result));
      }
      default:
        return NextResponse.json({ error: "Valid actions: check_patient, get_doctors" }, { status: 400 });
    }
  } catch (error) {
    console.error("Voice webhook GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}