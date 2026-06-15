"use client";
import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Job, Application } from "@/lib/types";
import {
  Briefcase,
  ClipboardList,
  TrendingUp,
  CalendarClock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

const SECTOR_COLORS: Record<string, string> = {
  "SEN Teaching Assistant": "#6366f1",
  HLTA: "#8b5cf6",
  EMHP: "#06b6d4",
  "Assistant Psychologist": "#10b981",
  "Early Help Practitioner": "#f59e0b",
  "Learning Mentor": "#ef4444",
  "Mental Health Support Worker": "#ec4899",
  Other: "#94a3b8",
};

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [j, a] = await Promise.all([
      fetch("/api/jobs").then((r) => r.json()),
      fetch("/api/applications").then((r) => r.json()),
    ]);
    setJobs(Array.isArray(j) ? j : []);
    setApps(Array.isArray(a) ? a : []);
  }, []);

  useEffect(() => {
    loadData().then(() => setLoading(false));
  }, [loadData]);

  const runScraper = async () => {
    setScraping(true);
    setScrapeResult(null);
    try {
      const res = await fetch("/api/scrape", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setScrapeResult(
          `Done — ${data.added} new jobs added (${data.found} found across all sources)`,
        );
        await loadData();
      } else {
        setScrapeResult(`Error: ${data.error}`);
      }
    } catch {
      setScrapeResult("Scraper failed — check Vercel logs");
    }
    setScraping(false);
  };

  const totalJobs = jobs.length;
  const totalApplied = apps.length;
  const interviews = apps.filter((a) => a.status === "interviewing").length;
  const offers = apps.filter((a) => a.status === "offer").length;

  const today = new Date();
  const in7 = new Date(today);
  in7.setDate(today.getDate() + 7);
  const followUpsDue = apps.filter((a) => {
    if (!a.followUpDate) return false;
    const d = new Date(a.followUpDate);
    return d >= today && d <= in7;
  }).length;

  const sectorCounts: Record<string, number> = {};
  apps.forEach((a) => {
    sectorCounts[a.sector] = (sectorCounts[a.sector] || 0) + 1;
  });
  const sectorData = Object.entries(sectorCounts).map(([name, count]) => ({
    name,
    count,
  }));

  const weeklyData: Record<string, number> = {};
  apps.forEach((a) => {
    if (!a.appliedDate) return;
    const d = new Date(a.appliedDate);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split("T")[0];
    weeklyData[key] = (weeklyData[key] || 0) + 1;
  });
  const weeklyArr = Object.entries(weeklyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([week, count]) => ({ week: week.slice(5), count }));

  const todayStr = today.toISOString().split("T")[0];
  const overdue = apps.filter(
    (a) =>
      a.followUpDate && a.followUpDate < todayStr && a.status === "applied",
  );

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Loading…
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            Pragya&apos;s UK job hunt — at a glance
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={runScraper}
            disabled={scraping}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshCw size={15} className={scraping ? "animate-spin" : ""} />
            {scraping ? "Scraping jobs…" : "Scrape New Jobs"}
          </button>
          {scrapeResult && (
            <p className="text-xs text-slate-500 max-w-xs text-right">
              {scrapeResult}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          label="Jobs Found"
          value={totalJobs}
          icon={Briefcase}
          color="bg-indigo-500"
        />
        <StatCard
          label="Applied"
          value={totalApplied}
          icon={ClipboardList}
          color="bg-violet-500"
        />
        <StatCard
          label="Interviews"
          value={interviews}
          icon={TrendingUp}
          color="bg-emerald-500"
        />
        <StatCard
          label="Offers"
          value={offers}
          icon={TrendingUp}
          color="bg-amber-500"
        />
        <StatCard
          label="Follow-ups Due"
          value={followUpsDue}
          icon={CalendarClock}
          color="bg-rose-500"
        />
      </div>

      {/* Conversion funnel */}
      {totalApplied > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 mb-4">
            Conversion Funnel
          </h2>
          <div className="flex items-end gap-3">
            {[
              { label: "Applied", value: totalApplied, color: "bg-indigo-500" },
              {
                label: "Interview",
                value: interviews,
                color: "bg-emerald-500",
              },
              { label: "Offer", value: offers, color: "bg-amber-500" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex-1 text-center">
                <div
                  className={`${color} rounded-t-md mx-auto`}
                  style={{
                    height: `${Math.max(8, (value / totalApplied) * 120)}px`,
                  }}
                />
                <p className="text-xs text-slate-500 mt-1">{label}</p>
                <p className="font-bold text-slate-700">{value}</p>
                <p className="text-xs text-slate-400">
                  {`${Math.round((value / totalApplied) * 100)}%`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {weeklyArr.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-700 mb-4">
              Applications per Week
            </h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyArr}>
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {sectorData.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-700 mb-4">
              Applications by Sector
            </h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={sectorData} layout="vertical">
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  width={140}
                />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {sectorData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={SECTOR_COLORS[entry.name] || "#94a3b8"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Overdue follow-ups */}
      {overdue.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={18} className="text-amber-600" />
            <h2 className="font-semibold text-amber-800">
              Overdue Follow-ups ({overdue.length})
            </h2>
          </div>
          <div className="space-y-2">
            {overdue.map((a) => (
              <div
                key={a.id}
                className="flex justify-between items-center text-sm bg-white rounded-lg px-4 py-2 border border-amber-100"
              >
                <span className="font-medium text-slate-700">
                  {a.jobTitle} — {a.organisation}
                </span>
                <span className="text-amber-600 font-medium">
                  Due {a.followUpDate}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalJobs === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Briefcase size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No jobs yet</p>
          <p className="text-sm mt-1">
            Click &ldquo;Scrape New Jobs&rdquo; above or add one manually
          </p>
        </div>
      )}
    </div>
  );
}
