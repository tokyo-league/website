import { NextResponse } from "next/server";

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

function normalizeCspReport(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const body = value as Record<string, unknown>;
  const report = getObject(body["csp-report"]) ?? body;

  return {
    blockedUri: sanitizeReportValue(report["blocked-uri"] ?? report["blockedURL"]),
    documentUri: sanitizeReportValue(report["document-uri"] ?? report["documentURL"]),
    effectiveDirective: sanitizeReportValue(report["effective-directive"] ?? report["effectiveDirective"]),
    originalPolicy: sanitizeReportValue(report["original-policy"] ?? report["originalPolicy"], 240),
    referrer: sanitizeReportValue(report.referrer),
    violatedDirective: sanitizeReportValue(report["violated-directive"] ?? report["violatedDirective"]),
  };
}

function getObject(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
}

function sanitizeReportValue(value: unknown, maxLength = 160) {
  if (typeof value !== "string") {
    return undefined;
  }

  return value.replaceAll(/[\u0000-\u001f\u007f]/g, "").slice(0, maxLength);
}
