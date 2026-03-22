import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import process from "node:process";

const envFiles = [".env.local", ".env.dev", ".env"];

for (const file of envFiles) {
  if (existsSync(file)) {
    process.loadEnvFile(file);
  }
}

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("No command specified.");
  process.exit(1);
}

const child = spawn(command, args, {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
