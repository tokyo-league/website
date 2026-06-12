export const manualCheckItems = [
  {
    label: "本番公開サイト主要導線",
    memo: "/, /competitions, /news, /teams, /downloads, /contact",
  },
  {
    label: "本番管理者ログイン",
    memo: "登録済みOwnerメールでGoogleログイン",
  },
  {
    label: "Owner操作",
    memo: "ニュース、チーム、資料、担当割当、更新履歴",
  },
  {
    label: "Editor操作",
    memo: "割当済みリーグの結果管理",
  },
  {
    label: "Google OAuthリダイレクトURI",
    memo: "本番ドメインのみ許可",
  },
  {
    label: "初期Owner",
    memo: "メールアドレスを関係者へ共有。値は必要最小限",
  },
  {
    label: "PDF目視確認",
    memo: "ページ欠け、画像欠け、文字切れ",
  },
  {
    label: "Runbook共有",
    memo: "関係者へ共有",
  },
];

export function manualChecksTemplate({ status = "未記入" } = {}) {
  return `| 項目 | 状態 | メモ |
| --- | --- | --- |
${manualCheckItems.map((item) => `| ${item.label} | ${status} | ${item.memo} |`).join("\n")}`;
}

export function validateManualChecksContent(content) {
  const errors = [];
  const trimmedContent = content.trim();

  if (trimmedContent.length < 160) {
    errors.push("手動確認メモの内容が短すぎます。各手動確認の結果を記録してください。");
  }

  const missingItems = manualCheckItems
    .map((item) => item.label)
    .filter((label) => !trimmedContent.includes(label));

  if (missingItems.length > 0) {
    errors.push(`手動確認メモに手動確認項目が不足しています: ${missingItems.join(", ")}`);
  }

  const manualRows = parseManualCheckRows(trimmedContent);
  const incompleteItems = manualCheckItems
    .map((item) => item.label)
    .filter((label) => manualRows.get(label) !== "実施済み");

  if (incompleteItems.length > 0) {
    errors.push(`手動確認メモの状態は必ず「実施済み」にしてください: ${incompleteItems.join(", ")}`);
  }

  if (/(未記入|未実行|TODO|TBD)/i.test(trimmedContent)) {
    errors.push("手動確認メモに未記入/未実行/TODOが残っています。");
  }

  return errors;
}

function parseManualCheckRows(content) {
  const rows = new Map();

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line.startsWith("|") || !line.endsWith("|")) {
      continue;
    }

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length < 2 || cells[0] === "項目" || /^:?-+:?$/.test(cells[0])) {
      continue;
    }

    rows.set(stripInlineMarkdown(cells[0]), stripInlineMarkdown(cells[1]));
  }

  return rows;
}

function stripInlineMarkdown(value) {
  return value.replaceAll("`", "").trim();
}
