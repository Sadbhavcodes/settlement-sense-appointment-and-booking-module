import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  description: string;
  trend?: { value: string; isPositive: boolean };
  icon: LucideIcon;
}

export function KpiCard({ title, value, description, trend, icon: Icon }: KpiCardProps) {
  return (
    <div className="bg-white dark:bg-[#1e2535] border border-slate-200 dark:border-white/8 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</p>
        <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      {trend && (
        <div className="flex items-center gap-1.5">
          <span className={cn("text-[11px] font-bold", trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
            {trend.value}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{description}</span>
        </div>
      )}
      {!trend && <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{description}</p>}
    </div>
  );
}

