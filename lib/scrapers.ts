import { Job, Sector } from "./types";

const SECTOR_KEYWORDS: { keywords: string[]; sector: Sector }[] = [
  {
    keywords: [
      "sen teaching assistant",
      "sen ta",
      "send teaching assistant",
      "special educational needs assistant",
      "sen support",
    ],
    sector: "SEN Teaching Assistant",
  },
  { keywords: ["higher level teaching assistant", "hlta"], sector: "HLTA" },
  {
    keywords: [
      "educational mental health practitioner",
      "emhp",
      "mental health support worker in school",
      "mhsw",
    ],
    sector: "EMHP",
  },
  {
    keywords: ["assistant psychologist", "trainee psychologist"],
    sector: "Assistant Psychologist",
  },
  {
    keywords: [
      "early help",
      "family support worker",
      "early intervention worker",
      "early years support",
    ],
    sector: "Early Help Practitioner",
  },
  {
    keywords: ["learning mentor", "student mentor", "pupil mentor"],
    sector: "Learning Mentor",
  },
  {
    keywords: [
      "mental health support worker",
      "mental health practitioner",
      "mental health worker",
    ],
    sector: "Mental Health Support Worker",
  },
];

export function detectSector(title: string): Sector {
  const lower = title.toLowerCase();
  for (const { keywords, sector } of SECTOR_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return sector;
  }
  return "Other";
}

function parseRssItems(xml: string): Array<{
  title: string;
  link: string;
  description: string;
  pubDate: string;
}> {
  const items: Array<{
    title: string;
    link: string;
    description: string;
    pubDate: string;
  }> = [];
  const parts = xml.split(/<item[\s>]/i).slice(1);

  for (const part of parts) {
    const get = (tag: string) => {
      const m =
        part.match(
          new RegExp(
            `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`,
            "i",
          ),
        ) || part.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
      return m ? m[1].trim() : "";
    };
    const title = get("title");
    const link = get("link") || get("guid");
    if (title && link) {
      items.push({
        title,
        link,
        description: get("description"),
        pubDate: get("pubDate"),
      });
    }
  }
  return items;
}

const LOW_COST_AREAS = [
  "yorkshire",
  "leeds",
  "sheffield",
  "bradford",
  "hull",
  "york",
  "halifax",
  "west midlands",
  "birmingham",
  "coventry",
  "wolverhampton",
  "walsall",
  "dudley",
  "east midlands",
  "nottingham",
  "leicester",
  "derby",
  "lincoln",
  "mansfield",
  "manchester",
  "salford",
  "oldham",
  "bolton",
  "rochdale",
  "wigan",
  "stockport",
  "lancashire",
  "preston",
  "blackburn",
  "burnley",
  "blackpool",
  "merseyside",
  "liverpool",
  "sefton",
  "knowsley",
  "newcastle",
  "sunderland",
  "gateshead",
  "middlesbrough",
  "durham",
  "north east",
  "tyne",
  "wear",
];

function isLowCostArea(location: string): boolean {
  const lower = location.toLowerCase();
  return LOW_COST_AREAS.some((a) => lower.includes(a));
}

// ── Indeed UK RSS (most reliable, no auth needed) ─────────────────────

const INDEED_SEARCHES = [
  { q: "SEN Teaching Assistant", sector: "SEN Teaching Assistant" as Sector },
  { q: "HLTA Special Educational Needs", sector: "HLTA" as Sector },
  {
    q: "EMHP Educational Mental Health Practitioner",
    sector: "EMHP" as Sector,
  },
  { q: "Assistant Psychologist", sector: "Assistant Psychologist" as Sector },
  {
    q: "Early Help Practitioner Family Support",
    sector: "Early Help Practitioner" as Sector,
  },
  { q: "Learning Mentor school", sector: "Learning Mentor" as Sector },
  {
    q: "Mental Health Support Worker school",
    sector: "Mental Health Support Worker" as Sector,
  },
];

export async function scrapeIndeed(): Promise<{
  jobs: Omit<Job, "id">[];
  errors: string[];
}> {
  const jobs: Omit<Job, "id">[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const { q, sector } of INDEED_SEARCHES) {
    try {
      const url = `https://uk.indeed.com/rss?q=${encodeURIComponent(q)}&l=England&sort=date&radius=40`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; JobAggregator/1.0)",
          Accept: "application/rss+xml, application/xml, text/xml",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        errors.push(`Indeed (${q}): HTTP ${res.status}`);
        continue;
      }

      const xml = await res.text();
      if (!xml.includes("<item")) {
        errors.push(`Indeed (${q}): no items in response`);
        continue;
      }

      const items = parseRssItems(xml);
      for (const { title, link, description, pubDate } of items) {
        if (seen.has(link)) continue;
        seen.add(link);

        // extract location from description or title
        const locMatch = description.match(/(?:location|loc)[:\s]+([^<\n,]+)/i);
        const location = locMatch ? locMatch[1].trim() : "England";

        const salMatch = description.match(
          /£[\d,]+(?:\s*[-–]\s*£[\d,]+)?(?:\s*(?:per|a|\/)\s*(?:year|annum|hour|pa))?/i,
        );
        const salary = salMatch ? salMatch[0] : undefined;

        const sponsorKeywords = [
          "skilled worker",
          "visa sponsor",
          "certificate of sponsorship",
          "cos provided",
          "tier 2",
        ];
        const visaSponsorship = sponsorKeywords.some((k) =>
          description.toLowerCase().includes(k),
        );

        jobs.push({
          title,
          organisation: "",
          sector:
            detectSector(title) !== "Other" ? detectSector(title) : sector,
          location,
          salary,
          link,
          source: "Indeed UK",
          postedDate: pubDate
            ? new Date(pubDate).toISOString().split("T")[0]
            : undefined,
          visaSponsorship,
          status: "new",
          scrapedDate: new Date().toISOString().split("T")[0],
        });
      }
    } catch (e) {
      errors.push(`Indeed (${q}): ${String(e)}`);
    }
  }

  return { jobs, errors };
}

// ── NHS Jobs RSS ───────────────────────────────────────────────────────

const NHS_TERMS = [
  "EMHP",
  "assistant psychologist",
  "mental health support worker",
  "early help",
  "learning mentor",
];

export async function scrapeNhsJobs(): Promise<{
  jobs: Omit<Job, "id">[];
  errors: string[];
}> {
  const jobs: Omit<Job, "id">[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const term of NHS_TERMS) {
    try {
      // NHS Jobs updated URL format
      const url = `https://www.jobs.nhs.uk/cgi-bin/search.cgi?what=${encodeURIComponent(term)}&where=England&distance=200&format=rss`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; JobAggregator/1.0)",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        errors.push(`NHS Jobs (${term}): HTTP ${res.status}`);
        continue;
      }

      const xml = await res.text();
      if (!xml.includes("<item")) {
        errors.push(`NHS Jobs (${term}): no items in feed`);
        continue;
      }

      const items = parseRssItems(xml);
      for (const { title, link, description, pubDate } of items) {
        if (seen.has(link)) continue;
        seen.add(link);

        const locMatch = description.match(
          /(?:location|base)[:\s]+([^\n<,]+)/i,
        );
        const location = locMatch ? locMatch[1].trim() : "England";

        if (!isLowCostArea(location)) continue;

        const salMatch = description.match(/(?:salary|band)[:\s]+([^\n<]+)/i);
        const salary = salMatch ? salMatch[1].trim() : undefined;

        const sponsorKeywords = [
          "skilled worker",
          "visa",
          "certificate of sponsorship",
          "cos",
          "tier 2",
        ];
        const visaSponsorship = sponsorKeywords.some((k) =>
          description.toLowerCase().includes(k),
        );

        jobs.push({
          title,
          organisation: "",
          sector: detectSector(title),
          location,
          salary,
          link,
          source: "NHS Jobs",
          postedDate: pubDate
            ? new Date(pubDate).toISOString().split("T")[0]
            : undefined,
          visaSponsorship,
          status: "new",
          scrapedDate: new Date().toISOString().split("T")[0],
        });
      }
    } catch (e) {
      errors.push(`NHS Jobs (${term}): ${String(e)}`);
    }
  }

  return { jobs, errors };
}

// ── GOV.UK Teaching Vacancies (open data CSV) ─────────────────────────

const TV_KEYWORDS = [
  "sen",
  "teaching assistant",
  "hlta",
  "learning mentor",
  "emhp",
  "mental health",
];

export async function scrapeTeachingVacancies(): Promise<{
  jobs: Omit<Job, "id">[];
  errors: string[];
}> {
  const jobs: Omit<Job, "id">[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  try {
    // Teaching Vacancies public search (no auth for browsing)
    const terms = ["SEN teaching assistant", "HLTA", "learning mentor"];
    for (const term of terms) {
      const url = `https://teaching-vacancies.service.gov.uk/api/v1/jobs?keyword=${encodeURIComponent(term)}&per_page=50`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; JobAggregator/1.0)",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        errors.push(`Teaching Vacancies (${term}): HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const vacancies = data.data || data.jobs || data.vacancies || [];

      if (!Array.isArray(vacancies) || vacancies.length === 0) {
        errors.push(
          `Teaching Vacancies (${term}): 0 results (response: ${JSON.stringify(data).slice(0, 100)})`,
        );
        continue;
      }

      for (const v of vacancies) {
        const attr = v.attributes || v;
        const link =
          attr.url ||
          attr.links?.self ||
          `https://teaching-vacancies.service.gov.uk/jobs/${v.id}`;
        if (seen.has(link)) continue;
        seen.add(link);

        const title: string = attr.job_title || attr.title || "";
        if (!TV_KEYWORDS.some((k) => title.toLowerCase().includes(k))) continue;

        // TV API location: try multiple known field names
        const loc = [
          attr.school_name ? "" : null, // skip — goes to organisation
          attr.town || attr.job_location_town,
          attr.county || attr.job_location_county,
          attr.region || attr.job_location_region,
        ]
          .filter(Boolean)
          .join(", ");

        // Visa sponsorship — TV API has a direct boolean field
        // visa_sponsorship_unavailable: true means NO sponsorship
        const sponsorshipUnavailable =
          attr.visa_sponsorship_unavailable === true ||
          attr.visa_sponsorship === "unavailable" ||
          attr.visa_sponsorship === false;
        const visaSponsorship = !sponsorshipUnavailable;
        const visaSponsorshipNote = sponsorshipUnavailable
          ? "Visas cannot be sponsored"
          : attr.visa_sponsorship === "sponsored"
            ? "Visa sponsorship available"
            : undefined;

        // working pattern: full_time / part_time / term_time etc.
        const workingPatterns: string[] =
          attr.working_patterns || attr.working_pattern
            ? [].concat(attr.working_patterns || attr.working_pattern)
            : [];
        const workingPattern = workingPatterns
          .map((w: string) => w.replace(/_/g, " "))
          .join(", ");

        // contract type: permanent / fixed_term / casual
        const contractType = (
          attr.contract_type ||
          attr.employment_type ||
          ""
        ).replace(/_/g, " ");

        // key stages
        const keyStages: string[] = attr.key_stages || [];
        const keyStageStr = keyStages.join(", ");

        jobs.push({
          title,
          organisation:
            attr.school_name ||
            attr.organisation_name ||
            attr.school?.name ||
            "",
          sector: detectSector(title),
          location: loc || "England",
          salary: attr.salary || attr.pay_scale || attr.salary_range,
          link,
          source: "GOV.UK Teaching Vacancies",
          postedDate: attr.publish_on?.split?.("T")?.[0],
          deadline: attr.expires_on?.split?.("T")?.[0],
          visaSponsorship,
          visaSponsorshipNote,
          contractType: contractType || undefined,
          workingPattern: workingPattern || undefined,
          keyStages: keyStageStr || undefined,
          status: "new",
          scrapedDate: new Date().toISOString().split("T")[0],
        });
      }
    }
  } catch (e) {
    errors.push(`Teaching Vacancies: ${String(e)}`);
  }

  return { jobs, errors };
}
