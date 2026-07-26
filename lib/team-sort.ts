const teamNameCollator = new Intl.Collator("ja-JP", {
  usage: "sort",
  sensitivity: "base",
  numeric: true,
});

export function sortTeamsByName<T extends { name: string }>(teams: T[]) {
  return [...teams].sort((left, right) => teamNameCollator.compare(left.name.normalize("NFKC"), right.name.normalize("NFKC")));
}
