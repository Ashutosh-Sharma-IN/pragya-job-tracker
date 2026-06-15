import { Job, Sector } from "./types";

// Keywords mapped to sectors
const SECTOR_KEYWORDS: { keywords: string[]; sector: Sector }[] = [
  {
    keywords: [
      "sen teaching assistant",
      "sen ta",
      "send teaching assistant",
      "special educational needs assistant",
      "sen support assistant",
    ],
    sector: "SEN Teaching Assistant",
  },
  {
    keywords: ["higher level teaching assistant", "hlta"],
    sector: "HLTA",
  },
  {
    keywords: [
      "educational mental health practitioner",
      "emhp",
      "mental health support worker in schools",
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
      "early intervention",
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

function detectSector(title: string): Sector {
  const lower = title.toLowerCase();
  for (const { keywords, sector } of SECTOR_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return sector;
  }
  return "Other";
}

function cleanSalary(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return raw.replace(/\s+/g, " ").trim();
}

// ── Teaching Vacancies API (GOV.UK) ──────────────────────────────────

const TV_SEARCH_TERMS = [
  "SEN teaching assistant",
  "HLTA",
  "learning mentor",
  "EMHP",
];

const TV_LOCATIONS = [
  "Yorkshire",
  "West Yorkshire",
  "South Yorkshire",
  "North Yorkshire",
  "West Midlands",
  "East Midlands",
  "Greater Manchester",
  "Lancashire",
  "Merseyside",
  "Tyne and Wear",
  "County Durham",
  "Nottinghamshire",
  "Leicestershire",
];

export async function scrapeTeachingVacancies(): Promise<Omit<Job, "id">[]> {
  const jobs: Omit<Job, "id">[] = [];
  const seen = new Set<string>();

  for (const term of TV_SEARCH_TERMS) {
    for (const location of TV_LOCATIONS.slice(0, 5)) {
      // limit to avoid too many requests
      try {
        const url = new URL(
          "https://api.teaching-vacancies.service.gov.uk/api/v1/jobs",
        );
        url.searchParams.set("keyword", term);
        url.searchParams.set("location", location);
        url.searchParams.set("radius", "20");
        url.searchParams.set("per_page", "50");

        const res = await fetch(url.toString(), {
          headers: {
            Accept: "application/json",
            "User-Agent": "PragyaJobTracker/1.0 (personal job search tool)",
          },
        });

        if (!res.ok) continue;
        const data = await res.json();
        const vacancies = data.data || [];

        for (const v of vacancies) {
          const attr = v.attributes || {};
          const link = `https://teaching-vacancies.service.gov.uk/jobs/${v.id}`;
          if (seen.has(link)) continue;
          seen.add(link);

          const title: string = attr.job_title || attr.title || "";
          jobs.push({
            title,
            organisation: attr.school_name || attr.organisation_name || "",
            sector: detectSector(title),
            location: [attr.town, attr.county].filter(Boolean).join(", "),
            salary: cleanSalary(attr.salary),
            link,
            source: "GOV.UK Teaching Vacancies",
            postedDate: attr.publish_on?.split("T")[0],
            deadline: attr.expires_on?.split("T")[0],
            visaSponsorship: false,
            status: "new",
            scrapedDate: new Date().toISOString().split("T")[0],
          });
        }
      } catch {
        // silently skip failed term+location combos
      }
    }
  }

  return jobs;
}

// ── NHS Jobs RSS ──────────────────────────────────────────────────────

const NHS_SEARCH_TERMS = [
  "EMHP",
  "Educational Mental Health",
  "Assistant Psychologist",
  "Mental Health Support Worker",
  "Early Help",
  "Learning Mentor",
];

function parseRssItem(
  item: string,
): {
  title: string;
  link: string;
  description: string;
  pubDate: string;
} | null {
  const get = (tag: string) => {
    const m = item.match(
      new RegExp(
        `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`,
        "i",
      ),
    );
    return m ? (m[1] || m[2] || "").trim() : "";
  };
  const title = get("title");
  const link = get("link") || get("guid");
  if (!title || !link) return null;
  return {
    title,
    link,
    description: get("description"),
    pubDate: get("pubDate"),
  };
}

export async function scrapeNhsJobs(): Promise<Omit<Job, "id">[]> {
  const jobs: Omit<Job, "id">[] = [];
  const seen = new Set<string>();

  for (const term of NHS_SEARCH_TERMS) {
    try {
      const url = `https://www.jobs.nhs.uk/xi/search_vacancy/rss/?action=search&keyword=${encodeURIComponent(term)}&location=England&distance=50`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "PragyaJobTracker/1.0 (personal job search tool)",
        },
      });
      if (!res.ok) continue;
      const xml = await res.text();

      const items = xml.split("<item>").slice(1);
      for (const item of items) {
        const parsed = parseRssItem(item);
        if (!parsed || seen.has(parsed.link)) continue;
        seen.add(parsed.link);

        const { title, link, description, pubDate } = parsed;

        // extract location from description
        const locMatch = description.match(/Location:\s*([^\n<]+)/i);
        const location = locMatch ? locMatch[1].trim() : "England";

        // extract salary from description
        const salMatch = description.match(/Salary:\s*([^\n<]+)/i);
        const salary = salMatch ? salMatch[1].trim() : undefined;

        // rough filter — skip roles clearly outside lower-cost areas
        const lowCostAreas = [
          "yorkshire",
          "midlands",
          "manchester",
          "lancashire",
          "merseyside",
          "newcastle",
          "sunderland",
          "durham",
          "nottingham",
          "leicester",
          "derby",
          "sheffield",
          "leeds",
          "bradford",
          "liverpool",
          "coventry",
          "wolverhampton",
        ];
        const locationLower = location.toLowerCase();
        if (!lowCostAreas.some((a) => locationLower.includes(a))) continue;

        const sponsorshipKeywords = [
          "tier 2",
          "skilled worker",
          "visa sponsor",
          "certificate of sponsorship",
          "cos",
        ];
        const visaSponsorship = sponsorshipKeywords.some((k) =>
          description.toLowerCase().includes(k),
        );

        jobs.push({
          title,
          organisation: "",
          sector: detectSector(title),
          location,
          salary: cleanSalary(salary),
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
    } catch {
      // skip failed terms
    }
  }

  return jobs;
}

// ── CharityJob RSS ────────────────────────────────────────────────────

const CHARITY_SEARCH_TERMS = [
  "mental health support worker",
  "early help worker",
  "assistant psychologist",
  "learning mentor",
];

export async function scrapeCharityJob(): Promise<Omit<Job, "id">[]> {
  const jobs: Omit<Job, "id">[] = [];
  const seen = new Set<string>();

  for (const term of CHARITY_SEARCH_TERMS) {
    try {
      const url = `https://www.charityjob.co.uk/jobs?keywords=${encodeURIComponent(term)}&location=England&format=rss`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "PragyaJobTracker/1.0 (personal job search tool)",
        },
      });
      if (!res.ok) continue;
      const xml = await res.text();

      const items = xml.split("<item>").slice(1);
      for (const item of items) {
        const parsed = parseRssItem(item);
        if (!parsed || seen.has(parsed.link)) continue;
        seen.add(parsed.link);

        const { title, link, description, pubDate } = parsed;

        const locMatch = description.match(/Location:\s*([^\n<,]+)/i);
        const location = locMatch ? locMatch[1].trim() : "England";

        const salMatch = description.match(/Salary:\s*([^\n<]+)/i);
        const salary = salMatch ? salMatch[1].trim() : undefined;

        jobs.push({
          title,
          organisation: "",
          sector: detectSector(title),
          location,
          salary: cleanSalary(salary),
          link,
          source: "CharityJob",
          postedDate: pubDate
            ? new Date(pubDate).toISOString().split("T")[0]
            : undefined,
          visaSponsorship: false,
          status: "new",
          scrapedDate: new Date().toISOString().split("T")[0],
        });
      }
    } catch {
      // skip
    }
  }

  return jobs;
}
