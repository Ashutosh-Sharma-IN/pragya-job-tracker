import { NextResponse } from "next/server";
import {
  scrapeIndeed,
  scrapeNhsJobs,
  scrapeTeachingVacancies,
} from "@/lib/scrapers";
import { getJobs, createJob } from "@/lib/airtable";

export const maxDuration = 60;

export async function POST() {
  try {
    const existing = await getJobs();
    const existingLinks = new Set(existing.map((j) => j.link));

    const [indeedResult, nhsResult, tvResult] = await Promise.allSettled([
      scrapeIndeed(),
      scrapeNhsJobs(),
      scrapeTeachingVacancies(),
    ]);

    const sources = {
      indeed:
        indeedResult.status === "fulfilled"
          ? {
              found: indeedResult.value.jobs.length,
              errors: indeedResult.value.errors,
            }
          : {
              found: 0,
              errors: [String((indeedResult as PromiseRejectedResult).reason)],
            },
      nhsJobs:
        nhsResult.status === "fulfilled"
          ? {
              found: nhsResult.value.jobs.length,
              errors: nhsResult.value.errors,
            }
          : {
              found: 0,
              errors: [String((nhsResult as PromiseRejectedResult).reason)],
            },
      teachingVacancies:
        tvResult.status === "fulfilled"
          ? { found: tvResult.value.jobs.length, errors: tvResult.value.errors }
          : {
              found: 0,
              errors: [String((tvResult as PromiseRejectedResult).reason)],
            },
    };

    const allJobs = [
      ...(indeedResult.status === "fulfilled" ? indeedResult.value.jobs : []),
      ...(nhsResult.status === "fulfilled" ? nhsResult.value.jobs : []),
      ...(tvResult.status === "fulfilled" ? tvResult.value.jobs : []),
    ];

    const seen = new Set<string>();
    const newJobs = allJobs.filter((j) => {
      if (!j.link || seen.has(j.link) || existingLinks.has(j.link))
        return false;
      seen.add(j.link);
      return true;
    });

    let added = 0;
    const addErrors: string[] = [];
    for (const job of newJobs) {
      try {
        await createJob(job);
        added++;
        await new Promise((r) => setTimeout(r, 250));
      } catch (e) {
        addErrors.push(String(e));
      }
    }

    return NextResponse.json({
      ok: true,
      found: allJobs.length,
      newAfterDedup: newJobs.length,
      added,
      sources,
      addErrors: addErrors.slice(0, 3),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
