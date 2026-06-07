const baseUrl = parseBaseUrl(process.argv[2]);
const checks = [];

await checkLoginPage();
await checkAdminRedirect();
await checkAuthSession();
await checkAuthProviders();

console.log("Tokyo League admin route check");
console.log(`Base URL: ${baseUrl.origin}`);
console.log("");

for (const check of checks) {
  console.log(`${check.ok ? "[ok]" : "[error]"} ${check.label}: ${check.message}`);
}

const failed = checks.filter((check) => !check.ok);

console.log("");

if (failed.length > 0) {
  console.log(`${failed.length}件の管理者ツール到達チェックが未達です。`);
  process.exit(1);
}

console.log("管理者ツール到達チェックはすべて通過しました。");

async function checkLoginPage() {
  const response = await fetchUrl("/login");
  if (!response) {
    return;
  }

  const messages = [];
  const body = await response.text();

  if (!response.ok) {
    messages.push(`/login が ${response.status} を返しました。`);
  }

  for (const text of ["管理画面ログイン", "Google"]) {
    if (!body.includes(text)) {
      messages.push(`ログイン画面に「${text}」がありません。`);
    }
  }

  checks.push({
    ok: messages.length === 0,
    label: "ログイン画面",
    message: messages.length === 0 ? "/login ok" : messages.join(" "),
  });
}

async function checkAdminRedirect() {
  const response = await fetchUrl("/admin");
  if (!response) {
    return;
  }

  const location = response.headers.get("location") ?? "";
  const isRedirect = response.status >= 300 && response.status < 400;
  const redirectsToLogin = location.includes("/login") && location.includes("callbackUrl");
  const messages = [];

  if (!isRedirect || !redirectsToLogin) {
    messages.push(`/admin は未ログイン時に /login?callbackUrl=... へredirectされていません。status=${response.status} location=${location || "-"}`);
  }

  checks.push({
    ok: messages.length === 0,
    label: "未ログイン管理画面",
    message: messages.length === 0 ? "/admin redirect ok" : messages.join(" "),
  });
}

async function checkAuthSession() {
  const response = await fetchUrl("/api/auth/session");
  if (!response) {
    return;
  }

  const messages = [];
  const body = await response.text();

  if (!response.ok) {
    messages.push(`/api/auth/session が ${response.status} を返しました。`);
  }

  try {
    JSON.parse(body);
  } catch {
    messages.push("/api/auth/session がJSONを返していません。");
  }

  checks.push({
    ok: messages.length === 0,
    label: "認証セッションAPI",
    message: messages.length === 0 ? "/api/auth/session ok" : messages.join(" "),
  });
}

async function checkAuthProviders() {
  const response = await fetchUrl("/api/auth/providers");
  if (!response) {
    return;
  }

  const messages = [];
  const body = await response.text();

  if (!response.ok) {
    messages.push(`/api/auth/providers が ${response.status} を返しました。`);
  }

  try {
    const providers = JSON.parse(body);
    if (!providers.google) {
      messages.push("/api/auth/providers に google provider がありません。");
    }
  } catch {
    messages.push("/api/auth/providers がJSONを返していません。");
  }

  checks.push({
    ok: messages.length === 0,
    label: "Google認証Provider",
    message: messages.length === 0 ? "/api/auth/providers google ok" : messages.join(" "),
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

function parseBaseUrl(value) {
  if (!value) {
    console.log("[error] 検査対象URLを指定してください。例: npm run admin:routes -- https://example.com");
    process.exit(1);
  }

  try {
    return new URL(value);
  } catch {
    console.log(`[error] URLを確認してください: ${value}`);
    process.exit(1);
  }
}
