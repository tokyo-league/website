import { spawn } from "node:child_process";
import process from "node:process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const shouldApply = process.argv.includes("--apply");
const shouldForce = process.argv.includes("--force");

function estimateColors(teams) {
  return new Promise((resolve, reject) => {
    const child = spawn("python3", [new URL("./estimate-uniform-colors.py", import.meta.url).pathname], {
      stdio: ["pipe", "pipe", "inherit"],
    });
    let output = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Color estimator exited with ${code}`));
        return;
      }
      resolve(JSON.parse(output));
    });
    child.stdin.end(JSON.stringify(teams));
  });
}

try {
  const teams = await prisma.team.findMany({
    select: {
      id: true,
      name: true,
      photoPath: true,
      logoPath: true,
      homeUniformColor: true,
      awayUniformColor: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const targets = teams.filter((team) => shouldForce || !team.homeUniformColor || !team.awayUniformColor);
  const estimated = await estimateColors(targets);
  const colorsById = new Map(estimated.map((item) => [item.id, item.colors]));
  let inferred = 0;
  let inferredAway = 0;
  let fallback = 0;

  for (const team of targets) {
    const colors = colorsById.get(team.id);
    const homeUniformColor = colors?.home ?? null;
    const awayUniformColor = colors?.away ?? null;
    if (colors?.home) inferred += 1;
    else fallback += 1;
    if (colors?.away) inferredAway += 1;

    if (shouldApply) {
      await prisma.team.update({
        where: { id: team.id },
        data: { homeUniformColor, awayUniformColor },
      });
    }
  }

  console.log(JSON.stringify({ mode: shouldApply ? "apply" : "dry-run", targets: targets.length, inferredHome: inferred, inferredAway, fallback }, null, 2));
} finally {
  await prisma.$disconnect();
}
