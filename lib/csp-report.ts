const sensitiveAssignmentPattern =
  /\b(token|secret|password|passwd|pwd|code|state|session|auth|credential|jwt|key|access_token|refresh_token|id_token)=([^&\s;]+)/gi;
const bearerPattern = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const noncePattern = /'nonce-[^']+'/gi;

export type NormalizedCspReport = {
  blockedUri: string | undefined;
  documentUri: string | undefined;
  effectiveDirective: string | undefined;
  originalPolicy: string | undefined;
  referrer: string | undefined;
  violatedDirective: string | undefined;
};

export function normalizeCspReport(value: unknown): NormalizedCspReport | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const body = value as Record<string, unknown>;
  const report = getObject(body["csp-report"]) ?? body;

  return {
    blockedUri: sanitizeReportUri(report["blocked-uri"] ?? report["blockedURL"]),
    documentUri: sanitizeReportUri(report["document-uri"] ?? report["documentURL"]),
    effectiveDirective: sanitizeReportValue(report["effective-directive"] ?? report["effectiveDirective"]),
    originalPolicy: sanitizeReportValue(report["original-policy"] ?? report["originalPolicy"], 240),
    referrer: sanitizeReportUri(report.referrer),
    violatedDirective: sanitizeReportValue(report["violated-directive"] ?? report["violatedDirective"]),
  };
}

function getObject(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
}

function sanitizeReportUri(value: unknown, maxLength = 160) {
  const sanitized = sanitizeReportValue(value, maxLength);

  if (!sanitized) {
    return sanitized;
  }

  if (sanitized === "inline" || sanitized === "eval" || sanitized === "self") {
    return sanitized;
  }

  try {
    const url = new URL(sanitized);

    if (url.protocol === "data:") {
      return "data:[redacted]";
    }

    url.search = "";
    url.hash = "";

    return url.toString().slice(0, maxLength);
  } catch {
    return sanitized;
  }
}

function sanitizeReportValue(value: unknown, maxLength = 160) {
  if (typeof value !== "string") {
    return undefined;
  }

  return redactSensitiveReportValue(value.replaceAll(/[\u0000-\u001f\u007f]/g, "").trim()).slice(0, maxLength);
}

function redactSensitiveReportValue(value: string) {
  return value
    .replaceAll(noncePattern, "'nonce-[redacted]'")
    .replaceAll(bearerPattern, "Bearer [redacted]")
    .replaceAll(sensitiveAssignmentPattern, "$1=[redacted]");
}
