import type { PluginDefinition } from "../types";

export const nestjs = {
  id: "nestjs",
  name: "NestJS Typed",
  packageName: "@darraghor/eslint-plugin-nestjs-typed",
  importName: "nestjsTyped",
  namespace: "@darraghor/nestjs-typed",
  category: "backend",
  docsUrl: "https://github.com/darraghoriordan/eslint-plugin-nestjs-typed#rules",
  pluginAccessor: ["plugin"],
  configs: [
    { id: "recommended", accessor: ["configs", "flatRecommended"], typeChecked: true },
    { id: "no-swagger", accessor: ["configs", "flatNoSwagger"], addon: true },
  ],
  defaultConfigs: ["recommended"],
} as const satisfies PluginDefinition;
