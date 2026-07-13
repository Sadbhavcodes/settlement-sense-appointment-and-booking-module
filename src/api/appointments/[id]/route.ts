import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/db/session";
import { query } from "@/lib/db/client";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { status, appointmentDate, startTime, endTime } = body;

    try {
        if (status === 'checked_in') {
            const apptRes = await query(
                `SELECT patient_id, doctor_id FROM appointments WHERE id = $1`,
                [id]
            );
            if (apptRes.rows.length === 0) {
                return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
            }
            const { patient_id, doctor_id } = apptRes.rows[0];

            await query(
                `INSERT INTO queue_entries (patient_id, doctor_id, appointment_id, status, created_at)
         VALUES ($1, $2, $3, 'waiting', now())`,
                [patient_id, doctor_id, id]
            );
        }
        if (appointmentDate && startTime) {
            const newDate = new Date(appointmentDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (newDate < today) {
                return NextResponse.json({ error: "Cannot reschedule to a past date" }, { status: 400 });
            }

            const conflict = await query(
                `SELECT id FROM appointments
         WHERE doctor_id = (SELECT doctor_id FROM appointments WHERE id = $1)
         AND appointment_date = $2 AND start_time = $3
         AND status NOT IN ('cancelled', 'waitlisted')
         AND id != $1`,
                [id, appointmentDate, startTime]
            );
            if (conflict.rows.length > 0) {
                return NextResponse.json({ error: "Time slot is already occupied" }, { status: 400 });
            }
        }

        const updated = await query(
            `UPDATE appointments
       SET status = COALESCE($1, status),
           appointment_date = COALESCE($2, appointment_date),
           start_time = COALESCE($3, start_time),
           end_time = COALESCE($4, end_time),
           updated_at = now()
       WHERE id = $5
       RETURNING id, status`,
            [status || null, appointmentDate || null, startTime || null, endTime || null, id]
        );

        if (updated.rows.length === 0) {
            return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, appointment: updated.rows[0] });


    } catch (error) {
        console.error("PATCH appointment error:", error);
        return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
    }

}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    try {
        const apptRes = await query(
            `SELECT a.appointment_date, a.start_time, d.availability_json
       FROM appointments a
       JOIN doctors d ON d.user_id = a.doctor_id
       WHERE a.id = $1`,
            [id]
        );

        if (apptRes.rows.length === 0) {
            return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
        }

        const { appointment_date, start_time, availability_json } = apptRes.rows[0];
        const cancellationWindowHours = availability_json?.cancellationWindowHours ?? 2;

        const apptDateTime = new Date(`${appointment_date.toISOString().split('T')[0]} ${start_time}`);
        const hoursUntil = (apptDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

        if (hoursUntil < cancellationWindowHours) {
            return NextResponse.json(
                { error: `Cancellation window has expired. Must cancel at least ${cancellationWindowHours} hours before.` },
                { status: 400 }
            );
        }
        await query(
            `UPDATE appointments SET status = 'cancelled', updated_at = now() WHERE id = $1`,
            [id]
        );

        return NextResponse.json({ success: true, message: "Appointment cancelled successfully" });
    } catch (error) {
        console.error("DELETE appointment error:", error);
        return NextResponse.json({ error: "Failed to cancel appointment" }, { status: 500 });
    }
}