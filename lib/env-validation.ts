export const productionRequiredEnv = [
  "AUTH_SECRET",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "DATABASE_URL",
  "DIRECT_URL",
  "BLOB_READ_WRITE_TOKEN",
] as const;

export function isProductionDeploymentEnv(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV === "production" && env.VERCEL_ENV === "production";
}

export function getMissingProductionEnv(env: NodeJS.ProcessEnv = process.env) {
  return productionRequiredEnv.filter((key) => !env[key]);
}

export function getInvalidProductionEnv(env: NodeJS.ProcessEnv = process.env) {
  const invalid: string[] = [];

  if (env.E2E_TEST_MODE) {
    invalid.push("E2E_TEST_MODE");
  }

  if (env.AUTH_SECRET && env.AUTH_SECRET.length < 32) {
    invalid.push("AUTH_SECRET");
  }

  if (env.AUTH_GOOGLE_ID && !env.AUTH_GOOGLE_ID.endsWith(".apps.googleusercontent.com")) {
    invalid.push("AUTH_GOOGLE_ID");
  }

  if (env.AUTH_GOOGLE_SECRET && env.AUTH_GOOGLE_SECRET.length < 16) {
    invalid.push("AUTH_GOOGLE_SECRET");
  }

  if (env.DATABASE_URL && !isPostgresUrl(env.DATABASE_URL)) {
    invalid.push("DATABASE_URL");
  }

  if (env.DIRECT_URL && !isPostgresUrl(env.DIRECT_URL)) {
    invalid.push("DIRECT_URL");
  }

  if (env.BLOB_READ_WRITE_TOKEN && !env.BLOB_READ_WRITE_TOKEN.startsWith("vercel_blob_rw_")) {
    invalid.push("BLOB_READ_WRITE_TOKEN");
  }

  for (const key of ["AUTH_URL", "NEXTAUTH_URL"]) {
    if (env[key] && !isHttpsProductionUrl(env[key])) {
      invalid.push(key);
    }
  }

  return invalid;
}

export function assertProductionEnvReady(env: NodeJS.ProcessEnv = process.env) {
  if (!isProductionDeploymentEnv(env)) {
    return;
  }

  const missing = getMissingProductionEnv(env);

  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }

  const invalid = getInvalidProductionEnv(env);

  if (invalid.length > 0) {
    throw new Error(`Invalid production environment variables: ${invalid.join(", ")}`);
  }
}

function isPostgresUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "postgres:" || url.protocol === "postgresql:";
  } catch {
    return false;
  }
}

function isHttpsProductionUrl(value: string) {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.hostname !== "localhost" &&
      url.hostname !== "127.0.0.1" &&
      url.hostname !== "::1" &&
      !url.hostname.includes("<") &&
      !url.hostname.includes(">")
    );
  } catch {
    return false;
  }
}
