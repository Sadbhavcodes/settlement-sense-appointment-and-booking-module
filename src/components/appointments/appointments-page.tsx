"use client";

import { useState } from "react";
import { AppointmentCalendar } from "@/components/appointments/appointment-calendar";
import { AppointmentsAnalytics } from "@/components/appointments/appointments-analytics";
import { AiSchedulerSimulator } from "@/components/appointments/ai-scheduler-simulator";
import { AvailabilitySettings } from "@/components/appointments/availability-settings";
import {
  CalendarDays,
  BarChart3,
  Bot,
  Settings2,
  CalendarClock,
} from "lucide-react";

const TABS = [
  {
    id: "schedule",
    label: "Appointment Schedule",
    icon: CalendarDays,
    description: "View, book, reschedule, and manage daily appointments",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    description: "Booking performance KPIs and channel distribution",
  },
  {
    id: "simulator",
    label: "AI Scheduler",
    icon: Bot,
    description: "WhatsApp & voice channel conversational booking simulator",
  },
  {
    id: "settings",
    label: "Availability Settings",
    icon: Settings2,
    description: "Configure doctor working hours, slot duration, and limits",
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AppointmentsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("schedule");
  const activeTabMeta = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="flex flex-col min-h-full bg-[#f8f9fb] dark:bg-[#0d1421]">
      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0f1a28] border-b border-slate-200 dark:border-white/5 px-8 pt-6 pb-0">
        {/* Title Row */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[22px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Appointment Journey
              </h1>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Scheduling Active
              </span>
            </div>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Book slots, manage patient schedules, configure availability, and run the AI voice booking simulator.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-end gap-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-5 py-3 text-[12px] font-semibold border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Page Body ─────────────────────────────────────────────────── */}
      <div className="flex-1 px-8 py-6">
        {/* Sub-header for active tab */}
        <div className="flex items-center gap-2 mb-5">
          <CalendarClock className="h-4 w-4 text-slate-400" />
          <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">
            {activeTabMeta.description}
          </p>
        </div>

        {/* Tab content */}
        {activeTab === "schedule"   && <AppointmentCalendar />}
        {activeTab === "analytics"  && <AppointmentsAnalytics />}
        {activeTab === "simulator"  && <AiSchedulerSimulator />}
        {activeTab === "settings"   && <AvailabilitySettings />}
      </div>
    </div>
  );

}
