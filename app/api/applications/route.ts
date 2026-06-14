import { NextRequest, NextResponse } from "next/server";
import {
  getApplications,
  createApplication,
  updateApplication,
} from "@/lib/airtable";

export async function GET() {
  try {
    const apps = await getApplications();
    return NextResponse.json(apps);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const app = await createApplication(body);
    return NextResponse.json(app);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...fields } = await req.json();
    await updateApplication(id, fields);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
