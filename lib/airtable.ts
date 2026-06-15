import { Job, Application } from "./types";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const JOBS_TABLE = "Jobs";
const APPLICATIONS_TABLE = "Applications";

async function airtableFetch(
  table: string,
  method = "GET",
  body?: object,
  recordId?: string,
) {
  const url = recordId
    ? `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${table}/${recordId}`
    : `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${table}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable ${method} ${table}: ${res.status} ${err}`);
  }
  return res.json();
}

async function fetchAllRecords(
  table: string,
): Promise<Record<string, unknown>[]> {
  const records: Record<string, unknown>[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${table}`,
    );
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      cache: "no-store",
    });
    const data = await res.json();
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);

  return records;
}

// ── Jobs ──────────────────────────────────────────────────────────────

function recordToJob(r: Record<string, unknown>): Job {
  const f = r.fields as Record<string, unknown>;
  return {
    id: r.id as string,
    title: (f.Title as string) || "",
    organisation: (f.Organisation as string) || "",
    sector: (f.Sector as Job["sector"]) || "Other",
    location: (f.Location as string) || "",
    salary: f.Salary as string | undefined,
    salaryMin: f.SalaryMin as number | undefined,
    link: (f.Link as string) || "",
    source: (f.Source as string) || "",
    postedDate: f.PostedDate as string | undefined,
    deadline: f.Deadline as string | undefined,
    visaSponsorship: Boolean(f.VisaSponsorship),
    status: ((f.Status as string) || "new") as Job["status"],
    notes: f.Notes as string | undefined,
    scrapedDate:
      (f.ScrapedDate as string) || new Date().toISOString().split("T")[0],
  };
}

export async function getJobs(): Promise<Job[]> {
  const records = await fetchAllRecords(JOBS_TABLE);
  return records.map(recordToJob);
}

export async function createJob(job: Omit<Job, "id">): Promise<Job> {
  const data = await airtableFetch(JOBS_TABLE, "POST", {
    typecast: true,
    fields: {
      Title: job.title,
      Organisation: job.organisation,
      Sector: job.sector,
      Location: job.location,
      Salary: job.salary,
      SalaryMin: job.salaryMin,
      Link: job.link,
      Source: job.source,
      PostedDate: job.postedDate,
      Deadline: job.deadline,
      VisaSponsorship: job.visaSponsorship,
      Status: job.status,
      Notes: job.notes,
      ScrapedDate: job.scrapedDate,
    },
  });
  return recordToJob(data);
}

export async function updateJobStatus(
  id: string,
  status: Job["status"],
  notes?: string,
): Promise<void> {
  await airtableFetch(
    JOBS_TABLE,
    "PATCH",
    { fields: { Status: status, Notes: notes } },
    id,
  );
}

// ── Applications ──────────────────────────────────────────────────────

function recordToApplication(r: Record<string, unknown>): Application {
  const f = r.fields as Record<string, unknown>;
  return {
    id: r.id as string,
    jobId: (f.JobId as string) || "",
    jobTitle: (f.JobTitle as string) || "",
    organisation: (f.Organisation as string) || "",
    sector: (f.Sector as Application["sector"]) || "Other",
    location: (f.Location as string) || "",
    appliedDate: (f.AppliedDate as string) || "",
    status: ((f.Status as string) || "applied") as Application["status"],
    notes: f.Notes as string | undefined,
    followUpDate: f.FollowUpDate as string | undefined,
    lastContactDate: f.LastContactDate as string | undefined,
    interviewDate: f.InterviewDate as string | undefined,
    salaryOffered: f.SalaryOffered as string | undefined,
  };
}

export async function getApplications(): Promise<Application[]> {
  const records = await fetchAllRecords(APPLICATIONS_TABLE);
  return records.map(recordToApplication);
}

export async function createApplication(
  app: Omit<Application, "id">,
): Promise<Application> {
  const data = await airtableFetch(APPLICATIONS_TABLE, "POST", {
    typecast: true,
    fields: {
      JobId: app.jobId,
      JobTitle: app.jobTitle,
      Organisation: app.organisation,
      Sector: app.sector,
      Location: app.location,
      AppliedDate: app.appliedDate,
      Status: app.status,
      Notes: app.notes,
      FollowUpDate: app.followUpDate,
      LastContactDate: app.lastContactDate,
      InterviewDate: app.interviewDate,
      SalaryOffered: app.salaryOffered,
    },
  });
  return recordToApplication(data);
}

export async function updateApplication(
  id: string,
  fields: Partial<Omit<Application, "id">>,
): Promise<void> {
  await airtableFetch(
    APPLICATIONS_TABLE,
    "PATCH",
    {
      fields: {
        Status: fields.status,
        Notes: fields.notes,
        FollowUpDate: fields.followUpDate,
        LastContactDate: fields.lastContactDate,
        InterviewDate: fields.interviewDate,
        SalaryOffered: fields.salaryOffered,
      },
    },
    id,
  );
}
