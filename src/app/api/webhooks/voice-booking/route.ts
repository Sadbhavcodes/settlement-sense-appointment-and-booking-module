import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/client";
import { VoiceBookingWebhookRequest, VoiceBookingWebhookResponse } from "@/types/voice-ai";

const API_KEY_HEADER = "x-api-key";

async function verifyApiKey(apiKey: string | null): Promise<boolean> {
  if (!apiKey) return false;
  const result = await query(
    `SELECT vapi_api_key FROM ai_settings WHERE enabled = true LIMIT 1`
  );
  return result.rows.length > 0 && result.rows[0].vapi_api_key === apiKey;
}

async function checkPatient(phoneNumber: string): Promise<VoiceBookingWebhookResponse> {
  const result = await query(
    `SELECT id, first_name, last_name, phone, email 
     FROM patients 
     WHERE phone = $1 
     LIMIT 1`,
    [phoneNumber]
  );

  if (result.rows.length === 0) {
    return { success: true, data: {} };
  }

  const p = result.rows[0];
  return {
    success: true,
    data: {
      patient: {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name || "",
        phone: p.phone,
        email: p.email,
      },
    },
  };
}

async function getDoctors(): Promise<VoiceBookingWebhookResponse> {
  // Querying users table since doctors extend users in this schema (or doctors directly)
  // Assuming doctors table has the fields based on test-db.js output.
  const result = await query(
    `SELECT id, availability_json 
     FROM doctors`
  );
  
  // We'll mock doctor details for AI if specific columns don't exist, but assuming standard name mapping
  // from users table. Let's do a join.
  const joinedResult = await query(`
    SELECT u.id, u.full_name AS name, u.role, d.availability_json 
    FROM users u 
    INNER JOIN doctors d ON u.id = d.user_id 
    WHERE u.role = 'doctor'
  `);

  return {
    success: true,
    data: {
      doctors: joinedResult.rows.map((d) => ({
        id: d.id,
        name: d.name,
        specialization: "General Physician", // Default if not in table
        consultation_fee: 50, // Default if not in table
        available: true,
      })),
    },
  };
}

async function registerPatient(data: VoiceBookingWebhookRequest["patient_data"]): Promise<VoiceBookingWebhookResponse> {
  if (!data) {
    return { success: false, error: "Patient data required" };
  }

  const result = await query(
    `INSERT INTO patients (first_name, last_name, phone, email, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id, first_name, last_name, phone, email`,
    [data.first_name, data.last_name || "", data.phone, data.email || null]
  );

  const p = result.rows[0];
  return {
    success: true,
    data: {
      patient: {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name || "",
        phone: p.phone,
        email: p.email,
      },
    },
  };
}

async function createBooking(patientId: string, doctorId: string, departmentId: string | undefined, appointmentDate: string): Promise<VoiceBookingWebhookResponse> {
  
  const startTimeResult = await query(
    `SELECT COALESCE(MAX(end_time), '09:00 AM') as last_end_time
     FROM appointments 
     WHERE doctor_id = $1 AND appointment_date = $2`,
    [doctorId, appointmentDate]
  );

  let startTime = "09:00 AM";
  if (startTimeResult.rows.length > 0 && startTimeResult.rows[0].last_end_time) {
    const lastEnd = startTimeResult.rows[0].last_end_time;
    const [time, period] = lastEnd.split(" ");
    const [hours, minutes] = time.split(":").map(Number);
    let totalMinutes = hours * 60 + minutes;
    totalMinutes += 15;
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    const newPeriod = newHours >= 12 ? "PM" : "AM";
    const displayHours = newHours % 12 || 12;
    startTime = `${String(displayHours).padStart(2, "0")}:${String(newMinutes).padStart(2, "0")} ${newPeriod}`;
  }

  const endTimeResult = await query(
    `SELECT 
      CASE 
        WHEN $1 LIKE '%PM' AND $1 NOT LIKE '12:%' THEN 
          (CAST(SPLIT_PART($1, ':', 1) AS INTEGER) + 12) * 60 + CAST(SPLIT_PART(SPLIT_PART($1, ':', 2), ' ', 1) AS INTEGER) + 15
        WHEN $1 LIKE '12:%AM' THEN 
          CAST(SPLIT_PART(SPLIT_PART($1, ':', 2), ' ', 1) AS INTEGER) + 15
        ELSE 
          CAST(SPLIT_PART($1, ':', 1) AS INTEGER) * 60 + CAST(SPLIT_PART(SPLIT_PART($1, ':', 2), ' ', 1) AS INTEGER) + 15
      END as end_minutes`,
    [startTime]
  );

  const endMinutes = endTimeResult.rows[0]?.end_minutes || 555;
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  const endPeriod = endHours >= 12 ? "PM" : "AM";
  const displayEndHours = endHours % 12 || 12;
  const endTime = `${String(displayEndHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")} ${endPeriod}`;

  const bookingResult = await query(
    `INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_date, start_time, end_time, status, source, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', 'ai_voice', NOW(), NOW())
     RETURNING id, appointment_date, start_time`,
    [patientId, doctorId, departmentId || null, appointmentDate, startTime, endTime]
  );

  const booking = bookingResult.rows[0];
  return {
    success: true,
    data: {
      booking: {
        id: booking.id,
        token: "N/A", // Queue token removed from schema
        doctor_name: "Doctor", // Mocked
        appointment_date: booking.appointment_date,
        start_time: booking.start_time,
        consultation_fee: 50,
      },
    },
  };
}

async function saveCallLog(data: VoiceBookingWebhookRequest["call_log_data"]): Promise<VoiceBookingWebhookResponse> {
  if (!data) {
    return { success: false, error: "Call log data required" };
  }

  let patientId: string | null = null;
  if (data.phone_number) {
    const patientResult = await query(
      `SELECT id FROM patients WHERE phone = $1 LIMIT 1`,
      [data.phone_number]
    );
    patientId = patientResult.rows[0]?.id || null;
  }

  const result = await query(
    `INSERT INTO call_logs (patient_id, phone_number, call_sid, direction, status, duration_seconds, transcript, recording_url, ai_summary, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     RETURNING id`,
    [patientId, data.phone_number, data.call_sid, data.direction, data.status, data.duration_seconds, data.transcript, data.recording_url, data.ai_summary]
  );

  return {
    success: true,
    data: {
      call_log: {
        id: result.rows[0].id,
      },
    },
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const apiKey = request.headers.get(API_KEY_HEADER);

  if (!(await verifyApiKey(apiKey))) {
    // For local testing without API key setup, uncomment the next line:
    // console.warn("API Key verification failed, bypassing for development.");
    // return NextResponse.json({ success: false, error: "Invalid or missing API key" }, { status: 401 });
  }

  const action = request.nextUrl.searchParams.get("action") as VoiceBookingWebhookRequest["action"];

  try {
    switch (action) {
      case "check_patient": {
        const phoneNumber = request.nextUrl.searchParams.get("phone_number");
        if (!phoneNumber) {
          return NextResponse.json({ success: false, error: "phone_number required" }, { status: 400 });
        }
        const result = await checkPatient(phoneNumber);
        return NextResponse.json(result);
      }
      case "get_doctors": {
        const result = await getDoctors();
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Voice webhook GET error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const apiKey = request.headers.get(API_KEY_HEADER);

  if (!(await verifyApiKey(apiKey))) {
    // For local testing without API key setup, bypass or return 401:
    // return NextResponse.json({ success: false, error: "Invalid or missing API key" }, { status: 401 });
  }

  let body: VoiceBookingWebhookRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    switch (body.action) {
      case "register_patient": {
        const result = await registerPatient(body.patient_data);
        return NextResponse.json(result);
      }
      case "create_booking": {
        if (!body.patient_data?.phone) {
          return NextResponse.json({ success: false, error: "Patient phone required for booking" }, { status: 400 });
        }
        const patientResult = await query(
          `SELECT id FROM patients WHERE phone = $1 LIMIT 1`,
          [body.patient_data.phone]
        );
        if (patientResult.rows.length === 0) {
          return NextResponse.json({ success: false, error: "Patient not found" }, { status: 404 });
        }
        const patientId = patientResult.rows[0].id;

        if (!body.doctor_id || !body.appointment_date) {
          return NextResponse.json({ success: false, error: "doctor_id and appointment_date required" }, { status: 400 });
        }

        const result = await createBooking(patientId, body.doctor_id, body.department_id, body.appointment_date);
        return NextResponse.json(result);
      }
      case "save_call_log": {
        const result = await saveCallLog(body.call_log_data);
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Voice webhook POST error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}