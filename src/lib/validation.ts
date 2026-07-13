import { z } from "zod";

/* ─── Reusable primitives ───────────────────────────────────── */

export const phoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .regex(
    /^\+?[0-9\s\-().]{7,15}$/,
    "Enter a valid phone number (7–15 digits, optionally starting with +)"
  );

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Enter a valid email address (e.g. admin@hospital.com)");

export const optionalEmailSchema = z
  .string()
  .optional()
  .refine(
    (v) => !v || z.string().email().safeParse(v).success,
    "Enter a valid email address"
  );

/* ─── Onboarding wizard schemas (per-step) ──────────────────── */

export const step1Schema = z.object({
  hospitalName: z
    .string()
    .min(2, "Hospital name must be at least 2 characters")
    .max(120, "Hospital name is too long"),
  registrationNumber: z
    .string()
    .min(3, "Registration number must be at least 3 characters")
    .max(50, "Registration number is too long"),
  website: z
    .string()
    .optional()
    .refine(
      (v) =>
        !v ||
        /^https?:\/\/.+\..+/.test(v),
      "Website must start with http:// or https://"
    ),
});

export const step2Schema = z.object({
  adminName: z
    .string()
    .min(2, "Admin name must be at least 2 characters")
    .max(80, "Name is too long"),
  adminEmail: emailSchema,
  adminPhone: phoneSchema,
});

export const step3Schema = z.object({
  workingDays: z.array(z.string()).min(1, "Select at least one working day"),
  openTime: z.string().min(1, "Opening time is required"),
  closeTime: z.string().min(1, "Closing time is required"),
  maxDailyAppointments: z
    .string()
    .refine(
      (v) => {
        const n = parseInt(v, 10);
        return !isNaN(n) && n >= 1 && n <= 500;
      },
      "Must be between 1 and 500"
    ),
}).refine(
  (d) => d.openTime < d.closeTime,
  { message: "Closing time must be after opening time", path: ["closeTime"] }
);

export const whatsappSchema = z.object({
  whatsappNumber: phoneSchema,
});

/* ─── New patient registration schema ───────────────────────── */

export const newPatientSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name is too long")
    .regex(/^[A-Za-z\s'-]+$/, "First name should only contain letters"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name is too long")
    .regex(/^[A-Za-z\s'-]+$/, "Last name should only contain letters"),
  phone: phoneSchema,
  email: optionalEmailSchema,
});

/* ─── Appointment lookup schema ─────────────────────────────── */

export const lookupSchema = z.object({
  query: z
    .string()
    .min(1, "Enter a phone number or email address")
    .refine(
      (v) =>
        z.string().email().safeParse(v).success ||
        /^\+?[0-9\s\-().]{7,15}$/.test(v),
      "Enter a valid phone number or email address"
    ),
});

/* ─── Utility: extract flat errors from ZodError ───────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FieldErrors<T = any> = Partial<Record<keyof T, string>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseErrors(result: { success: boolean; error?: z.ZodError<any> }): FieldErrors {
  if (result.success || !result.error) return {};
  const out: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as string;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
