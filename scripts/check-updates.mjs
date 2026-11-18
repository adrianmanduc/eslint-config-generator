/**
 * Reports whether the generator's data is current. Run with `pnpm check:updates`.
 *
 * For every plugin package it compares three versions:
 *   installed  what is in node_modules
 *   catalog    what src/features/generator/catalog was generated from
 *   latest     what npm publishes (skipped with --offline)
 *
 * It also flags a plugin whose latest release changes which ESLint majors it
 * supports, and a new ESLint major the generator does not offer yet.
 *
 * Exits with 1 when something needs attention, so it can gate CI.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDirectory = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const generatorDirectory = path.join(rootDirectory, "src/features/generator");
const isOffline = process.argv.includes("--offline");

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const importSource = (file) => import(pathToFileURL(path.join(generatorDirectory, file)).href);

/** The plugin definitions are TypeScript; Node strips the types on import. */
async function loadDefinitions() {
  const directory = path.join(generatorDirectory, "plugins");
  const files = readdirSync(directory).filter((file) => file.endsWith(".ts") && file !== "index.ts" && !file.endsWith(".test.ts"));
  const definitions = [];

  for (const file of files) {
    const definitionModule = await import(pathToFileURL(path.join(directory, file)).href);

    definitions.push(...Object.values(definitionModule).filter((value) => value && typeof value === "object" && "packageName" in value));
  }

  return definitions.sort((a, b) => a.id.localeCompare(b.id));
}

function getInstalled(installName) {
  try {
    return readJson(path.join(rootDirectory, "node_modules", installName, "package.json"));
  } catch {
    return null;
  }
}

async function getLatest(packageName) {
  // Scoped names keep their "@" but need the slash encoded.
  const response = await fetch(`https://registry.npmjs.org/${packageName.replace("/", "%2F")}/latest`);

  if (!response.ok) {
    throw new Error(`npm registry answered ${response.status} for ${packageName}`);
  }

  return response.json();
}

const { ESLINT_MAJORS } = await importSource("types.ts");
const { rangeSupportsMajor } = await importSource("semver.ts");
const manifest = readJson(path.join(generatorDirectory, "catalog/manifest.json"));
const definitions = await loadDefinitions();

/**
 * What to check. `installName` is the folder in node_modules, which differs
 * from the npm name for the aliased @eslint/js 10. ESLint 9 itself and its
 * @eslint/js are in maintenance and pinned to ^9, so "latest" does not apply.
 */
const targets = [
  { label: "eslint (this repo lints with it)", installName: "eslint", packageName: "eslint", pinnedMajor: true },
  { label: "@eslint/js for ESLint 9", installName: "@eslint/js", packageName: "@eslint/js", pinnedMajor: true },
  { label: "@eslint/js for ESLint 10", installName: "eslint-js-v10", packageName: "@eslint/js", catalog: manifest.core?.version },
  ...definitions
    .filter((definition) => definition.id !== "core")
    .map((definition) => ({
      label: definition.packageName,
      installName: definition.packageName,
      packageName: definition.packageName,
      catalog: manifest[definition.id]?.version,
      pluginId: definition.id,
    })),
  { label: "next", installName: "next", packageName: "next" },
];

const rows = [];
const outdated = [];
const problems = [];

for (const target of targets) {
  const installed = getInstalled(target.installName);
  const notes = [];
  let latestVersion = "";

  if (!installed) {
    rows.push([target.label, "missing", target.catalog ?? "", "", "not installed: run pnpm install"]);
    problems.push(`${target.label} is not installed`);
    continue;
  }

  if (target.catalog && target.catalog !== installed.version) {
    notes.push("catalog is stale: run pnpm catalog");
    problems.push(`${target.label}: catalog was generated from ${target.catalog}, installed is ${installed.version}`);
  }

  if (!isOffline && !target.pinnedMajor) {
    try {
      const latest = await getLatest(target.packageName);

      latestVersion = latest.version;

      if (latest.version !== installed.version) {
        notes.push("update available");
        // An aliased package has to be re-added under its alias.
        outdated.push(target.installName === target.packageName ? `${target.packageName}@latest` : `${target.installName}@npm:${target.packageName}@latest`);
      }

      if (target.pluginId) {
        const before = installed.peerDependencies?.eslint ?? null;
        const after = latest.peerDependencies?.eslint ?? null;

        for (const major of ESLINT_MAJORS) {
          const supported = rangeSupportsMajor(before, major);
          const willSupport = rangeSupportsMajor(after, major);

          if (supported !== willSupport) {
            notes.push(`latest ${willSupport ? "adds" : "DROPS"} ESLint ${major} support`);
          }
        }
      }
    } catch (error) {
      notes.push(`lookup failed: ${error.message}`);
      problems.push(`${target.label}: could not reach the npm registry`);
    }
  }

  rows.push([target.label, installed.version, target.catalog ?? "", latestVersion || (target.pinnedMajor ? "pinned" : ""), notes.join("; ") || "ok"]);
}

if (!isOffline) {
  try {
    const latestEslint = await getLatest("eslint");
    const latestMajor = Number(latestEslint.version.split(".")[0]);
    const newestSupported = Math.max(...ESLINT_MAJORS);

    if (latestMajor > newestSupported) {
      problems.push(`ESLint ${latestMajor} is out (${latestEslint.version}) but the generator only offers ${ESLINT_MAJORS.join(" and ")}`);
    }
  } catch {
    // Already reported per package if the registry is unreachable.
  }
}

const headers = ["package", "installed", "catalog", "latest", "status"];
const widths = headers.map((header, index) => Math.max(header.length, ...rows.map((row) => String(row[index]).length)));
const formatRow = (row) => row.map((cell, index) => String(cell).padEnd(widths[index])).join("  ").trimEnd();

/* eslint-disable no-console -- CLI report */
console.info(formatRow(headers));
console.info(widths.map((width) => "-".repeat(width)).join("  "));
rows.forEach((row) => console.info(formatRow(row)));
console.info("");

if (problems.length > 0) {
  console.info("Needs attention:");
  problems.forEach((problem) => console.info(`  - ${problem}`));
  console.info("");
}

if (outdated.length > 0) {
  console.info("To update, then regenerate and verify:");
  const plugins = outdated.filter((spec) => spec !== "next@latest");

  if (plugins.length > 0) {
    console.info(`  pnpm add -D ${plugins.join(" ")}`);
  }

  if (outdated.includes("next@latest")) {
    console.info("  pnpm add -E next@latest && pnpm add -DE eslint-config-next@latest");
  }

  console.info("  pnpm catalog && pnpm test && pnpm lint && pnpm typecheck");
  console.info("");
}

if (problems.length === 0 && outdated.length === 0) {
  console.info(isOffline ? "The catalog matches the installed packages." : "Everything is up to date.");
}
/* eslint-enable no-console */

process.exitCode = problems.length > 0 || outdated.length > 0 ? 1 : 0;
