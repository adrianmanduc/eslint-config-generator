# Eslint Config Generator

A free, open source generator for ESLint flat configs. Pick a stack, add plugins, tune the rules, then copy or download a ready-to-use `eslint.config.mjs` or `eslint.config.ts` together with the install command.

It runs entirely in the browser: no account, no API, no database. Your configuration is kept in your own browser's `localStorage`.

## Contents

- [Features](#features)
- [Supported plugins](#supported-plugins)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [How it works](#how-it-works)
- [Keeping the rule data up to date](#keeping-the-rule-data-up-to-date)
- [Adding a plugin or preset](#adding-a-plugin-or-preset)
- [Project structure](#project-structure)
- [Deploying](#deploying)
- [Conventions](#conventions)
- [Working with AI agents](#working-with-ai-agents)
- [License](#license)

## Features

- **ESLint 9 and 10.** Switching version changes the pinned packages and the core recommended rules, and warns about plugins that do not support the selected version.
- **Presets** for JavaScript, TypeScript, React, Next.js, Next.js + Tailwind, Express and NestJS.
- **18 plugins**, added and removed from a searchable catalog.
- **Shared configs and per-rule control.** Start from a plugin's own configs, then set any rule to off, warn or error and edit its options. Each rule shows what the selected configs already set, so only your changes end up in the output.
- **Correct output by construction.** Type-aware rules add the `projectService` setup, test plugins are scoped to test files, and TypeScript and JSX files are matched explicitly.
- **Copy, download and install command** for npm, pnpm, yarn or bun.
- **JavaScript or TypeScript config file.** `eslint.config.ts` adds `jiti` (which ESLint uses to load it) and any missing type packages, and type-checks under a strict tsconfig.
- **A page per stack** (`/nextjs`, `/nestjs`, …) that opens the generator with that preset.
- **Import an `.eslintrc`.** Paste a legacy JSON config; extends, plugins, environments and rules are mapped onto the generator, and anything that does not map is listed.
- **Shareable links.** The whole setup travels in the link's `#` part, so it is never sent to or stored on a server.
- **A guided tour** on the first visit, which can be restarted from "How to use" in the header.
- Light and dark theme, and a layout that works on a phone.

## Supported plugins

| Category | Plugins |
| --- | --- |
| Core | ESLint core (`@eslint/js`) |
| Languages | `typescript-eslint` |
| Code quality | `eslint-plugin-unicorn` (ESLint 10 only) |
| Frameworks | `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-plugin-jsx-a11y`, `@next/eslint-plugin-next`, `@tanstack/eslint-plugin-query` |
| Backend | `eslint-plugin-n`, `@darraghor/eslint-plugin-nestjs-typed` |
| Testing | `@vitest/eslint-plugin`, `eslint-plugin-jest` |
| Imports and sorting | `eslint-plugin-import-x`, `eslint-plugin-simple-import-sort`, `eslint-plugin-perfectionist` |
| Style | `@stylistic/eslint-plugin`, `eslint-plugin-tailwindcss` |

The source of truth is `src/features/generator/plugins/`.

## Getting started

Requires Node.js 24 or newer and pnpm.

```bash
pnpm install
pnpm dev
```

Open http://localhost:3150. No environment variables are required; optionally copy `.env.example` to `.env.local` to set the public site URL used for metadata.

The component system can be previewed at http://localhost:3150/dev/theme-playground (development only).

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the dev server on port 3150 |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint (formatting included) |
| `pnpm lint:styles` | Stylelint for CSS |
| `pnpm typecheck` | Generate route types and run `tsc` |
| `pnpm test` | Run the Vitest suite once |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm catalog` | Regenerate the rule catalog from the installed ESLint plugins |
| `pnpm check:updates` | Report outdated plugins and a stale catalog |

## How it works

Everything lives in `src/features/generator/`:

- **Plugin definitions** (`plugins/`) are plain data: the package, its import name, its shared configs and how they are referenced.
- **The rule catalog** (`catalog/`) is generated. `pnpm catalog` imports each plugin package, which is installed as a devDependency for this purpose, and records every rule and what each shared config sets. Nothing in it is written by hand.
- **The output** (`generate-config.ts`) turns the editor state into `eslint.config.mjs` (or `.ts`) and the list of packages to install.
- **Tests** load every preset, and every plugin with and without its shared configs, in the real ESLint.

The full description is in [docs/generator.md](docs/generator.md).

## Keeping the rule data up to date

The catalog is only as current as the installed plugin packages.

```bash
pnpm check:updates
```

This compares, for every plugin, the installed version, the version the catalog was generated from, and the latest release on npm. It also reports a plugin whose newest release adds or drops support for an ESLint major, and a new ESLint major the generator does not offer yet. It exits with 1 when something needs attention and prints the commands to run, which come down to:

```bash
pnpm add -D <package>@latest
pnpm catalog
pnpm test
```

Review the catalog diff before committing: it shows exactly which rules and shared configs changed. A test fails if a plugin is upgraded without regenerating the catalog, so the two cannot drift apart unnoticed.

With Claude Code, the `check-updates` skill in `.claude/skills/` runs this whole routine, including the review.

## Adding a plugin or preset

A plugin is one definition file, two registry lines, one description string and a catalog regeneration. A preset is one entry in `presets.ts` plus its name and description. The steps, and the tests that catch a missed one, are in [docs/generator.md](docs/generator.md#adding-a-plugin).

## Project structure

```text
src/
  app/                   Routes (thin files): the generator at /, dev-only pages
  components/            UI primitives (ui/), shared widgets (common/), layout
  features/generator/    The product
    plugins/             Plugin definitions and the registry
    catalog/             Generated rule metadata and its loaders
    components/          Editor UI: toolbar, sidebar, plugin panel, rules, output
    presets.ts           Stack presets
    state.ts             State, reducer, storage parsing
    generate-config.ts   State to eslint.config.mjs
  i18n/                  Message registry and next-intl config
  lib/                   http, logger, storage, theme
  styles/                Tailwind entry and design tokens
messages/en/             All user-facing copy, one file per namespace
scripts/                 Catalog generation and the update check
docs/generator.md        Generator architecture
docs/agent-rules/        Conventions for humans and AI agents
.claude/skills/          Project skills for Claude Code
```

Built with Next.js (App Router, React Compiler), strict TypeScript, Tailwind CSS v4 with semantic tokens, shadcn components on Base UI, TanStack Query, zod and next-intl. Tooling: ESLint with [`@agm-stack/eslint-config-next`](https://github.com/agm-stack/eslint-config-next), Stylelint, Vitest, Husky, lint-staged and commitlint.

## Deploying

The app is fully static and deploys to Vercel as is. The sitemap, robots.txt and Open Graph metadata use the project's production domain from Vercel; set `NEXT_PUBLIC_SITE_URL` to override it.

Page views are counted with [Vercel Web Analytics](https://vercel.com/docs/analytics), which uses no cookies. Turn it on under the project's Analytics tab in Vercel; outside Vercel the script does nothing.

## Conventions

- User-facing copy lives in `messages/en/*.json`, never hard-coded in components.
- Colors come from the semantic tokens in `src/styles/tokens.css`, so both themes keep working.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/); a commit hook checks them.
- Before opening a pull request, run `pnpm lint`, `pnpm typecheck` and `pnpm test`. The CI workflow (`.github/workflows/ci.yml`) runs these plus `pnpm lint:styles` and `pnpm build` on every pull request and push to `main`.

## Working with AI agents

- [AGENTS.md](AGENTS.md) is the baseline for any coding agent; `CLAUDE.md` imports it.
- `docs/agent-rules/` holds the detailed conventions, and `.cursor/rules/` points Cursor at them.
- `.claude/skills/check-updates/` is a Claude Code skill for keeping the plugin data current.

## License

[MIT](LICENSE)

The logo was made with [logokit.dev](https://www.logokit.dev/) from the "hexagon-filled" icon of [Tabler Icons](https://tabler.io/icons) (MIT) and the [Space Mono](https://github.com/googlefonts/spacemono) font (SIL Open Font License 1.1). Its files are `src/assets/brand/`, `src/app/icon.svg`, `src/app/apple-icon.png`, `src/app/opengraph-image.png` and `public/icon-512.png`.

---

Made by [Adrian Manduc](https://adrianmanduc.com). Scaffolded with [`@agm-stack/create-next-stack`](https://github.com/agm-stack/create-next-stack).
