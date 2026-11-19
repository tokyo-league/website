import fs from "node:fs";

const checks = [];
const packageJson = readJson("package.json");
const packageLock = readJson("package-lock.json");
// SheetJS no longer publishes fixes to npm. Allow only this official release,
// with its exact version and digest; other external sources remain rejected.
const sheetJsRelease = {
  url: "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz",
  version: "0.20.3",
  integrity: "sha512-oLDq3jw7AcLqKWH2AhCpVTZl8mf6X2YReP+Neh0SJUzV/BdZYjth94tG5toiMB1PPrYtxOCfaoUCkvtuH+3AJA==",
};

checkLockfile();
checkRootInstallScripts();
checkDependencySpecs();
checkLockfileRootDependencies();
checkLockfileResolvedSources();
checkLockfileIntegrity();
checkSheetJsRelease();

console.log("Tokyo League supply chain check");
console.log("");

for (const check of checks) {
  console.log(`${check.ok ? "[ok]" : "[error]"} ${check.label}: ${check.message}`);
}

const failed = checks.filter((check) => !check.ok);

console.log("");

if (failed.length > 0) {
  console.log(`${failed.length}件の依存関係チェックが未達です。`);
  process.exit(1);
}

console.log("依存関係チェックはすべて通過しました。");

function checkLockfile() {
  pushCheck({
    label: "package-lock",
    ok: Boolean(packageLock) && packageLock.lockfileVersion === 3 && Boolean(packageLock.packages?.[""]),
    success: "lockfileVersion 3 の package-lock.json を使用",
    failure: "package-lock.json がない、またはnpm lockfile v3ではありません。",
  });
}

function checkRootInstallScripts() {
  const scripts = packageJson?.scripts ?? {};
  const forbidden = ["preinstall", "install", "postinstall", "prepare"].filter((name) => scripts[name]);

  pushCheck({
    label: "root install scripts",
    ok: forbidden.length === 0,
    success: "root packageにinstall hookなし",
    failure: `root packageのinstall hookを確認してください: ${forbidden.join(", ")}`,
  });
}

function checkDependencySpecs() {
  const dependencies = {
    ...(packageJson?.dependencies ?? {}),
    ...(packageJson?.devDependencies ?? {}),
    ...(packageJson?.optionalDependencies ?? {}),
  };
  const forbidden = Object.entries(dependencies)
    .filter(([name, spec]) => !(name === "xlsx" && spec === sheetJsRelease.url))
    .filter(([, spec]) => /^(?:git(?:hub)?:|https?:|file:|link:|workspace:)/i.test(String(spec)))
    .map(([name, spec]) => `${name}@${spec}`);

  pushCheck({
    label: "dependency spec sources",
    ok: forbidden.length === 0,
    success: "直接依存はregistry semver、または固定済みの公式SheetJS配布のみ",
    failure: `非registry/ローカル依存があります: ${forbidden.join(", ")}`,
  });
}

function checkLockfileRootDependencies() {
  const root = packageLock?.packages?.[""] ?? {};
  const missing = [];

  for (const field of ["dependencies", "devDependencies", "optionalDependencies"]) {
    const expected = packageJson?.[field] ?? {};
    const actual = root[field] ?? {};

    for (const [name, spec] of Object.entries(expected)) {
      if (actual[name] !== spec) {
        missing.push(`${field}.${name}`);
      }
    }
  }

  pushCheck({
    label: "package-lock root dependencies",
    ok: missing.length === 0,
    success: "package.json と package-lock root依存が一致",
    failure: `package-lock root依存が不一致です: ${missing.join(", ")}`,
  });
}

function checkLockfileResolvedSources() {
  const forbidden = [];
  const packages = packageLock?.packages ?? {};

  for (const [packagePath, entry] of Object.entries(packages)) {
    if (!entry.resolved) {
      continue;
    }

    const isOfficialSheetJs = packagePath === "node_modules/xlsx" && entry.resolved === sheetJsRelease.url;
    if (!entry.resolved.startsWith("https://registry.npmjs.org/") && !isOfficialSheetJs) {
      forbidden.push(`${packagePath || "(root)"} -> ${entry.resolved}`);
    }
  }

  pushCheck({
    label: "lockfile resolved sources",
    ok: forbidden.length === 0,
    success: "lockfile resolved は npm registry、または固定済みの公式SheetJS配布のみ",
    failure: `非npm registryのresolvedがあります: ${forbidden.slice(0, 10).join(", ")}`,
  });
}

function checkLockfileIntegrity() {
  const missing = [];
  const packages = packageLock?.packages ?? {};

  for (const [packagePath, entry] of Object.entries(packages)) {
    if (!packagePath || !entry.resolved) {
      continue;
    }

    if (!entry.integrity) {
      missing.push(packagePath);
    }
  }

  pushCheck({
    label: "lockfile integrity",
    ok: missing.length === 0,
    success: "resolved付きpackageはintegrityあり",
    failure: `integrity欠落: ${missing.slice(0, 10).join(", ")}`,
  });
}

function checkSheetJsRelease() {
  const entry = packageLock?.packages?.["node_modules/xlsx"];
  pushCheck({
    label: "SheetJS official release",
    ok: packageJson?.dependencies?.xlsx === sheetJsRelease.url
      && entry?.resolved === sheetJsRelease.url
      && entry?.version === sheetJsRelease.version
      && entry?.integrity === sheetJsRelease.integrity,
    success: "公式CDNの修正版0.20.3をURL・バージョン・SHA-512で固定",
    failure: "SheetJSの取得元・バージョン・integrityが確認済みの公式配布と一致しません。",
  });
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    checks.push({
      label: filePath,
      ok: false,
      message: `JSONを読めませんでした: ${error instanceof Error ? error.message : String(error)}`,
    });
    return undefined;
  }
}

function pushCheck({ label, ok, success, failure }) {
  checks.push({
    label,
    ok,
    message: ok ? success : failure,
  });
}
