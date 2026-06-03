import { sanitizePlainText } from "@/lib/security";

export function normalizeOptionalHttpUrl(value: string, label: string) {
  const input = sanitizePlainText(value, 255);

  if (!input || input === "ー" || input === "-") {
    return null;
  }

  try {
    const url = new URL(input);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error(`${label}は http または https のURLを入力してください。`);
    }

    return url.toString();
  } catch (error) {
    if (error instanceof Error && error.message.includes(label)) {
      throw error;
    }

    throw new Error(`${label}を確認してください。`);
  }
}

export function normalizeOptionalAssetPath(value: string, label: string) {
  const input = sanitizePlainText(value, 255);

  if (!input || input === "ー" || input === "-") {
    return null;
  }

  if (input.startsWith("/") && !input.startsWith("//")) {
    return input;
  }

  return normalizeOptionalHttpUrl(input, label);
}
