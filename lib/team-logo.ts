import { siteAssets } from "@/lib/site-data";

export function isDisplayableTeamLogo(logoPath: string | null) {
  if (!logoPath || logoPath === siteAssets.logo) {
    return false;
  }

  const normalizedPath = logoPath.toLowerCase();

  return !normalizedPath.includes("/teams/photos/") && !normalizedPath.includes("ロゴグレー");
}

export function getTeamInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "T";
}
