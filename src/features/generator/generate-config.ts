import { getRulePluginId, pluginDefinitions } from "./plugins";
import { getChangedOptions, toRuleEntry } from "./rules";

import type { CatalogMap } from "./rules";
import type {
  Accessor, ConfigFormat, GeneratorState, PackageManager,
} from "./types";

export function getConfigFileName(configFormat: ConfigFormat) {
  return `eslint.config.${configFormat}`;
}

const MAX_LINE_LENGTH = 100;
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const JAVASCRIPT_FILES = "**/*.{js,mjs,cjs,jsx}";
const JAVASCRIPT_EXTENSIONS = ["js", "mjs", "cjs"];
const TYPESCRIPT_EXTENSIONS = ["ts", "mts", "cts"];

export type GeneratedConfig = {
  /** Contents of `eslint.config.mjs` or `eslint.config.ts`. */
  code: string,
  /** Packages the config imports, in install order. */
  packages: string[]
};

/** A JavaScript expression written to the output as is. */
class Raw {
  constructor(readonly code: string) {}
}

const raw = (code: string) => new Raw(code);

/** Object keys starting with "..." are written as spread elements. */
const isSpreadKey = (key: string) => key.startsWith("...");

const isShorthand = (key: string, value: unknown) => value instanceof Raw && value.code === key;

function formatKey(key: string) {
  return IDENTIFIER.test(key) ? key : JSON.stringify(key);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Raw);
}

function formatInline(value: unknown): string {
  if (value instanceof Raw) {
    return value.code;
  }

  if (Array.isArray(value)) {
    return `[${value.map(formatInline).join(", ")}]`;
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value).map(([key, item]) => (isSpreadKey(key) || isShorthand(key, item) ? key : `${formatKey(key)}: ${formatInline(item)}`));

    return entries.length > 0 ? `{ ${entries.join(", ")} }` : "{}";
  }

  return JSON.stringify(value) ?? "undefined";
}

/**
 * Formats a value as JavaScript source. A value stays on one line when it
 * fits; `expandDepth` forces that many levels of objects onto multiple lines.
 */
function format(value: unknown, indent: number, prefixLength = 0, expandDepth = 0): string {
  const isContainer = Array.isArray(value) || isPlainObject(value);
  const isEmpty = isContainer && Object.keys(value).length === 0;
  const inline = formatInline(value);

  // Only objects are forced open; an array stays on one line whenever it fits.
  const isForcedOpen = expandDepth > 0 && !Array.isArray(value);

  if (!isContainer || isEmpty || (!isForcedOpen && indent + prefixLength + inline.length <= MAX_LINE_LENGTH)) {
    return inline;
  }

  const pad = " ".repeat(indent + 2);
  const closingPad = " ".repeat(indent);

  if (Array.isArray(value)) {
    const items = value.map((item) => `${pad}${format(item, indent + 2)},`);

    return `[\n${items.join("\n")}\n${closingPad}]`;
  }

  const entries = Object.entries(value).map(([key, item]) => {
    if (isSpreadKey(key) || isShorthand(key, item)) {
      return `${pad}${key},`;
    }

    const formattedKey = formatKey(key);

    return `${pad}${formattedKey}: ${format(item, indent + 2, formattedKey.length + 2, expandDepth - 1)},`;
  });

  return `{\n${entries.join("\n")}\n${closingPad}}`;
}

function reference(importName: string, accessor: Accessor = []) {
  return accessor.reduce((code, key) => (IDENTIFIER.test(key) ? `${code}.${key}` : `${code}[${JSON.stringify(key)}]`), importName);
}

function getPluginRules(state: GeneratorState, pluginId: string) {
  return Object.entries(state.rules)
    .filter(([ruleId]) => getRulePluginId(ruleId) === pluginId)
    .sort(([a], [b]) => a.localeCompare(b));
}

/** Extensions beyond the ESLint defaults that the enabled plugins lint. */
function getExtraFileExtensions(state: GeneratorState) {
  const fileTypes = new Set(pluginDefinitions.flatMap((plugin) => (state.plugins[plugin.id] ? plugin.fileTypes ?? [] : [])));
  const hasJsx = fileTypes.has("jsx");
  const hasTypeScript = fileTypes.has("typescript");

  return [
    ...(hasJsx ? ["jsx"] : []),
    ...(hasTypeScript ? TYPESCRIPT_EXTENSIONS : []),
    ...(hasJsx && hasTypeScript ? ["tsx"] : []),
  ];
}

function needsTypeInformation(state: GeneratorState, catalogs: CatalogMap) {
  const hasTypedConfig = pluginDefinitions.some((plugin) => {
    const selected = state.plugins[plugin.id]?.configs ?? [];

    return plugin.configs.some((config) => config.typeChecked && selected.includes(config.id));
  });

  if (hasTypedConfig) {
    return true;
  }

  return Object.entries(state.rules).some(([ruleId, setting]) => {
    const pluginId = getRulePluginId(ruleId);
    const plugin = pluginDefinitions.find((item) => item.id === pluginId);

    if (setting.severity === "off" || !plugin || !state.plugins[pluginId]) {
      return false;
    }

    const ruleName = plugin.namespace ? ruleId.slice(plugin.namespace.length + 1) : ruleId;

    return catalogs[pluginId]?.rules.some((rule) => rule.name === ruleName && rule.typed) ?? false;
  });
}

/**
 * Generates the flat config for a state. `catalogs` is only used to detect
 * individually enabled rules that need type information.
 */
export function generateConfig(state: GeneratorState, catalogs: CatalogMap = {}): GeneratedConfig {
  /** Module specifier to import clause. */
  const imports = new Map<string, string>();
  const packages = [`eslint@^${state.eslintMajor}`];
  let usesLinterType = false;
  /** Config array elements, grouped so each group gets a comment and spacing. */
  const groups: { comment?: string, elements: string[] }[] = [];

  const addPackage = (packageName: string) => {
    if (!packages.includes(packageName)) {
      packages.push(packageName);
    }
  };

  const addImport = (specifier: string, clause: string, packageName = specifier) => {
    imports.set(specifier, clause);
    addPackage(packageName);
  };

  const configImports = ["defineConfig"];
  const ignores = state.ignores.map((pattern) => pattern.trim()).filter(Boolean);
  const setupElements: string[] = [];

  if (ignores.length > 0) {
    configImports.push("globalIgnores");
    setupElements.push(`globalIgnores(${format(ignores, 2, "globalIgnores(".length)})`);
  }

  const fileExtensions = getExtraFileExtensions(state);

  if (fileExtensions.length > 0) {
    // ESLint only lints .js, .mjs and .cjs files unless a config matches more.
    setupElements.push(format({ files: [`**/*.{${[...JAVASCRIPT_EXTENSIONS, ...fileExtensions].join(",")}}`] }, 2));
  }

  if (state.globals.length > 0) {
    addImport("globals", "globals");

    const globals = Object.fromEntries(state.globals.map((environment) => [`...globals.${environment}`, null]));

    setupElements.push(format({ languageOptions: { globals } }, 2, 0, 3));
  }

  if (setupElements.length > 0) {
    groups.push({ elements: setupElements });
  }

  for (const plugin of pluginDefinitions) {
    const pluginState = state.plugins[plugin.id];

    if (!pluginState) {
      continue;
    }

    const importPlugin = () => {
      // ESLint core rules ship with ESLint; @eslint/js only provides the configs.
      const version = plugin.id === "core" ? `@^${state.eslintMajor}` : "";

      imports.set(plugin.packageName, plugin.importName);
      addPackage(`${plugin.packageName}${version}`);

      // A strict tsconfig rejects an untyped import in eslint.config.ts.
      if (state.configFormat === "ts" && plugin.typesPackage) {
        addPackage(plugin.typesPackage);
      }

      return plugin.importName;
    };

    const elements: string[] = [];
    const selectedConfigs = plugin.configs.filter((config) => pluginState.configs.includes(config.id));
    const changedOptions = getChangedOptions(plugin, pluginState);
    const optionsTarget = plugin.options?.target;
    let isRegistered = plugin.namespace === null;

    for (const config of selectedConfigs) {
      const useFactory = optionsTarget?.kind === "factory" && optionsTarget.configId === config.id && Object.keys(changedOptions).length > 0;

      if (useFactory) {
        const call = `${reference(importPlugin(), optionsTarget.accessor)}(`;

        elements.push(`${call}${format(changedOptions, 2, call.length, 1)})`);
      } else {
        const element = reference(importPlugin(), config.accessor);
        const needsCast = state.configFormat === "ts" && config.typesMismatch === true;

        usesLinterType ||= needsCast;
        elements.push(needsCast ? `${element} as Linter.Config` : element);
      }

      config.packages?.forEach(addPackage);
      isRegistered ||= !config.addon;
    }

    if (!isRegistered && plugin.baseAccessor) {
      elements.unshift(reference(importPlugin(), plugin.baseAccessor));
      isRegistered = true;
    }

    const rules = getPluginRules(state, plugin.id);
    const settings: Record<string, unknown> = { ...plugin.settings };

    if (optionsTarget?.kind === "settings") {
      const values = Object.fromEntries(Object.entries(changedOptions).filter(([, value]) => value !== ""));

      if (Object.keys(values).length > 0) {
        settings[optionsTarget.key] = values;
      }
    }

    const block: Record<string, unknown> = {};
    const hasSettings = Object.keys(settings).length > 0 && (elements.length > 0 || rules.length > 0);

    if (!isRegistered && plugin.namespace && rules.length > 0) {
      block.plugins = { [plugin.namespace]: raw(reference(importPlugin(), plugin.pluginAccessor)) };
    }

    if (hasSettings) {
      block.settings = settings;
    }

    if (rules.length > 0) {
      block.rules = Object.fromEntries(rules.map(([ruleId, setting]) => [ruleId, toRuleEntry(setting)]));
    }

    if (plugin.files && (elements.length > 0 || Object.keys(block).length > 0)) {
      // A scoped plugin is one block: its shared configs move into `extends` so `files` applies to them too.
      const scoped = {
        files: [...plugin.files],
        ...(elements.length > 0 ? { extends: elements.map(raw) } : {}),
        ...block,
      };

      groups.push({ comment: plugin.name, elements: [format(scoped, 2, 0, 2)] });
      continue;
    }

    if (Object.keys(block).length > 0) {
      elements.push(format(block, 2, 0, 2));
    }

    if (elements.length > 0) {
      groups.push({ comment: plugin.name, elements });
    }
  }

  if (needsTypeInformation(state, catalogs)) {
    const elements = [
      format({ languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: raw("import.meta.dirname") } } }, 2, 0, 3),
    ];

    if (state.plugins.typescript) {
      // Type-aware rules cannot run on files outside the TypeScript project.
      imports.set("typescript-eslint", "tseslint");
      elements.push(format({ files: [JAVASCRIPT_FILES], extends: [raw("tseslint.configs.disableTypeChecked")] }, 2, 0, 1));
    }

    groups.push({ comment: "Type-aware linting", elements });
  }

  imports.set("eslint/config", `{ ${configImports.join(", ")} }`);

  const importLines = [...imports.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([specifier, clause]) => `import ${clause} from ${JSON.stringify(specifier)};`);

  const body = groups
    .map((group) => {
      const lines = group.elements.map((element) => `  ${element},`);

      return group.comment ? [`  // ${group.comment}`, ...lines].join("\n") : lines.join("\n");
    })
    .join("\n\n");

  const code = [
    ...importLines,
    ...(usesLinterType ? ["import type { Linter } from \"eslint\";"] : []),
    "",
    body ? `export default defineConfig([\n${body}\n]);` : "export default defineConfig([]);",
    "",
  ].join("\n");

  // ESLint loads a TypeScript config through jiti, which projects must install.
  if (state.configFormat === "ts") {
    addPackage("jiti");
  }

  return { code, packages };
}

const INSTALL_COMMANDS: Record<PackageManager, string> = {
  npm: "npm install --save-dev",
  pnpm: "pnpm add --save-dev",
  yarn: "yarn add --dev",
  bun: "bun add --dev",
};

export function getInstallCommand(packageManager: PackageManager, packages: readonly string[]) {
  return `${INSTALL_COMMANDS[packageManager]} ${packages.join(" ")}`;
}
