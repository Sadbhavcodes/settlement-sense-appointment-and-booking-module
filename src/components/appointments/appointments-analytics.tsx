"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { KpiCard } from "@/components/ui/kpi-card";
import { CalendarRange, ShieldCheck, Activity, TrendingDown, Hourglass } from "lucide-react";

export function AppointmentsAnalytics() {
  const [stats, setStats] = useState({
    totalScheduled:    0,
    bookingSuccessRate: 0,
    noShowReduction:   32.4,
    aiBookingAccuracy: 94.2,
    avgBookingSpeed:   42,
  });

  const [channels, setChannels] = useState({
    ai_voice:  0,
    reception: 0,
    whatsapp:  0,
    website:   0,
    mobile:    0,
  });

  const [waitlist, setWaitlist] = useState({
    pending:        0,
    conversionRate: 78.4,
    avgWaitDays:    1.8,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await fetch("/api/analytics");
        if (!res.ok) return;
        const data = await res.json();

        setStats({
          totalScheduled:    data.summary?.total          ?? 0,
          bookingSuccessRate: data.kpis?.bookingSuccessRate ?? 0,
          noShowReduction:   data.kpis?.noShowReduction    ?? 32.4,
          aiBookingAccuracy: data.kpis?.aiBookingAccuracy  ?? 94.2,
          avgBookingSpeed:   data.kpis?.avgBookingSpeed     ?? 42,
        });

        setChannels({
          ai_voice:  data.sourcePercentages?.ai_voice  ?? 0,
          reception: data.sourcePercentages?.reception ?? 0,
          whatsapp:  data.sourcePercentages?.whatsapp  ?? 0,
          website:   data.sourcePercentages?.website   ?? 0,
          mobile:    data.sourcePercentages?.mobile    ?? 0,
        });

        setWaitlist({
          pending:        data.waitlist?.pending        ?? 0,
          conversionRate: data.waitlist?.conversionRate ?? 78.4,
          avgWaitDays:    data.waitlist?.avgWaitDays    ?? 1.8,
        });
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);


  return (
    <div className="space-y-6">
      {/* Visual KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Booking Success Rate"
          value={`${stats.bookingSuccessRate}%`}
          description="Total successfully booked slots vs requested"
          trend={{ value: "+2.1%", isPositive: true }}
          icon={ShieldCheck}
        />
        <KpiCard
          title="No-Show Reduction"
          value={`-${stats.noShowReduction}%`}
          description="Decline in client no-shows post AI alerts"
          trend={{ value: "-4.8%", isPositive: true }}
          icon={TrendingDown}
        />
        <KpiCard
          title="AI Booking Accuracy"
          value={`${stats.aiBookingAccuracy}%`}
          description="Intent matching rate of conversational scheduler"
          trend={{ value: "+0.9%", isPositive: true }}
          icon={Activity}
        />
        <KpiCard
          title="Avg Booking Speed"
          value={`${stats.avgBookingSpeed}s`}
          description="Average elapsed duration to secure slot"
          trend={{ value: "-8s", isPositive: true }}
          icon={Hourglass}
        />
      </div>

      {/* Booking Channel Distribution Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-slate-200/60 dark:border-white/8 shadow-sm rounded-3xl overflow-hidden bg-white dark:bg-[#1e2535]">
          <CardHeader className="bg-slate-50/50 dark:bg-white/4 border-b border-slate-100 dark:border-white/6 p-6">
            <CardTitle className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Scheduling Channel Distribution
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-6 space-y-5">
            {/* AI Voice Agent Progress Indicator */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>AI Voice Booking (incoming calls)</span>
                <span>{channels.ai_voice}%</span>
              </div>
              <Progress value={channels.ai_voice} className="h-2 rounded-full bg-slate-100 dark:bg-white/8" indicatorClassName="bg-blue-600 rounded-full" />
            </div>

            {/* Reception Desk Progress Indicator */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Reception Desk (walk-ins)</span>
                <span>{channels.reception}%</span>
              </div>
              <Progress value={channels.reception} className="h-2 rounded-full bg-slate-100 dark:bg-white/8" indicatorClassName="bg-indigo-500 rounded-full" />
            </div>

            {/* WhatsApp Integration */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>WhatsApp Bot Sessions</span>
                <span>{channels.whatsapp}%</span>
              </div>
              <Progress value={channels.whatsapp} className="h-2 rounded-full bg-slate-100 dark:bg-white/8" indicatorClassName="bg-emerald-500 rounded-full" />
            </div>

            {/* Mobile App & Website portals */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Customer Web & Mobile Portals</span>
                <span>{channels.website + channels.mobile}%</span>
              </div>
              <Progress value={channels.website + channels.mobile} className="h-2 rounded-full bg-slate-100 dark:bg-white/8" indicatorClassName="bg-amber-500 rounded-full" />
            </div>
          </CardContent>
        </Card>

        {/* Waitlist Analytics */}
        <Card className="border border-slate-200/60 dark:border-white/8 shadow-sm rounded-3xl overflow-hidden bg-white dark:bg-[#1e2535]">
          <CardHeader className="bg-slate-50/50 dark:bg-white/4 border-b border-slate-100 dark:border-white/6 p-6">
            <CardTitle className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              Waitlist Operations Summary
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 flex flex-col justify-between h-[230px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/6 pb-2.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Waitlist Conversion Rate</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{waitlist.conversionRate}%</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/6 pb-2.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Average Wait Duration</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{waitlist.avgWaitDays} Days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Waitlisted Patients</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{waitlist.pending} Patients</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold italic text-center">
              *When slot cancellations occur, waitlisted patients are automatically notified in order.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

