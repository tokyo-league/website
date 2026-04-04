import manifestData from "@/public/site-assets/manifest.json";

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

const manifest = manifestData as Manifest;

function toLabel(path: string) {
  return path.split("/").pop() ?? path;
}

export async function getTeamAssetOptions() {
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
