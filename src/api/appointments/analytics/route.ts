import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/db/session";
import { query } from "@/lib/db/client";

// GET /api/appointments/analytics
// Returns real-time aggregated stats from the appointments table
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Total counts grouped by status
    const statusResult = await query(
      `SELECT status, COUNT(*) as count FROM appointments GROUP BY status`
    );
    const byStatus: Record<string, number> = {};
    statusResult.rows.forEach((r: any) => {
      byStatus[r.status] = parseInt(r.count);
    });

    const total      = statusResult.rows.reduce((s: number, r: any) => s + parseInt(r.count), 0);
    const cancelled  = byStatus["cancelled"]  || 0;
    const waitlisted = byStatus["waitlisted"] || 0;
    const active     = total - cancelled - waitlisted;
    const bookingSuccessRate = total > 0
      ? parseFloat(((active / total) * 100).toFixed(1))
      : 0;

    // 2. Counts grouped by source channel
    const sourceResult = await query(
      `SELECT source, COUNT(*) as count FROM appointments GROUP BY source`
    );
    const bySource: Record<string, number> = {};
    sourceResult.rows.forEach((r: any) => {
      bySource[r.source] = parseInt(r.count);
    });

    // Convert to percentages for the channel distribution UI
    const sourcePercentages: Record<string, number> = {};
    const sourceKeys = ["ai_voice", "reception", "whatsapp", "website", "mobile"];
    sourceKeys.forEach((src) => {
      sourcePercentages[src] = total > 0
        ? Math.round(((bySource[src] || 0) / total) * 100)
        : 0;
    });

    // 3. Waitlist pending count
    const waitlistPending = byStatus["waitlisted"] || 0;

    return NextResponse.json({
      summary: {
        total,
        active,
        cancelled,
        waitlisted,
        checkedIn:  byStatus["checked_in"]               || 0,
        completed:  byStatus["consultation_completed"]    || 0,
      },
      kpis: {
        bookingSuccessRate,
        // noShowReduction & aiBookingAccuracy require historical/ML pipeline data —
        // documented as realistic mock values in the task guide (INTERN_TEST_GUIDE.md)
        noShowReduction:   32.4,
        aiBookingAccuracy: 94.2,
        avgBookingSpeed:   42, // seconds
      },
      byStatus,
      bySource,
      sourcePercentages,
      waitlist: {
        pending:        waitlistPending,
        conversionRate: 78.4, // requires historical tracking data
        avgWaitDays:    1.8,  // requires date-diff across historical records
      },
    });
  } catch (error) {
    console.error("GET /api/appointments/analytics error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
