import { NextResponse } from "next/server";
import { normalizeCspReport } from "@/lib/csp-report";

const maxReportBytes = 16 * 1024;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");

  if (contentLength > maxReportBytes) {
    return new NextResponse(null, { status: 413 });
  }

  const rawBody = await request.text();

  if (rawBody.length > maxReportBytes) {
    return new NextResponse(null, { status: 413 });
  }

  if (!rawBody.trim()) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const parsed = JSON.parse(rawBody);
    const report = normalizeCspReport(parsed);

    if (report) {
      console.warn("csp violation", report);
    }
  } catch {
    console.warn("csp violation parse failed");
  }

  return new NextResponse(null, { status: 204 });
}

export function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
