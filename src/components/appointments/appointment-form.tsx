"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Loader2, AlertTriangle } from "lucide-react";
import type { Appointment, TimeSlot } from "@/types";

interface AppointmentFormProps {
  reschedulingAppointment?: Appointment | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AppointmentForm({ reschedulingAppointment, onClose, onSuccess }: AppointmentFormProps) {
  const isReschedule = !!reschedulingAppointment;
  const [loading, setLoading] = useState(false);

  // Form states
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(reschedulingAppointment?.patientId || "");
  const [selectedPatientName, setSelectedPatientName] = useState(reschedulingAppointment?.patientName || "");
  const [selectedDoctorId, setSelectedDoctorId] = useState(reschedulingAppointment?.doctorId || "");
  const [selectedDate, setSelectedDate] = useState(reschedulingAppointment?.appointmentDate || new Date().toISOString().split("T")[0]);
  const [selectedSlot, setSelectedSlot] = useState<string>(reschedulingAppointment?.startTime || "");
  const [selectedEndSlot, setSelectedEndSlot] = useState<string>(reschedulingAppointment?.endTime || "");

  // Available slots loaded from API
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);

  // Load doctors catalog
  useEffect(() => {
    async function loadDoctors() {
      try {
        const res = await fetch("/api/doctors");
        if (res.ok) {
          const data = await res.json();
          setDoctors(data.doctors || []);
        }
      } catch (err) {
        console.error("Error loading doctors directory:", err);
      }
    }
    loadDoctors();
  }, []);

  // Search patients
  useEffect(() => {
    if (!patientSearch || isReschedule) return;
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(`/api/patients?search=${patientSearch}`);
        if (res.ok) {
          const data = await res.json();
          setPatients(data.patients || []);
        }
      } catch (err) {
        console.error("Patient search error:", err);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [patientSearch]);

  // Load available time slots when Doctor or Date changes
  useEffect(() => {
    if (!selectedDoctorId || !selectedDate) return;
    
    async function loadSlots() {
      setLoadingSlots(true);
      try {
        // TODO: Intern Implementation - Load available slots from API
        // Query GET `/api/availability?doctorId=${selectedDoctorId}&date=${selectedDate}`
        // Map response to slots state. If selected date is past or doctors don't consult that day, output warnings.
        
        const res = await fetch(`/api/availability?doctorId=${selectedDoctorId}&date=${selectedDate}`);
        if (res.ok) {
          const data = await res.json();
          setSlots(data.slots || []);
        }
      } catch (err) {
        console.error("Error fetching slots", err);
      } finally {
        setLoadingSlots(false);
      }
    }
    loadSlots();
  }, [selectedDoctorId, selectedDate]);

  // Handle Form submit (Create or Reschedule)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedDoctorId || !selectedDate || !selectedSlot) {
      alert("Please configure all booking fields");
      return;
    }

    setLoading(true);
    try {
      if (isReschedule) {
        // TODO: Intern Implementation - Call PATCH `/api/appointments/[id]` to reschedule
        // Payload: `{ appointmentDate: selectedDate, startTime: selectedSlot, endTime: selectedEndSlot }`
        
        const res = await fetch(`/api/appointments/${reschedulingAppointment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentDate: selectedDate,
            startTime: selectedSlot,
            endTime: selectedEndSlot
          })
        });

        if (res.ok) {
          onSuccess();
        } else {
          const data = await res.json();
          alert(data.error || "Failed to reschedule appointment");
        }
      } else {
        // TODO: Intern Implementation - Call POST `/api/appointments` to book a new appointment
        // Payload: `{ patientId: selectedPatientId, doctorId: selectedDoctorId, appointmentDate: selectedDate, startTime: selectedSlot, endTime: selectedEndSlot, source: 'reception' }`
        
        const res = await fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId: selectedPatientId,
            doctorId: selectedDoctorId,
            appointmentDate: selectedDate,
            startTime: selectedSlot,
            endTime: selectedEndSlot,
            source: "reception"
          })
        });

        if (res.ok) {
          onSuccess();
        } else {
          const data = await res.json();
          alert(data.error || "Failed to book appointment");
        }
      }
    } catch (err) {
      console.error("Submit booking error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white rounded-3xl border border-slate-200 shadow-elevated p-6 outline-none">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-slate-800 font-sans tracking-tight">
            {isReschedule ? `Reschedule Appointment` : `Schedule New Appointment`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Patient Finder (Hidden on Reschedule) */}
          {!isReschedule && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Patient</label>
              {selectedPatientId ? (
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <span className="text-xs font-bold text-slate-800">{selectedPatientName}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setSelectedPatientId("");
                      setSelectedPatientName("");
                    }}
                    className="h-6 text-[10px] text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2"
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search patients by name or phone..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
                  />
                  {patients.length > 0 && (
                    <div className="absolute top-11 z-15 w-full bg-white border border-slate-200 rounded-xl max-h-40 overflow-y-auto shadow-md">
                      {patients.map((pat) => (
                        <button
                          key={pat.id}
                          type="button"
                          onClick={() => {
                            setSelectedPatientId(pat.id);
                            setSelectedPatientName(`${pat.firstName} ${pat.lastName}`);
                            setPatients([]);
                            setPatientSearch("");
                          }}
                          className="w-full text-left p-2.5 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
                        >
                          {pat.firstName} {pat.lastName} ({pat.phone})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Doctor Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Doctor</label>
            <select
              value={selectedDoctorId}
              disabled={isReschedule}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-750 outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="">Select Practitioner</option>
              {doctors.map((doc) => (
                <option key={doc.uid} value={doc.uid}>
                  {doc.displayName} ({doc.specialization})
                </option>
              ))}
            </select>
          </div>

          {/* Date Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Appointment Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedSlot("");
              }}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
            />
          </div>

          {/* Time Slot Picker */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Available Slots</label>
              {loadingSlots && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
            </div>
            
            {!selectedDoctorId ? (
              <p className="text-[10px] text-slate-400 font-semibold italic bg-slate-25 border border-slate-100 p-2.5 rounded-lg text-center">
                Please select a doctor to load consultation schedules.
              </p>
            ) : slots.length === 0 && !loadingSlots ? (
              <p className="text-[10px] text-amber-600 bg-amber-50/50 border border-amber-100 p-2.5 rounded-lg text-center font-semibold flex justify-center items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> No available slots found. Select a working date.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                {slots.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={!s.available}
                    onClick={() => {
                      setSelectedSlot(s.startTime);
                      setSelectedEndSlot(s.endTime);
                    }}
                    className={`h-9 text-[10px] font-bold rounded-xl border transition-all ${
                      selectedSlot === s.startTime
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : s.available
                        ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                        : "bg-slate-50 text-slate-350 border-slate-100 cursor-not-allowed"
                    }`}
                  >
                    {s.startTime}
                  </button>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 rounded-xl text-xs font-bold border-slate-200 text-slate-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedSlot}
              className="gradient-primary h-10 rounded-xl px-4 text-xs font-bold text-white shadow-md hover:brightness-105 btn-scale-active flex items-center gap-1.5"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isReschedule ? "Confirm Reschedule" : "Book Slot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
