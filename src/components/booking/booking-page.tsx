"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  Stethoscope,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Search,
  ChevronRight,
  ChevronLeft,
  Building2,
  UserPlus,
  Users,
  RefreshCw,
  XCircle,
  ClipboardList,
} from "lucide-react";
import { newPatientSchema, lookupSchema, parseErrors } from "@/lib/validation";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-[11px] text-red-500 font-medium">
      <AlertTriangle className="w-3 h-3 flex-shrink-0" />{msg}
    </p>
  );
}

/* ─── Types ─────────────────────────────────────────────────── */
interface HospitalConfig {
  hospitalName: string;
  slotDuration: string;
  openTime: string;
  closeTime: string;
  workingDays: string[];
}

interface Doctor {
  uid: string;
  displayName: string;
  specialization: string;
  departmentId: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  reason?: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  departmentId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
  source: string;
}

type Step = 1 | 2 | 3 | 4;
type ManageStep = "lookup" | "view" | "reschedule" | "cancel_confirm" | "done";

/* ─── Helpers ────────────────────────────────────────────────── */
function todayStr() {
  return new Date().toISOString().split("T")[0];
}

/* ─── Step indicator ─────────────────────────────────────────── */
const STEPS = ["Doctor", "Date & Time", "Patient", "Confirm"];

function StepBar({ current }: { current: Step }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const idx = (i + 1) as Step;
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  done
                    ? "bg-blue-600 text-white"
                    : active
                    ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : idx}
              </div>
              <span
                className={`text-[10px] mt-1 font-semibold ${
                  active ? "text-blue-600" : done ? "text-slate-500" : "text-slate-300"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-1 mb-4 rounded ${done ? "bg-blue-400" : "bg-slate-100"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function BookingPage() {
  const [config, setConfig] = useState<HospitalConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  const [step, setStep] = useState<Step>(1);

  // Step 1 — Doctor
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  // Step 2 — Date & Slot
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Step 3 — Patient
  const [patientTab, setPatientTab] = useState<"search" | "new">("search");
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // New patient form
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [registering, setRegistering] = useState(false);
  const [patientFieldErrors, setPatientFieldErrors] = useState<Record<string,string>>({});
  const [lookupFieldError, setLookupFieldError] = useState("");

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{ id: string; status: string; message: string } | null>(null);
  const [error, setError] = useState("");

  // ── Manage appointment state ──
  const [manageOpen, setManageOpen] = useState(false);
  const [manageStep, setManageStep] = useState<ManageStep>("lookup");
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResults, setLookupResults] = useState<Appointment[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [managedAppt, setManagedAppt] = useState<Appointment | null>(null);
  // Reschedule fields
  const [reschedDate, setReschedDate] = useState(todayStr());
  const [reschedSlots, setReschedSlots] = useState<TimeSlot[]>([]);
  const [reschedSlotsLoading, setReschedSlotsLoading] = useState(false);
  const [reschedSlot, setReschedSlot] = useState<TimeSlot | null>(null);
  const [reschedError, setReschedError] = useState("");
  const [reschedLoading, setReschedLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [manageSuccessMsg, setManageSuccessMsg] = useState("");

  /* ── Load hospital config ── */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/onboarding");
        if (res.ok) {
          const data = await res.json();
          if (data.configured) setConfig(data.config);
        }
      } finally {
        setConfigLoading(false);
      }
    }
    load();
  }, []);

  /* ── Load doctors ── */
  useEffect(() => {
    async function load() {
      try {
        const q = doctorSearch ? `?search=${encodeURIComponent(doctorSearch)}` : "";
        const res = await fetch(`/api/doctors${q}`);
        if (res.ok) {
          const data = await res.json();
          setDoctors(data.doctors || []);
        }
      } catch {}
    }
    load();
  }, [doctorSearch]);

  /* ── Load slots ── */
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return;
    setSelectedSlot(null);
    setSlots([]);
    setSlotsLoading(true);
    async function load() {
      try {
        const res = await fetch(
          `/api/availability?doctorId=${selectedDoctor!.uid}&date=${selectedDate}`
        );
        if (res.ok) {
          const data = await res.json();
          setSlots(data.slots || []);
        }
      } finally {
        setSlotsLoading(false);
      }
    }
    load();
  }, [selectedDoctor, selectedDate]);

  /* ── Search patients ── */
  useEffect(() => {
    if (!patientSearch) { setPatients([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/patients?search=${encodeURIComponent(patientSearch)}`);
        if (res.ok) {
          const data = await res.json();
          setPatients(data.patients || []);
        }
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  /* ── Submit booking ── */
  async function handleBook() {
    if (!selectedDoctor || !selectedSlot || !selectedPatient) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          doctorId: selectedDoctor.uid,
          departmentId: selectedDoctor.departmentId || null,
          appointmentDate: selectedDate,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          source: "website",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessData(data);
        setSuccess(true);
      } else {
        setError(data.error || "Booking failed. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Register new patient ── */
  async function handleRegisterNewPatient() {
    const parsed = newPatientSchema.safeParse({
      firstName: newFirstName, lastName: newLastName,
      phone: newPhone, email: newEmail || undefined,
    });
    if (!parsed.success) {
      setPatientFieldErrors(parseErrors(parsed) as Record<string, string>);
      return;
    }
    setPatientFieldErrors({});
    setRegistering(true);
    setRegisterError("");
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: newFirstName.trim(),
          lastName: newLastName.trim(),
          phone: newPhone.trim(),
          email: newEmail.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedPatient(data.patient);
        setPatientTab("search");
      } else if (res.status === 409) {
        // Already registered — look them up by phone
        const search = await fetch(`/api/patients?search=${encodeURIComponent(newPhone.trim())}`);
        const sData = await search.json();
        if (sData.patients?.length > 0) {
          setSelectedPatient(sData.patients[0]);
          setPatientTab("search");
        } else {
          setRegisterError(data.error);
        }
      } else {
        setRegisterError(data.error || "Registration failed. Please try again.");
      }
    } catch {
      setRegisterError("Network error. Please check your connection.");
    } finally {
      setRegistering(false);
    }
  }

  function resetAll() {
    setStep(1);
    setSelectedDoctor(null);
    setSelectedDate(todayStr());
    setSelectedSlot(null);
    setSelectedPatient(null);
    setPatientSearch("");
    setDoctorSearch("");
    setPatientTab("search");
    setNewFirstName("");
    setNewLastName("");
    setNewPhone("");
    setNewEmail("");
    setRegisterError("");
    setSuccess(false);
    setSuccessData(null);
    setError("");
  }

  /* ── Lookup appointment by phone or email ── */
  async function handleLookup() {
    const parsed = lookupSchema.safeParse({ query: lookupQuery.trim() });
    if (!parsed.success) {
      setLookupFieldError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLookupFieldError("");
    setLookupLoading(true);
    setLookupError("");
    setLookupResults([]);
    try {
      const q = encodeURIComponent(lookupQuery.trim());
      const res = await fetch(`/api/appointments?search=${q}`);
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      if (data.appointments?.length > 0) {
        setLookupResults(data.appointments);
      } else {
        setLookupError("No appointments found. Please check your phone number or email address.");
      }
    } catch {
      setLookupError("Network error. Please try again.");
    } finally {
      setLookupLoading(false);
    }
  }

  /* ── Load reschedule slots when date/doctor changes ── */
  useEffect(() => {
    if (manageStep !== "reschedule" || !managedAppt) return;
    setReschedSlot(null);
    setReschedSlots([]);
    setReschedSlotsLoading(true);
    fetch(`/api/availability?doctorId=${managedAppt.doctorId}&date=${reschedDate}`)
      .then(r => r.json())
      .then(d => setReschedSlots(d.slots || []))
      .catch(() => {})
      .finally(() => setReschedSlotsLoading(false));
  }, [reschedDate, manageStep, managedAppt]);

  /* ── Confirm reschedule ── */
  async function handleReschedule() {
    if (!managedAppt || !reschedSlot) return;
    setReschedLoading(true);
    setReschedError("");
    try {
      const res = await fetch(`/api/appointments/${managedAppt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentDate: reschedDate, startTime: reschedSlot.startTime, endTime: reschedSlot.endTime }),
      });
      const data = await res.json();
      if (res.ok) {
        setManageSuccessMsg(`✅ Appointment rescheduled to ${reschedDate} at ${reschedSlot.startTime}.`);
        setManageStep("done");
      } else {
        setReschedError(data.error || "Reschedule failed.");
      }
    } catch {
      setReschedError("Network error. Please try again.");
    } finally {
      setReschedLoading(false);
    }
  }

  /* ── Confirm cancel ── */
  async function handleCancel() {
    if (!managedAppt) return;
    setCancelLoading(true);
    setCancelError("");
    try {
      const res = await fetch(`/api/appointments/${managedAppt.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setManageSuccessMsg("✅ Appointment cancelled successfully.");
        setManageStep("done");
      } else {
        setCancelError(data.error || "Cancellation failed.");
      }
    } catch {
      setCancelError("Network error. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  }

  function resetManage() {
    setManageOpen(false);
    setManageStep("lookup");
    setLookupQuery("");
    setLookupResults([]);
    setLookupError("");
    setManagedAppt(null);
    setReschedDate(todayStr());
    setReschedSlots([]);
    setReschedSlot(null);
    setReschedError("");
    setCancelError("");
    setManageSuccessMsg("");
  }

  /* ─── Success Screen ─────────────────────────────────────── */
  if (success && successData) {
    return (
      <div className="min-h-screen booking-bg flex items-center justify-center p-4">
        <div className="booking-card w-full max-w-md text-center p-10">
          <div className="flex justify-center mb-5">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-200">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Appointment Confirmed!</h2>
          <p className="text-slate-500 text-sm mb-6">{successData.message}</p>
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-left space-y-3 mb-6">
            <Row icon={<User className="w-4 h-4" />} label="Patient" value={`${selectedPatient!.firstName} ${selectedPatient!.lastName}`} />
            <Row icon={<Stethoscope className="w-4 h-4" />} label="Doctor" value={selectedDoctor!.displayName} />
            <Row icon={<Calendar className="w-4 h-4" />} label="Date" value={selectedDate} />
            <Row icon={<Clock className="w-4 h-4" />} label="Time" value={`${selectedSlot!.startTime} – ${selectedSlot!.endTime}`} />
            <Row icon={<Building2 className="w-4 h-4" />} label="Status" value={successData.status === "waitlisted" ? "⏳ Waitlisted" : "✅ Booked"} />
          </div>
          <p className="text-[11px] text-slate-400 mb-5">Booking ID: <span className="font-mono font-semibold">{successData.id}</span></p>
          <button onClick={resetAll} className="booking-btn w-full">Book Another Appointment</button>
        </div>
      </div>
    );
  }

  /* ─── Main Page ──────────────────────────────────────────── */
  return (
    <div className="min-h-screen booking-bg flex flex-col">
      {/* Header */}
      <header className="booking-header">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            {configLoading ? (
              <div className="h-4 w-40 bg-slate-200 animate-pulse rounded" />
            ) : (
              <h1 className="text-sm font-bold text-slate-800">
                {config?.hospitalName ?? "Hospital"}
              </h1>
            )}
            <p className="text-[11px] text-slate-400 font-medium">Online Appointment Portal</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Book an Appointment</h2>
            <p className="text-slate-500 text-sm mt-1">Complete the steps below to schedule your visit</p>
          </div>

          <StepBar current={step} />

          <div className="booking-card p-7">
            {/* ── STEP 1: Doctor ──────────────────── */}
            {step === 1 && (
              <div>
                <SectionTitle icon={<Stethoscope className="w-4 h-4" />} title="Choose a Doctor" />
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    className="booking-input pl-10"
                    placeholder="Search by name or specialization…"
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                  />
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {doctors.map((doc) => (
                    <button
                      key={doc.uid}
                      onClick={() => setSelectedDoctor(doc)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                        selectedDoctor?.uid === doc.uid
                          ? "border-blue-500 bg-blue-50 shadow-sm"
                          : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-base font-bold text-blue-700">
                          {doc.displayName.split(" ").pop()?.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-800 truncate">{doc.displayName}</p>
                        <p className="text-xs text-slate-400 font-medium">{doc.specialization}</p>
                      </div>
                      {selectedDoctor?.uid === doc.uid && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                  {doctors.length === 0 && (
                    <p className="text-center text-sm text-slate-400 py-6">No doctors found.</p>
                  )}
                </div>
                <NavBar
                  onNext={() => setStep(2)}
                  nextDisabled={!selectedDoctor}
                  hideBack
                />
              </div>
            )}

            {/* ── STEP 2: Date & Slot ─────────────── */}
            {step === 2 && (
              <div>
                <SectionTitle icon={<Calendar className="w-4 h-4" />} title="Pick Date & Time" />
                <div className="mb-4">
                  <label className="field-label">Appointment Date</label>
                  <input
                    type="date"
                    className="booking-input"
                    value={selectedDate}
                    min={todayStr()}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="field-label mb-0">Available Slots</label>
                    {slotsLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />}
                  </div>
                  {slotsLoading ? (
                    <div className="grid grid-cols-3 gap-2">
                      {[...Array(9)].map((_, i) => (
                        <div key={i} className="h-9 rounded-xl bg-slate-100 animate-pulse" />
                      ))}
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <p className="text-xs text-amber-700 font-medium">No slots available on this date. Try another day.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-0.5">
                      {slots.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          disabled={!s.available}
                          onClick={() => setSelectedSlot(s)}
                          className={`h-9 rounded-xl text-[11px] font-bold border transition-all ${
                            selectedSlot?.startTime === s.startTime
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : s.available
                              ? "bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                              : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                          }`}
                        >
                          {s.startTime}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <NavBar onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!selectedSlot} />
              </div>
            )}

            {/* ── STEP 3: Patient ─────────────────── */}
            {step === 3 && (
              <div>
                <SectionTitle icon={<User className="w-4 h-4" />} title="Your Details" />

                {/* Selected patient pill */}
                {selectedPatient ? (
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-blue-200 bg-blue-50 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-white">{selectedPatient.firstName.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                        <p className="text-xs text-slate-500">{selectedPatient.phone}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelectedPatient(null); setPatientSearch(""); setNewFirstName(""); setNewLastName(""); setNewPhone(""); setNewEmail(""); setRegisterError(""); }}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-700 transition-colors"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Tab switcher */}
                    <div className="flex rounded-xl border border-slate-200 p-1 mb-4 bg-slate-50">
                      <button
                        onClick={() => { setPatientTab("search"); setRegisterError(""); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                          patientTab === "search"
                            ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        Existing Patient
                      </button>
                      <button
                        onClick={() => { setPatientTab("new"); setPatientSearch(""); setPatients([]); setRegisterError(""); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                          patientTab === "new"
                            ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        New Patient
                      </button>
                    </div>

                    {/* ── Search tab ── */}
                    {patientTab === "search" && (
                      <div>
                        <div className="relative mb-2">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input
                            className="booking-input pl-10"
                            placeholder="Search by name or phone…"
                            value={patientSearch}
                            onChange={(e) => setPatientSearch(e.target.value)}
                          />
                        </div>
                        {patients.length > 0 && (
                          <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm mb-3">
                            {patients.map((p) => (
                              <button
                                key={p.id}
                                onClick={() => { setSelectedPatient(p); setPatients([]); setPatientSearch(""); }}
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 flex items-center gap-3"
                              >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-bold text-purple-700">{p.firstName.charAt(0)}</span>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">{p.firstName} {p.lastName}</p>
                                  <p className="text-xs text-slate-400">{p.phone}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {patientSearch && patients.length === 0 && (
                          <div className="text-center py-4">
                            <p className="text-xs text-slate-400 mb-2">No patients found with that name or phone.</p>
                            <button
                              onClick={() => { setPatientTab("new"); setNewPhone(patientSearch); }}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
                            >
                              Register as new patient →
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── New patient tab ── */}
                    {patientTab === "new" && (
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="field-label">First Name *</label>
                            <input
                              className={"booking-input" + (patientFieldErrors.firstName ? " border-red-400 focus:border-red-400" : "")}
                              placeholder="e.g. John"
                              value={newFirstName}
                              onChange={(e) => { setNewFirstName(e.target.value); setPatientFieldErrors(p => ({...p, firstName: ""})); setRegisterError(""); }}
                            />
                            <FieldError msg={patientFieldErrors.firstName} />
                          </div>
                          <div className="flex-1">
                            <label className="field-label">Last Name *</label>
                            <input
                              className={"booking-input" + (patientFieldErrors.lastName ? " border-red-400 focus:border-red-400" : "")}
                              placeholder="e.g. Smith"
                              value={newLastName}
                              onChange={(e) => { setNewLastName(e.target.value); setPatientFieldErrors(p => ({...p, lastName: ""})); setRegisterError(""); }}
                            />
                            <FieldError msg={patientFieldErrors.lastName} />
                          </div>
                        </div>
                        <div>
                          <label className="field-label">Phone Number *</label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                              className={"booking-input pl-10" + (patientFieldErrors.phone ? " border-red-400 focus:border-red-400" : "")}
                              placeholder="+1-555-000-0000"
                              value={newPhone}
                              onChange={(e) => { setNewPhone(e.target.value); setPatientFieldErrors(p => ({...p, phone: ""})); setRegisterError(""); }}
                            />
                          </div>
                          <FieldError msg={patientFieldErrors.phone} />
                        </div>
                        <div>
                          <label className="field-label">Email <span className="text-slate-300 font-normal">(optional)</span></label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                              className={"booking-input pl-10" + (patientFieldErrors.email ? " border-red-400 focus:border-red-400" : "")}
                              placeholder="you@example.com"
                              value={newEmail}
                              onChange={(e) => { setNewEmail(e.target.value); setPatientFieldErrors(p => ({...p, email: ""})); }}
                            />
                          </div>
                          <FieldError msg={patientFieldErrors.email} />
                        </div>

                        {registerError && (
                          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <p className="text-xs text-red-700 font-medium">{registerError}</p>
                          </div>
                        )}

                        <button
                          onClick={handleRegisterNewPatient}
                          disabled={registering}
                          className="booking-btn w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {registering ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                          {registering ? "Registering…" : "Register & Continue"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <NavBar onBack={() => setStep(2)} onNext={() => setStep(4)} nextDisabled={!selectedPatient} />
              </div>
            )}

            {/* ── STEP 4: Confirm ─────────────────── */}
            {step === 4 && (
              <div>
                <SectionTitle icon={<CheckCircle2 className="w-4 h-4" />} title="Confirm Booking" />
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-100 rounded-2xl p-5 space-y-3 mb-5">
                  <Row icon={<User className="w-4 h-4 text-blue-500" />} label="Patient" value={`${selectedPatient!.firstName} ${selectedPatient!.lastName}`} />
                  <Row icon={<Phone className="w-4 h-4 text-blue-500" />} label="Phone" value={selectedPatient!.phone} />
                  <Row icon={<Stethoscope className="w-4 h-4 text-blue-500" />} label="Doctor" value={selectedDoctor!.displayName} />
                  <Row icon={<Building2 className="w-4 h-4 text-blue-500" />} label="Specialization" value={selectedDoctor!.specialization} />
                  <Row icon={<Calendar className="w-4 h-4 text-blue-500" />} label="Date" value={selectedDate} />
                  <Row icon={<Clock className="w-4 h-4 text-blue-500" />} label="Time" value={`${selectedSlot!.startTime} – ${selectedSlot!.endTime}`} />
                </div>
                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-700 font-medium">{error}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => setStep(3)} className="booking-btn-outline flex-1">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={handleBook}
                    disabled={submitting}
                    className="booking-btn flex-1 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {submitting ? "Booking…" : "Confirm Booking"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Manage Appointment Panel ── */}
      <div className="max-w-lg mx-auto w-full px-4 pb-10">
        <button
          onClick={() => { setManageOpen(o => !o); if (manageOpen) resetManage(); }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-200 text-xs font-semibold transition-all shadow-sm"
        >
          <ClipboardList className="w-4 h-4" />
          {manageOpen ? "Close" : "Manage an Existing Appointment"}
        </button>

        {manageOpen && (
          <div className="booking-card mt-3 p-6">
            {/* \u2500\u2500 LOOKUP \u2500\u2500 */}
            {manageStep === "lookup" && (
              <div>
                <SectionTitle icon={<Search className="w-4 h-4" />} title="Find Your Appointment" />
                <p className="text-xs text-slate-400 mb-4">Enter your registered phone number or email address to find your appointment.</p>
                <div className="relative mb-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    className={"booking-input pl-10" + (lookupFieldError ? " border-red-400 focus:border-red-400" : "")}
                    placeholder="Phone number or email address…"
                    value={lookupQuery}
                    onChange={e => { setLookupQuery(e.target.value); setLookupError(""); setLookupFieldError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleLookup()}
                  />
                </div>
                {lookupFieldError && (
                  <p className="mb-2 flex items-center gap-1 text-[11px] text-red-500 font-medium">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />{lookupFieldError}
                  </p>
                )}
                {lookupError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl p-3 mb-3">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-700 font-medium">{lookupError}</p>
                  </div>
                )}
                {lookupResults.length > 0 && (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm mb-3">
                    {lookupResults.map(appt => (
                      <button
                        key={appt.id}
                        onClick={() => { setManagedAppt(appt); setManageStep("view"); }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{appt.patientName}</p>
                            <p className="text-xs text-slate-400">{appt.doctorName} · {appt.appointmentDate} {appt.startTime}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${appt.status === "cancelled" ? "bg-red-100 text-red-600" : appt.status === "waitlisted" ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-700"}`}>
                            {appt.status}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={handleLookup}
                  disabled={lookupLoading || !lookupQuery.trim()}
                  className="booking-btn w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {lookupLoading ? "Searching…" : "Search"}
                </button>
              </div>
            )}

            {/* \u2500\u2500 VIEW \u2500\u2500 */}
            {manageStep === "view" && managedAppt && (
              <div>
                <SectionTitle icon={<ClipboardList className="w-4 h-4" />} title="Appointment Details" />
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-100 rounded-2xl p-5 space-y-3 mb-5">
                  <Row icon={<User className="w-4 h-4 text-blue-500" />} label="Patient" value={managedAppt.patientName} />
                  <Row icon={<Phone className="w-4 h-4 text-blue-500" />} label="Phone" value={managedAppt.patientPhone} />
                  <Row icon={<Stethoscope className="w-4 h-4 text-blue-500" />} label="Doctor" value={managedAppt.doctorName} />
                  <Row icon={<Calendar className="w-4 h-4 text-blue-500" />} label="Date" value={managedAppt.appointmentDate} />
                  <Row icon={<Clock className="w-4 h-4 text-blue-500" />} label="Time" value={`${managedAppt.startTime} – ${managedAppt.endTime}`} />
                  <Row icon={<Building2 className="w-4 h-4 text-blue-500" />} label="Status" value={managedAppt.status} />
                </div>
                <p className="text-[10px] text-slate-400 font-mono mb-4 text-center">ID: {managedAppt.id}</p>
                {managedAppt.status === "cancelled" ? (
                  <p className="text-xs text-center text-slate-400 py-2">This appointment has already been cancelled.</p>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setReschedDate(managedAppt.appointmentDate); setManageStep("reschedule"); }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Reschedule
                    </button>
                    <button
                      onClick={() => setManageStep("cancel_confirm")}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </div>
                )}
                <button onClick={() => setManageStep("lookup")} className="w-full mt-3 text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2">← Back to search</button>
              </div>
            )}

            {/* \u2500\u2500 RESCHEDULE \u2500\u2500 */}
            {manageStep === "reschedule" && managedAppt && (
              <div>
                <SectionTitle icon={<RefreshCw className="w-4 h-4" />} title="Reschedule Appointment" />
                <div className="mb-4">
                  <label className="field-label">New Date</label>
                  <input type="date" className="booking-input" value={reschedDate} min={todayStr()} onChange={e => setReschedDate(e.target.value)} />
                </div>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="field-label mb-0">Available Slots</label>
                    {reschedSlotsLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />}
                  </div>
                  {reschedSlotsLoading ? (
                    <div className="grid grid-cols-3 gap-2">{[...Array(6)].map((_, i) => <div key={i} className="h-9 rounded-xl bg-slate-100 animate-pulse" />)}</div>
                  ) : reschedSlots.length === 0 ? (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <p className="text-xs text-amber-700 font-medium">No slots available on this date.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                      {reschedSlots.map((s, i) => (
                        <button key={i} type="button" disabled={!s.available} onClick={() => setReschedSlot(s)}
                          className={`h-9 rounded-xl text-[11px] font-bold border transition-all ${reschedSlot?.startTime === s.startTime ? "bg-blue-600 text-white border-blue-600" : s.available ? "bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50" : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"}`}>
                          {s.startTime}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {reschedError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl p-3 mb-3">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-700 font-medium">{reschedError}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => setManageStep("view")} className="booking-btn-outline flex-1 flex items-center justify-center gap-1"><ChevronLeft className="w-4 h-4" /> Back</button>
                  <button onClick={handleReschedule} disabled={reschedLoading || !reschedSlot} className="booking-btn flex-1 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                    {reschedLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {reschedLoading ? "Saving…" : "Confirm"}
                  </button>
                </div>
              </div>
            )}

            {/* \u2500\u2500 CANCEL CONFIRM \u2500\u2500 */}
            {manageStep === "cancel_confirm" && managedAppt && (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">Cancel Appointment?</h3>
                <p className="text-xs text-slate-500 mb-1">You are about to cancel the following appointment:</p>
                <p className="text-sm font-semibold text-slate-700 mb-1">{managedAppt.doctorName}</p>
                <p className="text-xs text-slate-500 mb-5">{managedAppt.appointmentDate} at {managedAppt.startTime}</p>
                <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-xl p-2 mb-4">⚠ Cancellations must be made at least 2 hours before the appointment.</p>
                {cancelError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl p-3 mb-3 text-left">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-700 font-medium">{cancelError}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => setManageStep("view")} className="booking-btn-outline flex-1 flex items-center justify-center gap-1"><ChevronLeft className="w-4 h-4" /> Back</button>
                  <button onClick={handleCancel} disabled={cancelLoading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-all disabled:opacity-40">
                    {cancelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    {cancelLoading ? "Cancelling…" : "Yes, Cancel"}
                  </button>
                </div>
              </div>
            )}

            {/* \u2500\u2500 DONE \u2500\u2500 */}
            {manageStep === "done" && (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700 mb-5">{manageSuccessMsg}</p>
                <button onClick={resetManage} className="booking-btn w-full">Done</button>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="text-center py-4">
        <p className="text-[11px] text-slate-400">
          {config?.hospitalName ?? "Hospital"} · Powered by Settlement Sense OS
        </p>
      </footer>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */
function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">{icon}</div>
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-slate-400 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
      </div>
    </div>
  );
}

function NavBar({
  onBack,
  onNext,
  nextDisabled,
  hideBack,
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  hideBack?: boolean;
}) {
  return (
    <div className="flex gap-3 mt-6">
      {!hideBack && onBack && (
        <button onClick={onBack} className="booking-btn-outline flex-1 flex items-center justify-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      )}
      {onNext && (
        <button
          onClick={onNext}
          disabled={nextDisabled}
          className="booking-btn flex-1 flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
