import { NextResponse } from "next/server";

export async function GET() {
  try {
    const url = `https://api.teaching-vacancies.service.gov.uk/api/v1/jobs?keyword=teaching+assistant&per_page=1`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; JobAggregator/1.0)",
      },
    });

    if (!res.ok) {
      return NextResponse.json({
        error: `HTTP ${res.status}`,
        body: await res.text(),
      });
    }

    const data = await res.json();
    // return the full first record so we can see every field name
    const first = data?.data?.[0] ?? data;
    return NextResponse.json({
      firstRecord: first,
      topLevelKeys: Object.keys(data),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}
