"use client";
import { useEffect, useState } from "react";
import { Job, Sector } from "@/lib/types";
import { ExternalLink, CheckCircle, XCircle, Star, Filter } from "lucide-react";

const SECTORS: Sector[] = [
  "SEN Teaching Assistant",
  "HLTA",
  "EMHP",
  "Assistant Psychologist",
  "Early Help Practitioner",
  "Learning Mentor",
  "Mental Health Support Worker",
  "Other",
];

const STATUS_BADGE: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  interested: "bg-amber-100 text-amber-700",
  applied: "bg-green-100 text-green-700",
  skipped: "bg-slate-100 text-slate-500",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [sponsorFilter, setSponsorFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data) => {
        setJobs(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  const updateStatus = async (id: string, status: Job["status"]) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)));
    await fetch("/api/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
  };

  const filtered = jobs.filter((j) => {
    if (sectorFilter !== "all" && j.sector !== sectorFilter) return false;
    if (sponsorFilter === "yes" && !j.visaSponsorship) return false;
    if (sponsorFilter === "no" && j.visaSponsorship) return false;
    if (statusFilter !== "all" && j.status !== statusFilter) return false;
    if (
      search &&
      !j.title.toLowerCase().includes(search.toLowerCase()) &&
      !j.organisation.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Loading…
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Job Board</h1>
          <p className="text-slate-500 text-sm">
            {filtered.length} of {jobs.length} jobs
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
        <Filter size={16} className="text-slate-400" />
        <input
          type="text"
          placeholder="Search title or org…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <select
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="all">All Sectors</option>
          {SECTORS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={sponsorFilter}
          onChange={(e) => setSponsorFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="all">All (sponsorship)</option>
          <option value="yes">Visa Sponsorship ✓</option>
          <option value="no">No Sponsorship noted</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="interested">Interested</option>
          <option value="applied">Applied</option>
          <option value="skipped">Skipped</option>
        </select>
      </div>

      {/* Job list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            No jobs match your filters
          </div>
        ) : (
          filtered.map((job) => (
            <div
              key={job.id}
              className={`bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-start gap-3 ${
                job.status === "skipped" ? "opacity-50" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <h3 className="font-semibold text-slate-800">{job.title}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[job.status]}`}
                  >
                    {job.status}
                  </span>
                  {job.visaSponsorship && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">
                      Visa Sponsorship
                    </span>
                  )}
                </div>
                <p className="text-slate-600 text-sm mt-0.5">
                  {job.organisation} · {job.location}
                </p>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-400">
                  <span>{job.sector}</span>
                  {job.salary && <span>£{job.salary}</span>}
                  {job.deadline && <span>Deadline: {job.deadline}</span>}
                  <span>{job.source}</span>
                </div>
                {job.notes && (
                  <p className="text-xs text-slate-500 mt-1 italic">
                    {job.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={job.link}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"
                  title="Open job listing"
                >
                  <ExternalLink size={15} />
                </a>
                <button
                  onClick={() =>
                    updateStatus(
                      job.id,
                      job.status === "interested" ? "new" : "interested",
                    )
                  }
                  className={`p-2 rounded-lg border transition-colors ${
                    job.status === "interested"
                      ? "bg-amber-100 border-amber-300 text-amber-600"
                      : "border-slate-200 text-slate-400 hover:bg-amber-50"
                  }`}
                  title="Mark interested"
                >
                  <Star size={15} />
                </button>
                <button
                  onClick={() =>
                    updateStatus(
                      job.id,
                      job.status === "applied" ? "interested" : "applied",
                    )
                  }
                  className={`p-2 rounded-lg border transition-colors ${
                    job.status === "applied"
                      ? "bg-green-100 border-green-300 text-green-600"
                      : "border-slate-200 text-slate-400 hover:bg-green-50"
                  }`}
                  title="Mark applied"
                >
                  <CheckCircle size={15} />
                </button>
                <button
                  onClick={() =>
                    updateStatus(
                      job.id,
                      job.status === "skipped" ? "new" : "skipped",
                    )
                  }
                  className={`p-2 rounded-lg border transition-colors ${
                    job.status === "skipped"
                      ? "bg-slate-200 border-slate-300 text-slate-500"
                      : "border-slate-200 text-slate-400 hover:bg-slate-50"
                  }`}
                  title="Skip"
                >
                  <XCircle size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
