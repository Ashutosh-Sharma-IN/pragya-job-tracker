"use client";
import { useEffect, useState } from "react";
import { Application } from "@/lib/types";
import { CalendarClock, Pencil, Check } from "lucide-react";

const STATUS_OPTIONS: Application["status"][] = [
  "applied",
  "interviewing",
  "rejected",
  "offer",
  "withdrawn",
];

const STATUS_STYLE: Record<string, string> = {
  applied: "bg-blue-100 text-blue-700",
  interviewing: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-600",
  offer: "bg-green-100 text-green-700",
  withdrawn: "bg-slate-100 text-slate-500",
};

export default function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<Application>>({});
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetch("/api/applications")
      .then((r) => r.json())
      .then((data) => {
        setApps(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  const startEdit = (app: Application) => {
    setEditId(app.id);
    setEditFields({
      status: app.status,
      notes: app.notes || "",
      followUpDate: app.followUpDate || "",
      interviewDate: app.interviewDate || "",
    });
  };

  const saveEdit = async (id: string) => {
    setApps((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...editFields } : a)),
    );
    setEditId(null);
    await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...editFields }),
    });
  };

  const today = new Date().toISOString().split("T")[0];

  const filtered =
    statusFilter === "all"
      ? apps
      : apps.filter((a) => a.status === statusFilter);

  const sorted = [...filtered].sort(
    (a, b) =>
      new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime(),
  );

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Loading…
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Applications</h1>
          <p className="text-slate-500 text-sm">
            {filtered.length} application{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="all">All Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          No applications logged yet. Mark jobs as &lsquo;applied&rsquo; on the
          Job Board or add them manually.
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((app) => {
            const isOverdue =
              app.followUpDate &&
              app.followUpDate < today &&
              app.status === "applied";
            const isEditing = editId === app.id;

            return (
              <div
                key={app.id}
                className={`bg-white rounded-xl border p-4 ${
                  isOverdue ? "border-amber-300" : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-800">
                        {app.jobTitle}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[app.status]}`}
                      >
                        {app.status}
                      </span>
                      {isOverdue && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                          <CalendarClock size={12} />
                          Follow-up overdue
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-sm mt-0.5">
                      {app.organisation} · {app.location} · {app.sector}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Applied: {app.appliedDate}
                      {app.followUpDate && ` · Follow-up: ${app.followUpDate}`}
                      {app.interviewDate &&
                        ` · Interview: ${app.interviewDate}`}
                    </p>
                    {app.notes && !isEditing && (
                      <p className="text-sm text-slate-600 mt-1 italic">
                        {app.notes}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      isEditing ? saveEdit(app.id) : startEdit(app)
                    }
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400"
                  >
                    {isEditing ? <Check size={15} /> : <Pencil size={15} />}
                  </button>
                </div>

                {isEditing && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">
                        Status
                      </label>
                      <select
                        value={editFields.status}
                        onChange={(e) =>
                          setEditFields((f) => ({
                            ...f,
                            status: e.target.value as Application["status"],
                          }))
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">
                        Follow-up Date
                      </label>
                      <input
                        type="date"
                        value={editFields.followUpDate}
                        onChange={(e) =>
                          setEditFields((f) => ({
                            ...f,
                            followUpDate: e.target.value,
                          }))
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">
                        Interview Date
                      </label>
                      <input
                        type="date"
                        value={editFields.interviewDate}
                        onChange={(e) =>
                          setEditFields((f) => ({
                            ...f,
                            interviewDate: e.target.value,
                          }))
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={editFields.notes}
                        onChange={(e) =>
                          setEditFields((f) => ({
                            ...f,
                            notes: e.target.value,
                          }))
                        }
                        placeholder="Any notes…"
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
