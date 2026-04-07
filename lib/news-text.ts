export function normalizeNewsText(value: string) {
  return value
    .replace(/\[&hellip;\]/gi, "…")
    .replace(/\[\.\.\.\]/g, "…")
    .replace(/\[…\]/g, "…")
    .replace(/&hellip;/gi, "…")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildNewsExcerpt(value: string, maxLength = 120) {
  const normalized = normalizeNewsText(value);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}…`;
}
