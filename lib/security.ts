const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function sanitizePlainText(value: string, maxLength: number) {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function normalizeEmail(value: string) {
  return sanitizePlainText(value, 255).toLowerCase();
}

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value);
}

export function isValidUuid(value: string) {
  return UUID_PATTERN.test(value);
}

export function normalizeSlug(value: string, maxLength = 80) {
  return sanitizePlainText(value, maxLength)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function isValidSlug(value: string) {
  return SLUG_PATTERN.test(value);
}

export function parseInteger(value: string) {
  if (!/^-?\d+$/.test(value)) {
    return null;
  }

  return Number.parseInt(value, 10);
}
