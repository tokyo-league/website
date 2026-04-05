import { normalizeSlug } from "@/lib/security";

export function normalizeDivisionSlug(name: string) {
  const normalized = name.normalize("NFKC").trim();
  const match = normalized.match(/^([A-Za-z])\s*(?:リーグ|グループ)$/);

  if (match) {
    return `${match[1].toLowerCase()}-league`;
  }

  return normalizeSlug(normalized, 80);
}
