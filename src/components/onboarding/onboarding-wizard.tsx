"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Phone, Clock, Users, ChevronRight, ChevronLeft,
  CheckCircle2, Stethoscope, Globe, Mail, MapPin, CalendarDays,
  Shield, AlertCircle, Loader2,
} from "lucide-react";
import {
  step1Schema, step2Schema, step3Schema, whatsappSchema,
  parseErrors, FieldErrors,
} from "@/lib/validation";

/* ─── Types ─────────────────────────────────────────────────── */
interface HospitalConfig {
  hospitalName: string;
  registrationNumber: string;
  hospitalType: string;
  website: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  address: string;
  city: string;
  country: string;
  workingDays: string[];
  openTime: string;
  closeTime: string;
  slotDuration: string;
  maxDailyAppointments: string;
  enableWhatsApp: boolean;
  enableVoiceBot: boolean;
  enableWebPortal: boolean;
  enableMobileApp: boolean;
  whatsappNumber: string;
}

const DEFAULT: HospitalConfig = {
  hospitalName: "", registrationNumber: "", hospitalType: "general", website: "",
  adminName: "", adminEmail: "", adminPhone: "", address: "", city: "", country: "",
  workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"],
  openTime: "08:00", closeTime: "17:00", slotDuration: "30", maxDailyAppointments: "50",
  enableWhatsApp: true, enableVoiceBot: false, enableWebPortal: true, enableMobileApp: false,
  whatsappNumber: "",
};

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const HOSPITAL_TYPES = [
  { value: "general", label: "General Hospital" },
  { value: "specialist", label: "Specialist Clinic" },
  { value: "polyclinic", label: "Polyclinic" },
  { value: "teaching", label: "Teaching Hospital" },
  { value: "private", label: "Private Hospital" },
  { value: "community", label: "Community Health Centre" },
];
const SLOT_DURATIONS = [
  { value: "15", label: "15 minutes" }, { value: "20", label: "20 minutes" },
  { value: "30", label: "30 minutes" }, { value: "45", label: "45 minutes" },
  { value: "60", label: "60 minutes" },
];
const STEPS = [
  { id: 1, title: "Hospital Identity",  icon: Building2,    description: "Basic information about your facility" },
  { id: 2, title: "Contact & Location", icon: MapPin,       description: "Administrator contact and address details" },
  { id: 3, title: "Scheduling Setup",   icon: CalendarDays, description: "Working hours and appointment configuration" },
  { id: 4, title: "Booking Channels",   icon: Globe,        description: "Enable the channels patients can use to book" },
] as const;

const INPUT =
  "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] text-slate-800 bg-white " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 " +
  "transition-all duration-150";
const LABEL = "block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5";

/* ─── Steps ──────────────────────────────────────────────────── */
function Step1({ data, onChange, errors }: { data: HospitalConfig; onChange: (k: keyof HospitalConfig, v: string) => void; errors: FieldErrors<any> }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <label className={LABEL}>Hospital / Facility Name *</label>
          <input id="hospitalName" className={INPUT + (errors.hospitalName ? " border-red-400 focus:border-red-400 focus:ring-red-400/20" : "")} placeholder="e.g. City General Hospital" value={data.hospitalName}
            onChange={e => onChange("hospitalName", e.target.value)} />
          <FieldError msg={errors.hospitalName} />
        </div>
        <div>
          <label className={LABEL}>Registration Number *</label>
          <input id="registrationNumber" className={INPUT + (errors.registrationNumber ? " border-red-400 focus:border-red-400 focus:ring-red-400/20" : "")} placeholder="e.g. MOH-2024-00123" value={data.registrationNumber}
            onChange={e => onChange("registrationNumber", e.target.value)} />
          <FieldError msg={errors.registrationNumber} />
        </div>
        <div>
          <label className={LABEL}>Facility Type *</label>
          <select id="hospitalType" className={INPUT} value={data.hospitalType}
            onChange={e => onChange("hospitalType", e.target.value)}>
            {HOSPITAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL}>Official Website</label>
          <div className="relative">
            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input id="website" className={INPUT + " pl-9" + (errors.website ? " border-red-400 focus:border-red-400 focus:ring-red-400/20" : "")} placeholder="https://yourhospital.com" value={data.website}
              onChange={e => onChange("website", e.target.value)} />
          </div>
          <FieldError msg={errors.website} />
        </div>
      </div>
    </div>
  );
}

function Step2({ data, onChange, errors }: { data: HospitalConfig; onChange: (k: keyof HospitalConfig, v: string) => void; errors: FieldErrors<any> }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <label className={LABEL}>Primary Administrator Name *</label>
          <div className="relative">
            <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input id="adminName" className={INPUT + " pl-9" + (errors.adminName ? " border-red-400 focus:border-red-400 focus:ring-red-400/20" : "")} placeholder="Full name" value={data.adminName}
              onChange={e => onChange("adminName", e.target.value)} />
          </div>
          <FieldError msg={errors.adminName} />
        </div>
        <div>
          <label className={LABEL}>Admin Email *</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input id="adminEmail" type="email" className={INPUT + " pl-9" + (errors.adminEmail ? " border-red-400 focus:border-red-400 focus:ring-red-400/20" : "")} placeholder="admin@hospital.com" value={data.adminEmail}
              onChange={e => onChange("adminEmail", e.target.value)} />
          </div>
          <FieldError msg={errors.adminEmail} />
        </div>
        <div>
          <label className={LABEL}>Admin Phone *</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input id="adminPhone" type="tel" className={INPUT + " pl-9" + (errors.adminPhone ? " border-red-400 focus:border-red-400 focus:ring-red-400/20" : "")} placeholder="+1 000 000 0000" value={data.adminPhone}
              onChange={e => onChange("adminPhone", e.target.value)} />
          </div>
          <FieldError msg={errors.adminPhone} />
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL}>Street Address</label>
          <input id="address" className={INPUT} placeholder="123 Healthcare Ave" value={data.address}
            onChange={e => onChange("address", e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>City</label>
          <input id="city" className={INPUT} placeholder="City" value={data.city}
            onChange={e => onChange("city", e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>Country</label>
          <input id="country" className={INPUT} placeholder="Country" value={data.country}
            onChange={e => onChange("country", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

function Step3({ data, onChange, onToggleDay, errors }: { data: HospitalConfig; onChange: (k: keyof HospitalConfig, v: string) => void; onToggleDay: (day: string) => void; errors: FieldErrors<any> }) {
  return (
    <div className="space-y-6">
      <div>
        <label className={LABEL}>Working Days *</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {DAYS.map(day => {
            const active = data.workingDays.includes(day);
            return (
              <button key={day} type="button" onClick={() => onToggleDay(day)}
                className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold border transition-all duration-150 ${
                  active ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                }`}>
                {day.slice(0, 3)}
              </button>
            );
          })}
        </div>
        <FieldError msg={errors.workingDays} />
      </div>
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className={LABEL}>Opening Time *</label>
          <div className="relative">
            <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input id="openTime" type="time" className={INPUT + " pl-9" + (errors.openTime ? " border-red-400" : "")} value={data.openTime}
              onChange={e => onChange("openTime", e.target.value)} />
          </div>
          <FieldError msg={errors.openTime} />
        </div>
        <div>
          <label className={LABEL}>Closing Time *</label>
          <div className="relative">
            <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input id="closeTime" type="time" className={INPUT + " pl-9" + (errors.closeTime ? " border-red-400" : "")} value={data.closeTime}
              onChange={e => onChange("closeTime", e.target.value)} />
          </div>
          <FieldError msg={errors.closeTime} />
        </div>
        <div>
          <label className={LABEL}>Slot Duration *</label>
          <select id="slotDuration" className={INPUT} value={data.slotDuration}
            onChange={e => onChange("slotDuration", e.target.value)}>
            {SLOT_DURATIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Max Daily Appointments *</label>
          <input id="maxDailyAppointments" type="number" min="1" max="500" className={INPUT + (errors.maxDailyAppointments ? " border-red-400" : "")} value={data.maxDailyAppointments}
            onChange={e => onChange("maxDailyAppointments", e.target.value)} />
          <FieldError msg={errors.maxDailyAppointments} />
        </div>
      </div>
    </div>
  );
}

function ChannelCard({ id, label, sublabel, icon, enabled, onToggle, children }: {
  id: string; label: string; sublabel: string; icon: React.ReactNode;
  enabled: boolean; onToggle: () => void; children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${enabled ? "border-blue-200 bg-blue-50/40" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${enabled ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"}`}>{icon}</div>
          <div>
            <p className="text-[13px] font-bold text-slate-800">{label}</p>
            <p className="text-[11px] text-slate-500">{sublabel}</p>
          </div>
        </div>
        <button id={id} type="button" onClick={onToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${enabled ? "bg-blue-600" : "bg-slate-200"}`}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>
      {enabled && children && <div className="px-5 pb-4 pt-1 border-t border-blue-100">{children}</div>}
    </div>
  );
}

function Step4({ data, onToggleChannel, onChange, errors }: {
  data: HospitalConfig; onToggleChannel: (k: keyof HospitalConfig) => void;
  onChange: (k: keyof HospitalConfig, v: string) => void; errors: FieldErrors<any>;
}) {
  return (
    <div className="space-y-3">
      <ChannelCard id="toggle-whatsapp" label="WhatsApp Bot" sublabel="Patients book via WhatsApp conversations"
        icon={<Phone className="h-4 w-4" />} enabled={data.enableWhatsApp} onToggle={() => onToggleChannel("enableWhatsApp")}>
        <div className="pt-3">
          <label className={LABEL}>WhatsApp Business Number</label>
          <input id="whatsappNumber" type="tel" className={INPUT + (errors.whatsappNumber ? " border-red-400" : "")} placeholder="+1 000 000 0000" value={data.whatsappNumber}
            onChange={e => onChange("whatsappNumber", e.target.value)} />
          <FieldError msg={errors.whatsappNumber} />
        </div>
      </ChannelCard>
      <ChannelCard id="toggle-voicebot" label="AI Voice Bot" sublabel="Automated phone booking via voice AI"
        icon={<Stethoscope className="h-4 w-4" />} enabled={data.enableVoiceBot} onToggle={() => onToggleChannel("enableVoiceBot")} />
      <ChannelCard id="toggle-webportal" label="Web Patient Portal" sublabel="Patients self-book from your website"
        icon={<Globe className="h-4 w-4" />} enabled={data.enableWebPortal} onToggle={() => onToggleChannel("enableWebPortal")} />
      <ChannelCard id="toggle-mobileapp" label="Mobile Application" sublabel="iOS & Android patient booking app"
        icon={<Phone className="h-4 w-4" />} enabled={data.enableMobileApp} onToggle={() => onToggleChannel("enableMobileApp")} />
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      <span className="text-[12px] font-bold text-slate-800 text-right max-w-[55%]">{value || "—"}</span>
    </div>
  );
}

/* ─── Error display helper ───────────────────────────────────── */
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-[11px] text-red-500 font-medium">
      <AlertCircle className="h-3 w-3 flex-shrink-0" />{msg}
    </p>
  );
}

/* ─── Main Wizard ────────────────────────────────────────────── */
export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<HospitalConfig>(DEFAULT);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<any>>({});

  function onChange(key: keyof HospitalConfig, value: string) {
    setData(prev => ({ ...prev, [key]: value }));
    setFieldErrors(prev => ({ ...prev, [key]: undefined }));
  }
  function onToggleChannel(key: keyof HospitalConfig) {
    setData(prev => ({ ...prev, [key]: !prev[key] }));
  }
  function onToggleDay(day: string) {
    setData(prev => {
      const days = prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day];
      return { ...prev, workingDays: days };
    });
    setFieldErrors(prev => ({ ...prev, workingDays: undefined }));
  }

  function validateStep(): boolean {
    let result;
    if (step === 1) result = step1Schema.safeParse(data);
    else if (step === 2) result = step2Schema.safeParse(data);
    else if (step === 3) result = step3Schema.safeParse(data);
    else if (step === 4 && data.enableWhatsApp && data.whatsappNumber) {
      result = whatsappSchema.safeParse({ whatsappNumber: data.whatsappNumber });
    } else return true;
    if (!result) return true;
    const errs = parseErrors(result);
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function canAdvance(): boolean { return true; }

  function back() { if (step > 1) { setStep(s => s - 1); setFieldErrors({}); } }

  async function next() {
    if (!validateStep()) return;
    if (step < 4) { setStep(s => s + 1); return; }

    // Step 4 → submit to API
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospitalName:          data.hospitalName,
          registrationNumber:    data.registrationNumber,
          hospitalType:          data.hospitalType,
          website:               data.website,
          adminName:             data.adminName,
          adminEmail:            data.adminEmail,
          adminPhone:            data.adminPhone,
          address:               data.address,
          city:                  data.city,
          country:               data.country,
          workingDays:           data.workingDays,
          openTime:              data.openTime,
          closeTime:             data.closeTime,
          slotDuration:          data.slotDuration,
          maxDailyAppointments:  data.maxDailyAppointments,
          enableWhatsApp:        data.enableWhatsApp,
          enableVoiceBot:        data.enableVoiceBot,
          enableWebPortal:       data.enableWebPortal,
          enableMobileApp:       data.enableMobileApp,
          whatsappNumber:        data.whatsappNumber,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save configuration");

      // Mirror to localStorage as a quick-access cache
      localStorage.setItem("ss_hospital_config", JSON.stringify(data));
      localStorage.setItem("ss_onboarding_complete", "true");
      setSubmitted(true);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Unknown error — is the test-server running on port 3099?");
    } finally {
      setSubmitting(false);
    }
  }

  function launchModule() {
    setLaunching(true);
    setTimeout(() => router.push("/appointments"), 1200);
  }

  /* ── Success screen ─────────────────────────── */
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center px-4">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-8 py-8 text-white text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 mb-3 drop-shadow" />
            <h2 className="text-xl font-bold">Setup Complete</h2>
            <p className="text-emerald-100 text-[13px] mt-1">{data.hospitalName} is ready to go</p>
            <span className="inline-flex items-center gap-1.5 mt-3 bg-emerald-400/30 text-emerald-100 text-[11px] font-semibold px-3 py-1 rounded-full">
              <CheckCircle2 className="h-3 w-3" /> Saved to database
            </span>
          </div>
          <div className="px-8 py-6">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Configuration Summary</p>
            <ReviewRow label="Facility"      value={data.hospitalName} />
            <ReviewRow label="Type"          value={HOSPITAL_TYPES.find(t => t.value === data.hospitalType)?.label ?? ""} />
            <ReviewRow label="Administrator" value={data.adminName} />
            <ReviewRow label="Contact"       value={data.adminEmail} />
            <ReviewRow label="Working Days"  value={data.workingDays.map(d => d.slice(0, 3)).join(", ")} />
            <ReviewRow label="Hours"         value={`${data.openTime} – ${data.closeTime}`} />
            <ReviewRow label="Slot Duration" value={`${data.slotDuration} min`} />
            <ReviewRow label="Active Channels" value={[
              data.enableWhatsApp && "WhatsApp",
              data.enableVoiceBot && "Voice Bot",
              data.enableWebPortal && "Web Portal",
              data.enableMobileApp && "Mobile App",
            ].filter(Boolean).join(", ")} />
          </div>
          <div className="px-8 pb-8">
            <button onClick={launchModule} disabled={launching}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold transition-all active:scale-[0.97] flex items-center justify-center gap-2 disabled:opacity-70">
              {launching ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Launching Module…</>
              ) : (
                <><CalendarDays className="h-4 w-4" /> Launch Appointment Module</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Wizard ─────────────────────────────────── */
  const currentStepMeta = STEPS[step - 1];
  const StepIcon = currentStepMeta.icon;
  const progress = ((step - 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col items-center justify-center px-4 py-10">

      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="relative flex-shrink-0">
          <div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-lg leading-none">+</span>
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-amber-400 rounded-full border-2 border-white" />
        </div>
        <div>
          <span className="text-[15px] font-black text-slate-900 tracking-tight">SETTLEMENT</span>
          <span className="text-[15px] font-black text-blue-600 tracking-tight ml-1">SENSE</span>
          <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase mt-0.5">Appointments Module</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">

        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div className="h-full bg-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${progress + (1 / STEPS.length) * 100}%` }} />
        </div>

        {/* Step indicator strip */}
        <div className="bg-slate-50 border-b border-slate-100 px-8 py-4">
          <div className="flex items-center gap-3 overflow-x-auto">
            {STEPS.map((s, i) => {
              const done   = step > s.id;
              const active = step === s.id;
              const Icon   = s.icon;
              return (
                <div key={s.id} className="flex items-center gap-3">
                  {i > 0 && <div className={`h-px w-8 flex-shrink-0 transition-colors duration-300 ${done ? "bg-blue-400" : "bg-slate-200"}`} />}
                  <div className={`flex items-center gap-2 flex-shrink-0 transition-all duration-200 ${active ? "opacity-100" : done ? "opacity-60" : "opacity-30"}`}>
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-black transition-colors ${
                      done ? "bg-emerald-500 text-white" : active ? "bg-blue-600 text-white shadow-sm" : "bg-slate-200 text-slate-500"
                    }`}>
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.id}
                    </div>
                    <span className={`text-[11px] font-bold hidden sm:block ${active ? "text-slate-800" : "text-slate-400"}`}>{s.title}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="px-8 py-7">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
              <StepIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-slate-900">{currentStepMeta.title}</h2>
              <p className="text-[12px] text-slate-500">{currentStepMeta.description}</p>
            </div>
          </div>

          {step === 1 && <Step1 data={data} onChange={onChange} errors={fieldErrors} />}
          {step === 2 && <Step2 data={data} onChange={onChange} errors={fieldErrors} />}
          {step === 3 && <Step3 data={data} onChange={onChange} onToggleDay={onToggleDay} errors={fieldErrors} />}
          {step === 4 && <Step4 data={data} onToggleChannel={onToggleChannel} onChange={onChange} errors={fieldErrors} />}

          {/* API error banner */}
          {submitError && (
            <div className="mt-5 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-700 font-medium">{submitError}</p>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-8 pb-7 flex items-center justify-between">
          {step > 1 ? (
            <button onClick={back} disabled={submitting}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          ) : <div />}

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 font-medium">Step {step} of {STEPS.length}</span>
            <button id="btn-next" onClick={next} disabled={!canAdvance() || submitting}
              className="flex items-center gap-2 h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed">
              {submitting ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
              ) : (
                <>{step === 4 ? "Finish Setup" : "Continue"} <ChevronRight className="h-4 w-4" /></>
              )}
            </button>
          </div>
        </div>
      </div>

      <p className="mt-6 text-[11px] text-slate-400 flex items-center gap-1.5">
        <Shield className="h-3 w-3" />
        Configuration is saved securely to the database and can be updated from module settings.
      </p>
    </div>
  );
}
