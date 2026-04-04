import { readFile } from "node:fs/promises";

type ManifestFile = {
  group: string;
  output: string;
};

type Manifest = {
  files: ManifestFile[];
};

export type TeamAssetOption = {
  label: string;
  path: string;
};

let cachedManifest: Manifest | null = null;

async function readManifest() {
  if (cachedManifest) {
    return cachedManifest;
  }

  const manifest = JSON.parse(
    await readFile(new URL("../public/site-assets/manifest.json", import.meta.url), "utf8"),
  ) as Manifest;

  cachedManifest = manifest;

  return manifest;
}

function toLabel(path: string) {
  return path.split("/").pop() ?? path;
}

export async function getTeamAssetOptions() {
  const manifest = await readManifest();

  const logos = manifest.files
    .filter((file) => file.group === "teams/logos")
    .map((file) => file.output.replace(/^public/, ""))
    .sort((a, b) => a.localeCompare(b, "ja"))
    .map((path) => ({ path, label: toLabel(path) }));

  const photos = manifest.files
    .filter((file) => file.group === "teams/photos")
    .map((file) => file.output.replace(/^public/, ""))
    .sort((a, b) => a.localeCompare(b, "ja"))
    .map((path) => ({ path, label: toLabel(path) }));

  return { logos, photos };
}
