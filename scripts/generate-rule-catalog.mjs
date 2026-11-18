/**
 * Builds the rule catalog in src/features/generator/catalog/ from the plugin
 * packages installed as devDependencies. Run with `pnpm catalog` after adding a
 * plugin definition or upgrading a plugin package.
 *
 * The plugin definitions are TypeScript; Node strips the types on import.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const rootDirectory = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pluginsDirectory = path.join(rootDirectory, "src/features/generator/plugins");
const catalogDirectory = path.join(rootDirectory, "src/features/generator/catalog");

/**
 * ESLint core is cataloged once per supported major. The rule metadata comes
 * from the installed ESLint (9 and 10 ship the same rules); what differs per
 * major is the recommended config, read from that major's @eslint/js. A second
 * ESLint is not installed on purpose: its `eslint` binary would shadow the
 * one this repository lints with.
 */
const CORE_JS_PACKAGES = {
  9: "@eslint/js",
  10: "eslint-js-v10",
};

const SEVERITY_NAMES = ["off", "warn", "error"];

async function loadDefinitions() {
  const files = readdirSync(pluginsDirectory).filter((file) => file.endsWith(".ts") && file !== "index.ts" && !file.endsWith(".test.ts"));
  const definitions = [];

  for (const file of files) {
    const definitionModule = await import(pathToFileURL(path.join(pluginsDirectory, file)).href);

    definitions.push(...Object.values(definitionModule).filter((value) => value && typeof value === "object" && "packageName" in value));
  }

  return definitions.sort((a, b) => a.id.localeCompare(b.id));
}

function resolvePath(target, accessor) {
  return accessor.reduce((value, key) => value?.[key], target);
}

function normalizeSeverity(severity) {
  const name = typeof severity === "number" ? SEVERITY_NAMES[severity] : severity;

  if (!SEVERITY_NAMES.includes(name)) {
    throw new Error(`Unknown severity: ${JSON.stringify(severity)}`);
  }

  return name;
}

function normalizeEntry(entry) {
  if (!Array.isArray(entry)) {
    return normalizeSeverity(entry);
  }

  const [severity, ...options] = entry;

  return options.length > 0 ? [normalizeSeverity(severity), ...options] : normalizeSeverity(severity);
}

function hasOptions(schema) {
  if (Array.isArray(schema)) {
    return schema.length > 0;
  }

  return Boolean(schema) && typeof schema === "object" && Object.keys(schema).length > 0;
}

function toRuleMeta(name, rule) {
  const meta = (typeof rule === "object" && rule.meta) || {};
  const docs = meta.docs ?? {};

  return {
    name,
    description: typeof docs.description === "string" ? docs.description.trim() : "",
    url: typeof docs.url === "string" ? docs.url : "",
    type: meta.type ?? null,
    fixable: Boolean(meta.fixable),
    deprecated: Boolean(meta.deprecated),
    typed: Boolean(docs.requiresTypeChecking),
    hasOptions: hasOptions(meta.schema),
  };
}

function toRules(rules) {
  const entries = rules instanceof Map ? [...rules.entries()] : Object.entries(rules);

  return entries.map(([name, rule]) => toRuleMeta(name, rule)).sort((a, b) => a.name.localeCompare(b.name));
}

/** Merges the rules of a flat config (an object or a nested array of objects). */
function toConfigRules(config, label) {
  if (!config) {
    throw new Error(`Config not found: ${label}`);
  }

  const rules = {};

  for (const entry of [config].flat(Infinity)) {
    for (const [ruleId, value] of Object.entries(entry.rules ?? {})) {
      rules[ruleId] = normalizeEntry(value);
    }
  }

  return Object.fromEntries(Object.entries(rules).sort(([a], [b]) => a.localeCompare(b)));
}

function readPackageJson(packageName, resolver = require) {
  let directory = path.dirname(resolver.resolve(packageName));

  // Walk up from the entry file to the package root.
  for (;;) {
    try {
      const packageJson = JSON.parse(readFileSync(path.join(directory, "package.json"), "utf8"));

      if (packageJson.name && packageJson.version) {
        return packageJson;
      }
    } catch {
      // Keep walking.
    }

    const parent = path.dirname(directory);

    if (parent === directory) {
      throw new Error(`package.json not found for ${packageName}`);
    }

    directory = parent;
  }
}

function buildCoreCatalog(definition, major) {
  const eslintRequire = createRequire(require.resolve("eslint/package.json"));
  const { builtinRules } = eslintRequire("./lib/unsupported-api.js");
  const jsPackage = CORE_JS_PACKAGES[major];
  const js = require(jsPackage);

  return {
    packageName: definition.packageName,
    version: require(`${jsPackage}/package.json`).version,
    rules: toRules(builtinRules),
    configs: Object.fromEntries(
      definition.configs.map((config) => [config.id, toConfigRules(resolvePath(js, config.accessor), `core ${config.id}`)]),
    ),
  };
}

async function buildPluginCatalog(definition) {
  const pluginModule = await import(definition.packageName);
  const entry = pluginModule.default ?? pluginModule;
  const plugin = resolvePath(entry, definition.pluginAccessor ?? []);

  if (!plugin?.rules) {
    throw new Error(`${definition.id}: no rules found on the plugin object`);
  }

  const catalog = {
    packageName: definition.packageName,
    version: readPackageJson(definition.packageName).version,
    rules: toRules(plugin.rules),
    configs: {},
  };

  for (const config of definition.configs) {
    const value = resolvePath(entry, config.accessor);

    catalog.configs[config.id] = toConfigRules(value, `${definition.id} ${config.id}`);

    const registersPlugin = [value].flat(Infinity).some((item) => item.plugins && definition.namespace in item.plugins);

    if (!registersPlugin && !config.addon) {
      throw new Error(`${definition.id}: config "${config.id}" does not register the "${definition.namespace}" plugin`);
    }
  }

  if (definition.baseAccessor && !resolvePath(entry, definition.baseAccessor)) {
    throw new Error(`${definition.id}: base config not found`);
  }

  if (definition.options?.target.kind === "factory" && typeof resolvePath(entry, definition.options.target.accessor) !== "function") {
    throw new Error(`${definition.id}: options factory not found`);
  }

  return catalog;
}

/** One rule per line keeps catalog diffs readable without bloating the files. */
function serializeCatalog(catalog) {
  const rules = catalog.rules.map((rule) => `    ${JSON.stringify(rule)}`).join(",\n");
  const configs = Object.entries(catalog.configs)
    .map(([id, entries]) => {
      const lines = Object.entries(entries).map(([ruleId, entry]) => `      ${JSON.stringify(ruleId)}: ${JSON.stringify(entry)}`);

      return `    ${JSON.stringify(id)}: {\n${lines.join(",\n")}\n    }`;
    })
    .join(",\n");

  return [
    "{",
    `  "packageName": ${JSON.stringify(catalog.packageName)},`,
    `  "version": ${JSON.stringify(catalog.version)},`,
    `  "rules": [\n${rules}\n  ],`,
    `  "configs": {\n${configs}\n  }`,
    "}",
    "",
  ].join("\n");
}

function writeCatalog(fileName, catalog) {
  writeFileSync(path.join(catalogDirectory, fileName), serializeCatalog(catalog));
  // eslint-disable-next-line no-console -- CLI progress output
  console.info(`${fileName}: ${catalog.rules.length} rules, ${Object.keys(catalog.configs).length} configs (${catalog.version})`);
}

const definitions = await loadDefinitions();
const manifest = {};

mkdirSync(catalogDirectory, { recursive: true });

for (const definition of definitions) {
  if (definition.id === "core") {
    for (const major of Object.keys(CORE_JS_PACKAGES)) {
      const catalog = buildCoreCatalog(definition, major);

      writeCatalog(`core.eslint${major}.json`, catalog);
      manifest.core = { version: catalog.version, eslintPeerRange: null, ruleCount: catalog.rules.length };
    }

    continue;
  }

  const catalog = await buildPluginCatalog(definition);
  const packageJson = readPackageJson(definition.packageName);

  writeCatalog(`${definition.id}.json`, catalog);
  manifest[definition.id] = {
    version: catalog.version,
    eslintPeerRange: packageJson.peerDependencies?.eslint ?? null,
    ruleCount: catalog.rules.length,
  };
}

writeFileSync(path.join(catalogDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
// eslint-disable-next-line no-console -- CLI progress output
console.info(`manifest.json: ${Object.keys(manifest).length} plugins`);
