const baseUrl = parseBaseUrl(process.argv[2]);
const checks = [];

const routeChecks = [
  {
    label: "公開トップ",
    path: "/",
    requiredText: ["第103回 東京リーグ", "最新ニュース"],
    requiredLinks: ["/competitions", "/news", "/teams", "/downloads"],
  },
  {
    label: "試合情報",
    path: "/competitions",
    requiredText: ["試合情報", "開催中の大会"],
    requiredLinks: ["/downloads", "/news"],
  },
  {
    label: "大会詳細",
    path: "/competitions/tokyo-league-103",
    requiredText: ["リーグ一覧", "リーグ結果を見る"],
    requiredLinks: ["/competitions/tokyo-league-103/a-league"],
  },
  {
    label: "リーグ詳細",
    path: "/competitions/tokyo-league-103/a-league",
    requiredText: ["Aリーグ", "試合結果画像", "所属チーム", "試合一覧"],
    requiredLinks: ["/competitions/tokyo-league-103"],
  },
  {
    label: "ニュース",
    path: "/news",
    requiredText: ["ニュース", "関連資料"],
    requiredLinks: ["/downloads"],
  },
  {
    label: "参加チーム",
    path: "/teams",
    requiredText: ["参加チーム", "掲載チーム"],
    requiredLinks: ["/competitions", "/contact"],
  },
  {
    label: "資料ダウンロード",
    path: "/downloads",
    requiredText: ["資料ダウンロード"],
  },
  {
    label: "お問い合わせ",
    path: "/contact",
    requiredText: ["お問い合わせ", "お問い合わせ先"],
  },
];

for (const route of routeChecks) {
  await checkRoute(route);
}

console.log("Tokyo League public route check");
console.log(`Base URL: ${baseUrl.origin}`);
console.log("");

for (const check of checks) {
  console.log(`${check.ok ? "[ok]" : "[error]"} ${check.label}: ${check.message}`);
}

const failed = checks.filter((check) => !check.ok);

console.log("");

if (failed.length > 0) {
  console.log(`${failed.length}件の公開導線チェックが未達です。`);
  process.exit(1);
}

console.log("公開サイト主要導線チェックはすべて通過しました。");

async function checkRoute({ label, path, requiredText = [], requiredLinks = [] }) {
  const response = await fetchUrl(path);
  if (!response) {
    return;
  }

  const messages = [];
  const body = await response.text();

  if (response.status < 200 || response.status >= 400) {
    messages.push(`${path} が ${response.status} を返しました。`);
  }

  for (const text of requiredText) {
    if (!body.includes(text)) {
      messages.push(`本文に「${text}」がありません。`);
    }
  }

  for (const link of requiredLinks) {
    if (!hasLink(body, link)) {
      messages.push(`リンク ${link} がありません。`);
    }
  }

  checks.push({
    ok: messages.length === 0,
    label,
    message: messages.length === 0 ? `${path} ok` : messages.join(" "),
  });
}

async function fetchUrl(path) {
  try {
    return await fetch(new URL(path, baseUrl), {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    checks.push({
      ok: false,
      label: path,
      message: `接続できませんでした: ${error instanceof Error ? error.message : String(error)}`,
    });
    return null;
  }
}

function hasLink(body, href) {
  return body.includes(`href="${href}"`) || body.includes(`href='${href}'`);
}

function parseBaseUrl(value) {
  if (!value) {
    console.log("[error] 検査対象URLを指定してください。例: npm run public:routes -- https://example.com");
    process.exit(1);
  }

  try {
    return new URL(value);
  } catch {
    console.log(`[error] URLを確認してください: ${value}`);
    process.exit(1);
  }
}
