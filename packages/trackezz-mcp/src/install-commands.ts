#!/usr/bin/env node

import { cp, mkdir, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourceDir = join(__dirname, "..", "cursor-commands");

async function main() {
  const projectMode = process.argv.includes("--project");
  const targetDir = projectMode
    ? join(process.cwd(), ".cursor", "commands")
    : join(homedir(), ".cursor", "commands");

  await mkdir(targetDir, { recursive: true });

  const files = (await readdir(sourceDir)).filter((file) =>
    file.endsWith(".md"),
  );
  for (const file of files) {
    await cp(join(sourceDir, file), join(targetDir, file), { force: true });
  }

  console.log(
    `Installed ${files.length} TrackEzz slash commands to ${targetDir}`,
  );
  console.log(
    "Note: @trackezz/mcp 0.1.1+ serves prompts over MCP — prefer mcp.json only.",
  );
  console.log("In Cursor Agent chat, type / and pick tezz-* commands.");
}

main().catch((err) => {
  console.error("Failed to install TrackEzz Cursor commands:", err);
  process.exit(1);
});
