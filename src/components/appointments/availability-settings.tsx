"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Info } from "lucide-react";

export function AvailabilitySettings() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("09:00 AM");
  const [endTime, setEndTime] = useState("05:00 PM");
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [maxDailyLimit, setMaxDailyLimit] = useState(30);
  const [cancellationWindow, setCancellationWindow] = useState(2);

  useEffect(() => {
    async function loadDoctors() {
      try {
        const res = await fetch("/api/doctors");
        if (res.ok) {
          const data = await res.json();
          setDoctors(data.doctors || []);
          if (data.doctors?.length > 0) setSelectedDocId(data.doctors[0].uid);
        }
      } catch (err) { console.error("Error loading doctors:", err); }
    }
    loadDoctors();
  }, []);

  useEffect(() => {
    if (!selectedDocId) return;
    async function loadDoctorSettings() {
      setLoading(true);
      try {
        const doctor = doctors.find((d) => d.uid === selectedDocId);
        const avail = doctor?.availabilityJson || doctor?.availability_json;
        if (avail) {
          setWorkingDays(avail.workingDays ?? [1, 2, 3, 4, 5]);
          setStartTime(avail.startTime ?? "09:00 AM");
          setEndTime(avail.endTime ?? "05:00 PM");
          setDurationMinutes(avail.durationMinutes ?? 15);
          setMaxDailyLimit(avail.maxDailyLimit ?? 30);
          setCancellationWindow(avail.cancellationWindowHours ?? 2);
        }
      } catch (err) { console.error("Error loading settings:", err); }
      finally { setLoading(false); }
    }
    loadDoctorSettings();
  }, [selectedDocId]);

  const handleToggleDay = (day: number) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/doctors/${selectedDocId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availabilityJson: { workingDays, startTime, endTime, durationMinutes, maxDailyLimit, cancellationWindowHours: cancellationWindow }
        })
      });
      if (res.ok) alert("Availability settings saved successfully!");
      else { const data = await res.json(); alert(data.error || "Failed to save settings"); }
    } catch (err) { console.error("Error saving availability settings:", err); }
    finally { setSaving(false); }
  };

  const weekdays = [
    { value: 1, label: "Mon" }, { value: 2, label: "Tue" }, { value: 3, label: "Wed" },
    { value: 4, label: "Thu" }, { value: 5, label: "Fri" }, { value: 6, label: "Sat" }, { value: 7, label: "Sun" }
  ];

  /* ── Shared input class ─────────────────────────────────────────────── */
  const inputCls = "h-11 w-full rounded-xl border border-slate-200 dark:border-white/8 bg-white dark:bg-[#0d1827] px-3.5 text-xs font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-colors";

  return (
    <Card className="border border-slate-200/60 dark:border-white/6 shadow-sm rounded-3xl overflow-hidden bg-white dark:bg-[#131f2e] max-w-2xl">
      <CardHeader className="bg-slate-50/50 dark:bg-[#0f1a28] border-b border-slate-100 dark:border-white/6 p-6">
        <CardTitle className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Practitioner Availability &amp; Schedule Rules
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSaveSettings} className="space-y-6">

          {/* Doctor selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Doctor Profile</label>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className={inputCls}
            >
              <option value="">Select Practitioner</option>
              {doctors.map((doc) => (
                <option key={doc.uid} value={doc.uid}>
                  {doc.displayName} ({doc.specialization})
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12 text-xs text-slate-400 font-bold gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              Loading availability rules...
            </div>
          ) : (
            <div className="space-y-5">

              {/* Working Days */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Consultation Days</label>
                <div className="flex flex-wrap gap-2">
                  {weekdays.map((day) => {
                    const active = workingDays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => handleToggleDay(day.value)}
                        className={`h-10 rounded-xl px-4 text-xs font-bold border transition-all duration-150 ${
                          active
                            ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20"
                            : "bg-transparent dark:bg-white/4 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Start Hours</label>
                  <input type="text" value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="09:00 AM" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">End Hours</label>
                  <input type="text" value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="05:00 PM" className={inputCls} />
                </div>
              </div>

              {/* Slot settings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Slot Duration</label>
                  <select value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} className={inputCls}>
                    <option value={15}>15 Minutes</option>
                    <option value={20}>20 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={60}>60 Minutes</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Daily Max Bookings</label>
                  <input type="number" value={maxDailyLimit} onChange={(e) => setMaxDailyLimit(Number(e.target.value))} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Cancellation Policy (Hrs)</label>
                  <input type="number" value={cancellationWindow} onChange={(e) => setCancellationWindow(Number(e.target.value))} className={inputCls} />
                </div>
              </div>

              {/* Info banner */}
              <div className="rounded-2xl bg-blue-50/50 dark:bg-blue-500/8 border border-blue-100 dark:border-blue-500/15 p-4 text-[10px] font-semibold text-blue-700 dark:text-blue-300 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Configuring the cancellation window ensures that cancellations requested within less than the threshold (e.g. 2 hours) of the scheduled appointment start time will be rejected by the validation rules.
                </p>
              </div>

              {/* Save button */}
              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-white/6">
                <Button
                  type="submit"
                  disabled={saving || !selectedDocId}
                  className="gradient-primary h-11 rounded-xl px-5 text-xs font-bold text-white shadow-md hover:brightness-105 btn-scale-active flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Configurations
                </Button>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
