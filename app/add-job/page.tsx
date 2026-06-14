"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sector } from "@/lib/types";
import { PlusCircle } from "lucide-react";

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

const SOURCES = [
  "NHS Jobs",
  "Student Circus",
  "GOV.UK Teaching Vacancies",
  "TES",
  "Eteach",
  "CharityJob",
  "Indeed",
  "Jobs in Mind",
  "LinkedIn",
  "Council Website",
  "School Website",
  "Other",
];

const empty = {
  title: "",
  organisation: "",
  sector: "SEN Teaching Assistant" as Sector,
  location: "",
  salary: "",
  link: "",
  source: "NHS Jobs",
  postedDate: "",
  deadline: "",
  visaSponsorship: false,
  notes: "",
};

export default function AddJobPage() {
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        status: "new",
        scrapedDate: new Date().toISOString().split("T")[0],
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      router.push("/jobs");
    }, 1200);
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Add a Job</h1>
      <p className="text-slate-500 text-sm mb-6">
        Found a role outside the scrapers? Add it here.
      </p>

      {saved ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <p className="text-green-700 font-semibold">
            Job added! Redirecting…
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Job Title *">
              <input
                required
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. SEN Teaching Assistant"
                className="input"
              />
            </Field>
            <Field label="Organisation *">
              <input
                required
                value={form.organisation}
                onChange={(e) => set("organisation", e.target.value)}
                placeholder="e.g. Leeds City Council"
                className="input"
              />
            </Field>
            <Field label="Sector *">
              <select
                required
                value={form.sector}
                onChange={(e) => set("sector", e.target.value)}
                className="input"
              >
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Location *">
              <input
                required
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="e.g. Leeds, West Yorkshire"
                className="input"
              />
            </Field>
            <Field label="Salary (optional)">
              <input
                value={form.salary}
                onChange={(e) => set("salary", e.target.value)}
                placeholder="e.g. £24,000 – £28,000"
                className="input"
              />
            </Field>
            <Field label="Source">
              <select
                value={form.source}
                onChange={(e) => set("source", e.target.value)}
                className="input"
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Application Deadline">
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => set("deadline", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Date Posted">
              <input
                type="date"
                value={form.postedDate}
                onChange={(e) => set("postedDate", e.target.value)}
                className="input"
              />
            </Field>
          </div>

          <Field label="Job Link *">
            <input
              required
              type="url"
              value={form.link}
              onChange={(e) => set("link", e.target.value)}
              placeholder="https://…"
              className="input"
            />
          </Field>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Anything worth noting…"
              rows={2}
              className="input"
            />
          </Field>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.visaSponsorship}
              onChange={(e) => set("visaSponsorship", e.target.checked)}
              className="w-4 h-4 accent-indigo-600"
            />
            <span className="text-sm text-slate-700">
              This role mentions Visa Sponsorship
            </span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            <PlusCircle size={16} />
            {saving ? "Saving…" : "Add Job"}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
