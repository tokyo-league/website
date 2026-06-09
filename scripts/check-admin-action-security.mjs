import fs from "node:fs";
import path from "node:path";

const adminRoot = path.resolve("app/admin");
const checks = [];
const actionFiles = findActionFiles(adminRoot);

console.log("Tokyo League admin action security check");
console.log("");

if (actionFiles.length === 0) {
  checks.push({
    ok: false,
    label: "管理Server Action",
    message: "app/admin 配下に actions.ts が見つかりません。",
  });
}

for (const filePath of actionFiles) {
  checkActionFile(filePath);
}

for (const check of checks) {
  console.log(`${check.ok ? "[ok]" : "[error]"} ${check.label}: ${check.message}`);
}

const failed = checks.filter((check) => !check.ok);

console.log("");

if (failed.length > 0) {
  console.log(`${failed.length}件の管理Server Actionセキュリティチェックが未達です。`);
  process.exit(1);
}

console.log("管理Server Actionセキュリティチェックはすべて通過しました。");

function checkActionFile(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  const source = fs.readFileSync(filePath, "utf8");

  pushCheck({
    label: `${relativePath}: server action宣言`,
    ok: source.startsWith("\"use server\";") || source.startsWith("'use server';"),
    success: "\"use server\" を宣言しています",
    failure: "\"use server\" をファイル先頭に宣言してください。",
  });

  pushCheck({
    label: `${relativePath}: 認可import`,
    ok: source.includes("@/lib/admin-access"),
    success: "@/lib/admin-access から認可ガードを参照しています",
    failure: "requireOwner または getAdminScope を '@/lib/admin-access' から参照してください。",
  });

  const actions = extractExportedAsyncFunctions(source);

  pushCheck({
    label: `${relativePath}: exported actions`,
    ok: actions.length > 0,
    success: `${actions.length}件のexport済みServer Actionを確認`,
    failure: "export async function が見つかりません。",
  });

  for (const action of actions) {
    checkAction(relativePath, action);
  }
}

function checkAction(relativePath, action) {
  const hasOwnerGuard = /\brequireOwner\s*\(/.test(action.body);
  const hasScopeGuard = /\bgetAdminScope\s*\(/.test(action.body);
  const hasDivisionAuthorization = /\bcanEditDivision\s*\(\s*scope\s*,/.test(action.body);
  const isOwnerScopeOnly = /scope\.admin\.role\s*===\s*"OWNER"/.test(action.body);

  pushCheck({
    label: `${relativePath}: ${action.name} 認証ガード`,
    ok: hasOwnerGuard || hasScopeGuard,
    success: hasOwnerGuard ? "Owner認可を確認" : "管理者スコープ取得を確認",
    failure: "関数内で requireOwner() または getAdminScope() を必ず呼び出してください。",
  });

  if (hasScopeGuard && !hasOwnerGuard) {
    pushCheck({
      label: `${relativePath}: ${action.name} スコープ認可`,
      ok: hasDivisionAuthorization || isOwnerScopeOnly,
      success: hasDivisionAuthorization ? "対象リーグ認可を確認" : "Owner限定スコープを確認",
      failure: "getAdminScope() を使うServer Actionは対象リーグ認可またはOwner限定判定を行ってください。",
    });
  }
}

function extractExportedAsyncFunctions(source) {
  const actions = [];
  const pattern = /export\s+async\s+function\s+([A-Za-z0-9_]+)\s*\(/g;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    const openBraceIndex = source.indexOf("{", pattern.lastIndex);

    if (openBraceIndex === -1) {
      continue;
    }

    const closeBraceIndex = findMatchingBrace(source, openBraceIndex);

    if (closeBraceIndex === -1) {
      actions.push({
        name: match[1],
        body: "",
      });
      continue;
    }

    actions.push({
      name: match[1],
      body: source.slice(openBraceIndex + 1, closeBraceIndex),
    });

    pattern.lastIndex = closeBraceIndex + 1;
  }

  return actions;
}

function findMatchingBrace(source, openBraceIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = openBraceIndex; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === quote) {
        quote = null;
      }

      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function findActionFiles(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const files = [];
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...findActionFiles(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name === "actions.ts") {
      files.push(entryPath);
    }
  }

  return files.sort();
}

function pushCheck({ label, ok, success, failure }) {
  checks.push({
    label,
    ok,
    message: ok ? success : failure,
  });
}
