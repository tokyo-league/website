import { head } from "@vercel/blob";

export async function resolveAssetUrl(storageKey: string | null | undefined) {
  if (!storageKey) {
    return null;
  }

  if (storageKey.startsWith("http://") || storageKey.startsWith("https://") || storageKey.startsWith("/")) {
    return storageKey;
  }

  try {
    const blob = await head(storageKey);
    return blob.url;
  } catch {
    return null;
  }
}
