"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Calendar, User, Clock, CheckCircle2, AlertCircle, XCircle, RefreshCw } from "lucide-react";
import { AppointmentForm } from "./appointment-form";
import type { Appointment } from "@/types";

export function AppointmentCalendar() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [reschedulingAppointment, setReschedulingAppointment] = useState<Appointment | null>(null);

  // Fetch doctors directories for filters
  useEffect(() => {
    async function loadDoctors() {
      try {
        const res = await fetch("/api/doctors");
        if (res.ok) {
          const data = await res.json();
          setDoctors(data.doctors || []);
        }
      } catch (err) {
        console.error("Failed to load doctors", err);
      }
    }
    loadDoctors();
  }, []);

  // Fetch appointments list
  const fetchAppointments = async () => {
    setLoading(true);
    try {
      // TODO: Intern Implementation - Implement fetch code querying `/api/appointments`:
      // Build search params (doctorId, date, search queries).
      // Example: `/api/appointments?date=${selectedDate}&doctorId=${selectedDoctor}&search=${searchQuery}`
      
      const res = await fetch(`/api/appointments?date=${selectedDate}&doctorId=${selectedDoctor}&search=${searchQuery}`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch (err) {
      console.error("Failed to load appointments", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate, selectedDoctor, searchQuery]);

  // Update appointment status (Confirm, Check-In, Complete)
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      // TODO: Intern Implementation - Execute PATCH `/api/appointments/[id]` to update status
      // If status changes to 'checked_in', double check if the backend adds the record to queue board.
      
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        fetchAppointments();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update status");
      }
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  // Cancel appointment (respects policy window check on backend)
  const handleCancelAppointment = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      // TODO: Intern Implementation - Trigger DELETE `/api/appointments/[id]`
      const res = await fetch(`/api/appointments/${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        fetchAppointments();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to cancel appointment");
      }
    } catch (err) {
      console.error("Cancellation error:", err);
    }
  };

  // Format visual status colors
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "created":
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Scheduled</Badge>;
      case "confirmed":
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200">Confirmed</Badge>;
      case "reminder_sent":
        return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Reminder Sent</Badge>;
      case "checked_in":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">Checked-In</Badge>;
      case "consultation_completed":
        return <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-300">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="bg-rose-50 text-rose-600 border-rose-200">Cancelled</Badge>;
      case "waitlisted":
        return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">Waitlisted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Selector */}
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1e2535] px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:border-blue-500 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>

          {/* Doctor Filter */}
          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1e2535] px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">All Doctors</option>
            {doctors.map((doc) => (
              <option key={doc.uid} value={doc.uid}>
                {doc.displayName} ({doc.specialization})
              </option>
            ))}
          </select>

          {/* Search Inputs */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1e2535] pl-9 pr-3 text-xs font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <Button
          onClick={() => setIsBookingOpen(true)}
          className="gradient-primary h-10 rounded-xl px-4 text-xs font-bold text-white shadow-md hover:brightness-105 btn-scale-active flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Book Appointment
        </Button>
      </div>

      {/* Main Grid Content */}
      <Card className="border border-slate-200/60 dark:border-white/8 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-[#1e2535]">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/70 dark:bg-white/4 border-b border-slate-100 dark:border-white/6">
              <TableRow>
                <TableHead className="text-slate-500 dark:text-slate-400 font-bold text-xs h-12">Time Slot</TableHead>
                <TableHead className="text-slate-500 dark:text-slate-400 font-bold text-xs h-12">Patient Details</TableHead>
                <TableHead className="text-slate-500 dark:text-slate-400 font-bold text-xs h-12">Assigned Doctor</TableHead>
                <TableHead className="text-slate-500 dark:text-slate-400 font-bold text-xs h-12">Source Channel</TableHead>
                <TableHead className="text-slate-500 dark:text-slate-400 font-bold text-xs h-12">Status</TableHead>
                <TableHead className="text-slate-500 dark:text-slate-400 font-bold text-xs h-12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400 font-bold">
                    <div className="flex justify-center items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      Loading appointments list...
                    </div>
                  </TableCell>
                </TableRow>
              ) : appointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-xs text-slate-450 font-bold">
                    <AlertCircle className="h-8 w-8 text-slate-350 dark:text-slate-500 mx-auto mb-2" />
                    No patient appointments scheduled for this selection.
                  </TableCell>
                </TableRow>
              ) : (
                appointments.map((appt) => (
                  <TableRow key={appt.id} className="hover:bg-slate-50/50 dark:hover:bg-white/4 transition-colors">
                    <TableCell className="font-semibold text-slate-700 dark:text-slate-300 text-xs py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {appt.startTime} - {appt.endTime}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 text-xs">
                          {appt.patientName ? appt.patientName[0] : "P"}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">{appt.patientName}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{appt.patientPhone}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-slate-700 dark:text-slate-300 text-xs py-4">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {appt.doctorName}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs capitalize">{appt.source.replace("_", " ")}</span>
                    </TableCell>
                    <TableCell className="py-4">{getStatusBadge(appt.status)}</TableCell>
                    <TableCell className="py-4 text-right space-x-1.5">
                      {/* State Action Triggers */}
                      {appt.status === "created" && (
                        <Button
                          variant="ghost"
                          onClick={() => handleUpdateStatus(appt.id, "confirmed")}
                          className="h-8 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 hover:text-indigo-700 rounded-lg px-2.5"
                        >
                          Confirm
                        </Button>
                      )}
                      {["confirmed", "reminder_sent"].includes(appt.status) && (
                        <Button
                          variant="ghost"
                          onClick={() => handleUpdateStatus(appt.id, "checked_in")}
                          className="h-8 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 hover:text-emerald-700 rounded-lg px-2.5"
                        >
                          Check-In
                        </Button>
                      )}
                      {appt.status !== "cancelled" && appt.status !== "consultation_completed" && (
                        <>
                          <Button
                            variant="ghost"
                            onClick={() => setReschedulingAppointment(appt)}
                            className="h-8 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/8 border border-slate-200 dark:border-white/10 rounded-lg px-2.5"
                          >
                            Reschedule
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => handleCancelAppointment(appt.id)}
                            className="h-8 text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 hover:text-rose-700 rounded-lg px-2.5"
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Booking Form Dialog Modal */}
      {(isBookingOpen || reschedulingAppointment) && (
        <AppointmentForm
          reschedulingAppointment={reschedulingAppointment}
          onClose={() => {
            setIsBookingOpen(false);
            setReschedulingAppointment(null);
          }}
          onSuccess={() => {
            setIsBookingOpen(false);
            setReschedulingAppointment(null);
            fetchAppointments();
          }}
        />
      )}
    </div>
  );
}

