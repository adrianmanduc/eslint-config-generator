# Eslint Config Generator agent instructions

A browser-only generator for ESLint flat configs (ESLint 9 and 10). Visitors
pick a preset, add plugins, tune rules and copy an `eslint.config.mjs`. There
is no backend: one static page, state in `localStorage`.

Next.js may insert a "This is NOT the Next.js you know" block at the top of
this file when `next dev` runs. Keep it: it points agents at the
version-matched docs in `node_modules/next/dist/docs/`.

## Read selectively

Do not load every document for every prompt:

1. For anything in `src/features/generator/`, read `docs/generator.md` first.
   It explains the plugin registry, the generated catalog, the state and the
   output, and lists the steps for adding a plugin or preset.
2. For code matching a Cursor rule, read the matching guidance under
   `docs/agent-rules/`. Skip unrelated rule documents.

For documentation-only or configuration-only prompts, read only the files that
the change directly affects.

## Where things are

```text
src/features/generator/plugins/      Plugin definitions (plain data) and registry
src/features/generator/catalog/      GENERATED rule metadata; never edit by hand
src/features/generator/presets.ts    Stack presets
src/features/generator/state.ts      State shape, reducer, storage parsing
src/features/generator/generate-config.ts   State to eslint.config.mjs
src/features/generator/import-eslintrc.ts   Legacy .eslintrc (JSON) to state
src/app/[preset]/page.tsx            One static page per preset (/nextjs, …)
src/features/generator/components/   Editor UI
messages/en/generator.json           All generator copy
scripts/generate-rule-catalog.mjs    Builds the catalog (pnpm catalog)
scripts/check-updates.mjs            Reports outdated plugins (pnpm check:updates)
```

## Working rules

- Use the Next.js App Router with strict TypeScript and the `@/*` alias.
- Follow the feature-folder layout in `docs/agent-rules/project-architecture.md`.
- Do only what the prompt asks; do not continue into follow-up work unless
  explicitly asked.
- Make small, reviewable diffs. Do not perform unrelated refactors.
- Do not add dependencies unless the prompt requires them.
- Keep docs in sync: update the relevant doc in the same change when behavior,
  routes or architecture change. `README.md` lists the supported plugins and
  scripts; `docs/generator.md` describes how the generator works.
- Keep application-owned user-facing copy in `messages/`. User-generated
  content is data and is not translated.
- Run the checks the repository supports (`pnpm lint`,
  `pnpm lint:styles`, `pnpm typecheck`, `pnpm test`). Never
  add placeholder scripts for tools that are not installed.
- At completion, summarize changed files and checks, then stop.

## Generator rules

These are the invariants that keep the generated configs correct.

- **The catalog is generated.** Never edit `catalog/*.json` or
  `catalog/manifest.json` by hand. Change a plugin definition or upgrade the
  package, then run `pnpm catalog` and commit the result. A test fails when
  the catalog and the installed package versions disagree.
- **Plugin definitions are plain data** with type-only imports, because
  `scripts/*.mjs` import them directly through Node's type stripping. Do not
  add runtime imports, functions or `@/` aliases to `plugins/<id>.ts`.
- **Verify plugin facts against the package, not from memory.** Config names,
  accessors and peer ranges change between releases. Inspect the installed
  package; `pnpm catalog` throws when an accessor is wrong.
- **Never install a second `eslint` package.** Its binary shadows the one this
  repository lints with. ESLint 10's recommended config comes from the
  `eslint-js-v10` alias instead.
- **Generated output must load in real ESLint.** After changing
  `generate-config.ts`, a plugin definition or a preset, run `pnpm test`:
  `generated-config.eslint.test.ts` loads every preset and plugin in ESLint.
  A plugin that does not support the installed ESLint (Unicorn) is skipped
  there, so say so when its output is unverified. The same test type-checks
  every preset as `eslint.config.ts`.
- **Stored state must keep loading.** Visitors have a saved `GeneratorState`
  in `localStorage`. When its shape changes, update `parseStoredState` so old
  data is repaired or dropped rather than crashing, or bump the storage key.
- **Adding a plugin or preset** follows the checklist in `docs/generator.md`.
  It also needs copy in `messages/en/generator.json` and a row in the README
  plugin table.

## User interface

- Use the semantic color tokens (`bg-card`, `text-muted-foreground`,
  `border-brand`). The brand is deliberately black and white; severity and
  code highlighting carry the color. Check both the light and the dark theme.
- The layout has three modes: below `lg` the editor and the output are two
  views behind a switch; from `lg` they sit side by side; from `xl` the plugin
  list becomes its own column. Check a phone width (375px) for horizontal
  overflow after layout changes.
- The guided tour points at elements marked `data-tour`. When you move,
  rename or remove one of those sections, update `tour.ts` and its copy.
- Interactive controls need an accessible name; icon-only buttons take an
  `aria-label` from messages.

## Copy and internationalization

- New application-owned user-facing copy goes into `messages/en/*.json`
  rather than being hard-coded in JSX/TSX. Each file is one namespace,
  registered in `src/i18n/messages.ts` and in `next.config.ts`.
- Use `getText` (`@/i18n/get-text`, an alias of next-intl's
  `getTranslations`) in async server code and `useText` (`@/hooks/use-text`,
  an alias of `useTranslations`) in components.
- Message arguments are typed: plain placeholders take strings (wrap numbers
  in `String()`), plural placeholders take numbers.
- Plugin names, package names, rule names and rule descriptions are data from
  the packages and are not translated.
- Use the locale-aware `next-intl` formatting helpers for application dates,
  times and numbers.

## No backend

- The product has no API routes, database or accounts. Do not add any without
  an explicit request; state lives in the browser (`localStorage`).
- No environment variable is required to build or run the app.

## Keeping data current

- `pnpm check:updates` reports outdated plugin packages and a stale catalog.
- In Claude Code, the `check-updates` skill (`.claude/skills/check-updates/`)
  walks through reporting, updating, reviewing the catalog diff and verifying.

## Git commits

- Commit messages use Conventional Commits. A commitlint hook rejects others.
- Commit only when asked.

## Cursor and MCP policy

- `AGENTS.md` is the portable repository guidance; `.cursor/rules/*.mdc` are
  small Cursor entry points. Detailed rule guidance lives in
  `docs/agent-rules/` and `docs/generator.md`.
- MCPs are developer tools, not runtime dependencies. MCP configuration must
  use environment interpolation for secrets, never commit tokens or keys,
  prefer project-scoped or read-only access, and require manual approval for
  destructive actions. Never connect production data to an autonomous coding
  workflow.
