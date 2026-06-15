import { NextResponse } from "next/server";
import {
  scrapeTeachingVacancies,
  scrapeNhsJobs,
  scrapeCharityJob,
} from "@/lib/scrapers";
import { getJobs, createJob } from "@/lib/airtable";

export const maxDuration = 60;

export async function POST() {
  try {
    // fetch existing job links to deduplicate
    const existing = await getJobs();
    const existingLinks = new Set(existing.map((j) => j.link));

    // run all scrapers in parallel
    const [tvJobs, nhsJobs, charityJobs] = await Promise.allSettled([
      scrapeTeachingVacancies(),
      scrapeNhsJobs(),
      scrapeCharityJob(),
    ]);

    const allJobs = [
      ...(tvJobs.status === "fulfilled" ? tvJobs.value : []),
      ...(nhsJobs.status === "fulfilled" ? nhsJobs.value : []),
      ...(charityJobs.status === "fulfilled" ? charityJobs.value : []),
    ];

    // deduplicate within this batch and against existing
    const seen = new Set<string>();
    const newJobs = allJobs.filter((j) => {
      if (!j.link || seen.has(j.link) || existingLinks.has(j.link))
        return false;
      seen.add(j.link);
      return true;
    });

    // push to Airtable one by one (rate limit safe)
    let added = 0;
    for (const job of newJobs) {
      try {
        await createJob(job);
        added++;
        // stay well under Airtable's 5 req/sec limit
        await new Promise((r) => setTimeout(r, 250));
      } catch {
        // skip individual failures
      }
    }

    return NextResponse.json({
      ok: true,
      found: allJobs.length,
      added,
      sources: {
        teachingVacancies:
          tvJobs.status === "fulfilled" ? tvJobs.value.length : "error",
        nhsJobs:
          nhsJobs.status === "fulfilled" ? nhsJobs.value.length : "error",
        charityJob:
          charityJobs.status === "fulfilled"
            ? charityJobs.value.length
            : "error",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// Vercel Cron calls GET
export async function GET() {
  return POST();
}
