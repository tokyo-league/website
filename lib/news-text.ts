function replaceEntities(value: string) {
  return value
    .replace(/\[&hellip;\]/gi, "…")
    .replace(/\[\.\.\.\]/g, "…")
    .replace(/\[…\]/g, "…")
    .replace(/&hellip;/gi, "…")
    .replace(/&nbsp;/gi, " ");
}

export function normalizeNewsText(value: string) {
  return replaceEntities(value)
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeNewsBody(value: string) {
  return replaceEntities(value)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildNewsExcerpt(value: string, maxLength = 120) {
  const normalized = normalizeNewsText(value);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}…`;
}
