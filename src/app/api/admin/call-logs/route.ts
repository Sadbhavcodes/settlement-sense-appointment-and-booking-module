import { NextResponse } from "next/server";
import { query } from "@/lib/db/client";

export async function GET() {
  try {
    const result = await query(`
      SELECT 
        c.id, c.phone_number, c.status, c.duration_seconds, c.created_at,
        c.transcript, c.recording_url, c.ai_summary, c.call_sid,
        p.first_name, p.last_name,
        a.id as queue_id
      FROM call_logs c
      LEFT JOIN patients p ON c.patient_id = p.id
      LEFT JOIN appointments a ON c.booking_id = a.id
      ORDER BY c.created_at DESC
      LIMIT 100
    `);

    const formattedLogs = result.rows.map(row => {
      const patientName = row.first_name || row.last_name 
        ? `${row.first_name || ''} ${row.last_name || ''}`.trim() 
        : "Unknown";

      // Format duration
      const mins = Math.floor(row.duration_seconds / 60);
      const secs = row.duration_seconds % 60;
      const duration = `${mins}m ${secs}s`;

      // Format date
      const dateObj = new Date(row.created_at);
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const hh = String(dateObj.getHours()).padStart(2, '0');
      const min = String(dateObj.getMinutes()).padStart(2, '0');
      const date = `${yyyy}-${mm}-${dd} ${hh}:${min}`;

      return {
        id: row.id,
        patientName: patientName,
        patientPhone: row.phone_number,
        status: row.status,
        duration: duration,
        date: date,
        queueId: row.queue_id || null, // Might be token if queue token was available, but using id here as string
        summary: row.ai_summary || "",
        transcript: row.transcript || "",
        recordingUrl: row.recording_url || null,
        callSid: row.call_sid
      };
    });

    return NextResponse.json({ success: true, logs: formattedLogs });
  } catch (error) {
    console.error("GET call-logs error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
