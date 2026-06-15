export type JobStatus = "new" | "interested" | "applied" | "skipped";

export type ApplicationStatus =
  | "applied"
  | "interviewing"
  | "rejected"
  | "offer"
  | "withdrawn";

export type Sector =
  | "SEN Teaching Assistant"
  | "HLTA"
  | "EMHP"
  | "Assistant Psychologist"
  | "Early Help Practitioner"
  | "Learning Mentor"
  | "Mental Health Support Worker"
  | "Other";

export interface Job {
  id: string;
  title: string;
  organisation: string;
  sector: Sector;
  location: string;
  salary?: string;
  salaryMin?: number;
  link: string;
  source: string;
  postedDate?: string;
  deadline?: string;
  visaSponsorship: boolean;
  visaSponsorshipNote?: string; // e.g. "Visas cannot be sponsored"
  contractType?: string; // permanent / fixed_term / casual
  workingPattern?: string; // full_time / part_time / term_time
  keyStages?: string; // e.g. "KS1, KS2"
  status: JobStatus;
  notes?: string;
  scrapedDate: string;
}

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  organisation: string;
  sector: Sector;
  location: string;
  appliedDate: string;
  status: ApplicationStatus;
  notes?: string;
  followUpDate?: string;
  lastContactDate?: string;
  interviewDate?: string;
  salaryOffered?: string;
}
