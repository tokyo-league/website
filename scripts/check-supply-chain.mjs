import fs from "node:fs";

const checks = [];
const packageJson = readJson("package.json");
const packageLock = readJson("package-lock.json");

checkLockfile();
checkRootInstallScripts();
checkDependencySpecs();
checkLockfileRootDependencies();
checkLockfileResolvedSources();
checkLockfileIntegrity();

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
    .filter(([, spec]) => /^(?:git(?:hub)?:|https?:|file:|link:|workspace:)/i.test(String(spec)))
    .map(([name, spec]) => `${name}@${spec}`);

  pushCheck({
    label: "dependency spec sources",
    ok: forbidden.length === 0,
    success: "直接依存はregistry semver指定のみ",
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

    if (!entry.resolved.startsWith("https://registry.npmjs.org/")) {
      forbidden.push(`${packagePath || "(root)"} -> ${entry.resolved}`);
    }
  }

  pushCheck({
    label: "lockfile resolved sources",
    ok: forbidden.length === 0,
    success: "lockfile resolved は npm registry のみ",
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
