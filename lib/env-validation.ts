const productionRequiredEnv = [
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

export function assertProductionEnvReady(env: NodeJS.ProcessEnv = process.env) {
  if (!isProductionDeploymentEnv(env)) {
    return;
  }

  const missing = getMissingProductionEnv(env);

  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }
}
