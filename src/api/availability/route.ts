import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/db/session";
import { query } from "@/lib/db/client";

// GET /api/availability?doctorId={uuid}&date={yyyy-mm-dd}
// Queries availability slots for a doctor on a specific date
export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const doctorId = url.searchParams.get("doctorId");
  const dateStr = url.searchParams.get("date"); // YYYY-MM-DD

  if (!doctorId || !dateStr) {
    return NextResponse.json({ error: "Missing doctorId or date" }, { status: 400 });
  }

  try {
    // 1. Fetch doctor details and availability_json
    const doctorResult = await query(
      `SELECT u.full_name as name, d.availability_json 
       FROM users u
       JOIN doctors d ON d.user_id = u.id
       WHERE u.id = $1 AND u.role = 'doctor'`,
      [doctorId]
    );

    if (doctorResult.rows.length === 0) {
      return NextResponse.json({ error: "Doctor profile not found" }, { status: 404 });
    }

    const { availability_json } = doctorResult.rows[0];
    const defaultSettings = {
      workingDays: [1, 2, 3, 4, 5],
      startTime: "09:00 AM",
      endTime: "05:00 PM",
      durationMinutes: 15,
      maxDailyLimit: 30,
      cancellationWindowHours: 2
    };
    
    const settings = { ...defaultSettings, ...(availability_json || {}) };

    // 2. Determine Day of Week (1 = Mon, 7 = Sun)
    const dateObj = new Date(dateStr);
    let dayOfWeek = dateObj.getDay(); // 0 = Sun, 1 = Mon...
    if (dayOfWeek === 0) dayOfWeek = 7; // Convert Sunday to 7

    // Check if the doctor works on this day
    const isWorkingDay = settings.workingDays.includes(dayOfWeek);
    if (!isWorkingDay) {
      return NextResponse.json({ slots: [], message: "Doctor does not consult on this day of the week" });
    }

    // 3. Fetch active appointments booked for this doctor on this day
    const appointmentsResult = await query(
      `SELECT start_time, status 
       FROM appointments 
       WHERE doctor_id = $1 
         AND appointment_date = $2 
         AND status NOT IN ('cancelled', 'waitlisted')`,
      [doctorId, dateStr]
    );
    const bookedTimes = new Set(appointmentsResult.rows.map((r: any) => r.start_time));

    // TODO: Intern Implementation - Generate slots and perform collision check:
    //
    // STEP 1: Parse settings.startTime and settings.endTime (e.g. '09:00 AM', '05:00 PM')
    // Convert them to minutes-since-midnight (e.g. '09:00 AM' -> 540, '05:00 PM' -> 1020).
    // Note: Write a helper function to convert 'HH:MM AM/PM' to minutes.
    const timeToMinutes = (t: string): number => {
      const [time, period] = t.split(' ');
      const [h, m] = time.split(':').map(Number);
      let hours = h % 12;
      if (period === 'PM') hours += 12;
      return hours * 60 + m;
    };

    const toAmPm = (minutes: number): string => {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      const ampm = h >= 12 ? "PM" : "AM";
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      const displayMin = String(m).padStart(2, "0");
      return `${displayHour}:${displayMin} ${ampm}`;
    };

    const startMinutes = timeToMinutes(settings.startTime);
    const endMinutes = timeToMinutes(settings.endTime);
    const duration = settings.durationMinutes;

    // STEP 2: Iterate from startMinutes to endMinutes in steps of settings.durationMinutes.
    // In each step, calculate slot start and end times (e.g. '09:00 AM' to '09:15 AM').
    const slots: any[] = [];
    const isToday = dateStr === new Date().toISOString().split('T')[0];
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    for (let time = startMinutes; time < endMinutes; time += duration) {
      const slotStart = toAmPm(time);
      const slotEnd = toAmPm(time + duration);

      // STEP 3: Check Collision
      // If the slot start time (e.g. '09:00 AM') is present in `bookedTimes` (the Set created above):
      //   - Mark slot as `available: false`, and set a reason (e.g., "Occupied").
      // Else if the slot falls in the past (only for today's date):
      //   - Mark slot as `available: false`, and set a reason (e.g., "Past time").
      // Else:
      //   - Mark slot as `available: true`.
      if (bookedTimes.has(slotStart)) {
        slots.push({ startTime: slotStart, endTime: slotEnd, available: false, reason: "Occupied" });
      } else if (isToday && time < nowMinutes) {
        slots.push({ startTime: slotStart, endTime: slotEnd, available: false, reason: "Past time" });
      } else {
        slots.push({ startTime: slotStart, endTime: slotEnd, available: true });
      }
    }

    // STEP 4: Return slots array

    return NextResponse.json({ slots });
  } catch (error) {
    console.error("GET availability error:", error);
    return NextResponse.json({ error: "Failed to load doctor availability" }, { status: 500 });
  }
}