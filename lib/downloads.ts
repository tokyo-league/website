import type { DownloadCategory } from "@prisma/client";

export function formatDownloadCategory(category: DownloadCategory) {
  if (category === "REGULATION") return "規約";
  if (category === "GUIDELINE") return "ガイドライン";
  if (category === "OTHER") return "その他";
  return "資料";
}
