export type StarTableTeam = {
  id: string;
  name: string;
  sortOrder?: number;
};

export type StarTableMatch = {
  id: string;
  matchDate: Date;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
};

export type StarTableDivision = {
  competitionName: string;
  divisionName: string;
  teams: StarTableTeam[];
  matches: StarTableMatch[];
  applyUnplayedMatchPointsAdjustment?: boolean;
};

type TeamStats = {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  remaining: number;
  judgeValue: number | null;
  rank: number | null;
};

type PairResult = {
  matchDate: Date;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
};

const SUMMARY_HEADERS = [
  ["試合数", ""],
  ["残", "残数"],
  ["勝", "勝数"],
  ["負", "負数"],
  ["分", "引分"],
  ["勝点", "勝点"],
  ["得点", "得点"],
  ["失点", "失点"],
  ["得失", "得失点差"],
  ["判定値", "判定値"],
  ["順位", "順位"],
];

export function renderStandingsStarTableSvg(division: StarTableDivision) {
  const teams = buildTeamOrder(division);
  const pairResults = buildPairResults(division.matches);
  const stats = buildStats(teams, pairResults, Boolean(division.applyUnplayedMatchPointsAdjustment));

  const indexWidth = 42;
  const teamWidth = 132;
  const opponentWidth = 66;
  const summaryWidths = [58, 46, 46, 46, 46, 58, 58, 58, 58, 82, 58];
  const titleHeight = 58;
  const spacerHeight = 22;
  const dateHeight = 28;
  const headerHeight = 64;
  const teamRowHeight = 36;
  const left = 24;
  const top = 20;
  const bodyTop = top + titleHeight + spacerHeight + dateHeight + headerHeight;
  const opponentStartX = left + indexWidth + teamWidth;
  const summaryStartX = opponentStartX + teams.length * opponentWidth;
  const tableWidth = indexWidth + teamWidth + teams.length * opponentWidth + summaryWidths.reduce((sum, width) => sum + width, 0);
  const tableHeight = titleHeight + spacerHeight + dateHeight + headerHeight + teams.length * teamRowHeight * 2;
  const width = left * 2 + tableWidth;
  const height = top * 2 + tableHeight;
  const asOfDate = formatJapanDate(getLatestMatchDate(division.matches) ?? new Date());
  const title = `${division.competitionName}    ${division.divisionName}`;

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title)} 星取表">`,
    "<style>",
    `.label{font-family:'MS PGothic','Yu Gothic','Hiragino Kaku Gothic ProN',sans-serif;fill:#111;dominant-baseline:middle}`,
    `.thin{stroke:#111;stroke-width:1;shape-rendering:crispEdges}`,
    `.heavy{stroke:#111;stroke-width:2;shape-rendering:crispEdges}`,
    `.muted{fill:#f5f5f5}`,
    "</style>",
    `<rect x="0" y="0" width="${width}" height="${height}" fill="#fff"/>`,
  ];

  parts.push(rect(left, top, tableWidth, titleHeight, "none", "thin"));
  parts.push(text(title, left + tableWidth / 2, top + titleHeight / 2, 28, "middle", true));

  const dateY = top + titleHeight + spacerHeight;
  const dateWidth = 250;
  parts.push(text(`${asOfDate} 現在`, left + tableWidth - dateWidth / 2, dateY + dateHeight / 2, 16, "middle", false));

  const headerY = dateY + dateHeight;
  parts.push(rect(left, headerY, indexWidth + teamWidth, headerHeight, "none", "thin"));
  teams.forEach((team, index) => {
    const x = opponentStartX + index * opponentWidth;
    const fittedName = fitText(team.name, opponentWidth - 8, 16, 9);
    parts.push(rect(x, headerY, opponentWidth, headerHeight, "none", "thin"));
    parts.push(text(fittedName.value, x + opponentWidth / 2, headerY + headerHeight / 2, fittedName.size, "middle", false));
  });

  let summaryX = summaryStartX;
  SUMMARY_HEADERS.forEach(([main, sub], index) => {
    const cellWidth = summaryWidths[index];
    parts.push(rect(summaryX, headerY, cellWidth, headerHeight, "none", index === 0 || index === 10 ? "heavy" : "thin"));
    parts.push(text(main, summaryX + cellWidth / 2, headerY + 24, 16, "middle", false));
    if (sub) {
      parts.push(text(sub, summaryX + cellWidth / 2, headerY + 46, 11, "middle", false));
    }
    summaryX += cellWidth;
  });

  teams.forEach((team, rowIndex) => {
    const y = bodyTop + rowIndex * teamRowHeight * 2;
    const teamStats = stats.get(team.id);

    parts.push(rect(left, y, indexWidth, teamRowHeight * 2, "none", "thin"));
    parts.push(text(String(rowIndex + 1), left + indexWidth / 2, y + teamRowHeight, 14, "middle", false));
    parts.push(rect(left + indexWidth, y, teamWidth, teamRowHeight * 2, "none", "thin"));
    const fittedName = fitText(team.name, teamWidth - 10, 18, 10);
    parts.push(text(fittedName.value, left + indexWidth + teamWidth / 2, y + teamRowHeight, fittedName.size, "middle", false));

    teams.forEach((opponent, columnIndex) => {
      const x = opponentStartX + columnIndex * opponentWidth;
      if (opponent.id === team.id) {
        parts.push(rect(x, y, opponentWidth, teamRowHeight * 2, "#f7f7f7", "thin"));
        return;
      }

      const result = pairResults.get(pairKey(team.id, opponent.id));
      parts.push(rect(x, y, opponentWidth, teamRowHeight, "none", "thin"));
      parts.push(rect(x, y + teamRowHeight, opponentWidth, teamRowHeight, "none", "thin"));

      if (!result && division.applyUnplayedMatchPointsAdjustment) {
        parts.push(text("▲", x + opponentWidth / 2, y + teamRowHeight / 2, 20, "middle", false));
      }

      if (!result) {
        return;
      }

      const perspective = getPerspectiveResult(team.id, result);
      parts.push(text(perspective.mark, x + opponentWidth / 2, y + teamRowHeight / 2, 22, "middle", false));
      parts.push(text(String(perspective.goalsFor), x + 18, y + teamRowHeight + teamRowHeight / 2, 18, "middle", false));
      parts.push(text("－", x + opponentWidth / 2, y + teamRowHeight + teamRowHeight / 2, 18, "middle", false));
      parts.push(text(String(perspective.goalsAgainst), x + opponentWidth - 18, y + teamRowHeight + teamRowHeight / 2, 18, "middle", false));
    });

    const summaryValues = teamStats
      ? [
          teamStats.played,
          teamStats.remaining,
          valueOrBlank(teamStats.played, teamStats.won),
          valueOrBlank(teamStats.played, teamStats.lost),
          valueOrBlank(teamStats.played, teamStats.drawn),
          teamStats.points,
          valueOrBlank(teamStats.played, teamStats.goalsFor),
          valueOrBlank(teamStats.played, teamStats.goalsAgainst),
          valueOrBlank(teamStats.played, teamStats.goalDifference),
          teamStats.judgeValue ?? "",
          teamStats.rank ?? "",
        ]
      : Array.from({ length: SUMMARY_HEADERS.length }, () => "");

    let x = summaryStartX;
    summaryValues.forEach((value, index) => {
      const cellWidth = summaryWidths[index];
      parts.push(rect(x, y, cellWidth, teamRowHeight * 2, "none", index === 0 || index === 10 ? "heavy" : "thin"));
      parts.push(text(String(value), x + cellWidth / 2, y + teamRowHeight, index === 10 ? 20 : 18, "middle", index === 10));
      x += cellWidth;
    });
  });

  parts.push(`<line x1="${summaryStartX}" y1="${headerY}" x2="${summaryStartX}" y2="${top + tableHeight}" class="heavy"/>`);
  parts.push(`<line x1="${left + tableWidth}" y1="${headerY}" x2="${left + tableWidth}" y2="${top + tableHeight}" class="thin"/>`);
  parts.push("</svg>");

  return parts.join("");
}

function buildTeamOrder(division: StarTableDivision) {
  const teams = new Map<string, StarTableTeam>();

  for (const team of [...division.teams].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))) {
    teams.set(team.id, team);
  }

  for (const match of division.matches) {
    if (!teams.has(match.homeTeamId)) {
      teams.set(match.homeTeamId, { id: match.homeTeamId, name: match.homeTeamName });
    }
    if (!teams.has(match.awayTeamId)) {
      teams.set(match.awayTeamId, { id: match.awayTeamId, name: match.awayTeamName });
    }
  }

  return Array.from(teams.values());
}

function buildPairResults(matches: StarTableMatch[]) {
  const results = new Map<string, PairResult>();

  for (const match of [...matches].sort((a, b) => a.matchDate.getTime() - b.matchDate.getTime())) {
    if (match.homeScore === null || match.awayScore === null) continue;

    results.set(pairKey(match.homeTeamId, match.awayTeamId), {
      matchDate: match.matchDate,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
    });
  }

  return results;
}

function buildStats(
  teams: StarTableTeam[],
  pairResults: Map<string, PairResult>,
  applyUnplayedMatchPointsAdjustment: boolean,
) {
  const stats = new Map<string, TeamStats>(
    teams.map((team) => [
      team.id,
      {
        teamId: team.id,
        played: 0,
        won: 0,
        lost: 0,
        drawn: 0,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        remaining: Math.max(teams.length - 1, 0),
        judgeValue: null,
        rank: null,
      },
    ]),
  );

  for (const result of pairResults.values()) {
    const home = stats.get(result.homeTeamId);
    const away = stats.get(result.awayTeamId);
    if (!home || !away) continue;

    applyStats(home, result.homeScore, result.awayScore);
    applyStats(away, result.awayScore, result.homeScore);
  }

  const rows = Array.from(stats.values());
  rows.forEach((row) => {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
    row.remaining = Math.max(teams.length - 1 - row.played, 0);
    if (applyUnplayedMatchPointsAdjustment) {
      row.points -= row.remaining;
    }
  });

  const playedRows = rows.filter((row) => row.played > 0);
  const goalDifferences = playedRows.map((row) => row.goalDifference);
  const judgeBase = goalDifferences.length > 0 ? Math.max(...goalDifferences) - Math.min(...goalDifferences) + 1 : 1;

  playedRows.forEach((row) => {
    row.judgeValue = row.points * judgeBase + row.goalDifference;
  });

  const rankedRows = [...playedRows].sort((a, b) => (b.judgeValue ?? 0) - (a.judgeValue ?? 0));
  rankedRows.forEach((row, index) => {
    const sameValueIndex = rankedRows.findIndex((candidate) => candidate.judgeValue === row.judgeValue);
    row.rank = sameValueIndex + 1 || index + 1;
  });

  return stats;
}

function applyStats(row: TeamStats, goalsFor: number, goalsAgainst: number) {
  row.played += 1;
  row.goalsFor += goalsFor;
  row.goalsAgainst += goalsAgainst;

  if (goalsFor > goalsAgainst) {
    row.won += 1;
    row.points += 3;
  } else if (goalsFor < goalsAgainst) {
    row.lost += 1;
  } else {
    row.drawn += 1;
    row.points += 1;
  }
}

function getPerspectiveResult(teamId: string, result: PairResult) {
  const goalsFor = teamId === result.homeTeamId ? result.homeScore : result.awayScore;
  const goalsAgainst = teamId === result.homeTeamId ? result.awayScore : result.homeScore;
  const mark = goalsFor > goalsAgainst ? "○" : goalsFor < goalsAgainst ? "●" : "△";

  return { goalsFor, goalsAgainst, mark };
}

function getLatestMatchDate(matches: StarTableMatch[]) {
  const dates = matches
    .filter((match) => match.homeScore !== null && match.awayScore !== null)
    .map((match) => match.matchDate)
    .sort((a, b) => b.getTime() - a.getTime());

  return dates[0] ?? null;
}

function pairKey(left: string, right: string) {
  return [left, right].sort().join("::");
}

function valueOrBlank(played: number, value: number) {
  return played > 0 ? value : "";
}

function formatJapanDate(date: Date) {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}/${month}/${day}`;
}

function rect(x: number, y: number, width: number, height: number, fill: string, strokeClass: "thin" | "heavy") {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" class="${strokeClass}"/>`;
}

function text(value: string, x: number, y: number, size: number, anchor: "start" | "middle", bold: boolean) {
  const weight = bold ? 700 : 400;
  return `<text class="label" x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${escapeXml(value)}</text>`;
}

function fitText(value: string, maxWidth: number, maxSize: number, minSize: number) {
  const estimated = value.length * maxSize * 0.85;
  if (estimated <= maxWidth) return { value, size: maxSize };

  const size = Math.max(minSize, Math.floor(maxWidth / Math.max(value.length * 0.85, 1)));
  if (value.length * size * 0.85 <= maxWidth) {
    return { value, size };
  }

  let clipped = value;
  while (clipped.length > 1 && (clipped.length + 1) * minSize * 0.85 > maxWidth) {
    clipped = clipped.slice(0, -1);
  }

  return { value: `${clipped}…`, size: minSize };
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
