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
