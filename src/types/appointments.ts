// TypeScript Interfaces for the Appointment Journey Module
// TODO: Intern Implementation - Review or extend these interfaces if needed.

export type AppointmentStatus =
  | "created"
  | "confirmed"
  | "reminder_sent"
  | "checked_in"
  | "consultation_completed"
  | "cancelled"
  | "waitlisted";

export type AppointmentSource =
  | "ai_voice"
  | "website"
  | "mobile"
  | "whatsapp"
  | "reception";

export interface Appointment {
  id: string;
  patientId: string;
  patientName?: string; // resolved on fetch joins
  patientPhone?: string; // resolved on fetch joins
  doctorId: string;
  doctorName?: string; // resolved on fetch joins
  departmentId?: string;
  appointmentDate: string; // ISO date string 'YYYY-MM-DD'
  startTime: string; // Format e.g., '09:00 AM'
  endTime: string; // Format e.g., '09:15 AM'
  status: AppointmentStatus;
  source: AppointmentSource;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorAvailabilitySettings {
  workingDays: number[]; // 1 = Monday, 2 = Tuesday ... 7 = Sunday
  startTime: string; // '09:00 AM'
  endTime: string; // '05:00 PM'
  durationMinutes: number; // 15, 30, 60
  maxDailyLimit: number;
  cancellationWindowHours: number;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  reason?: string; // e.g. "occupied", "limit reached", "past time"
}
