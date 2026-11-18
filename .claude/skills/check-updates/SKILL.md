---
name: check-updates
description: Check whether the ESLint config generator is up to date (plugin package versions, the generated rule catalog, ESLint major support, Next.js and security advisories) and, when asked, apply the updates safely. Use when the user asks if everything is current, wants to update or upgrade plugins or dependencies, or before a release.
---

# Check that the generator is up to date

The generator's value is accurate rule data. That data is generated from the
plugin packages installed as devDependencies, so "up to date" means three
things agree: the latest release on npm, the installed package, and the
catalog in `src/features/generator/catalog/`.

Background: `docs/generator.md`.

## 1. Report first

Run the report and show the user the result before changing anything:

```bash
pnpm check:updates
```

It prints one row per package (installed, catalog, latest) and exits with 1
when something needs attention. Read the status column:

- `update available`: a newer release exists.
- `catalog is stale`: a package was upgraded without `pnpm catalog`.
- `latest adds/DROPS ESLint N support`: the plugin's peer range changes. This
  changes what the generator tells users, so call it out explicitly.
- A line under "Needs attention" about a new ESLint major: see step 4.

Also run `pnpm audit` and summarize any advisory, separating runtime
dependencies (`pnpm audit --prod`) from dev tooling.

Without network access, `pnpm check:updates --offline` still verifies that the
catalog matches the installed packages.

Stop here and report unless the user asked you to apply the updates.

## 2. Apply plugin updates

Use the command the report prints. It looks like:

```bash
pnpm add -D <package>@latest ...
pnpm catalog
```

Notes:

- `eslint-js-v10` is an alias for `@eslint/js` 10; update it as
  `eslint-js-v10@npm:@eslint/js@latest`.
- `eslint` and `@eslint/js` stay on `^9`: this repository lints with ESLint 9.
  Never install a second `eslint` package; its binary shadows the one the repo
  uses. See the comment in `scripts/generate-rule-catalog.mjs`.
- pnpm may refuse a release that is only a few days old (minimum release age).
  Report that and leave the package on the previous version; do not add an
  exclusion without being asked.
- `next` and `eslint-config-next` are pinned to exact versions and updated
  together: `pnpm add -E next@latest && pnpm add -DE eslint-config-next@latest`.

## 3. Review what changed

`pnpm catalog` rewrites the JSON catalogs. Review the diff, do not just commit
it:

```bash
git diff --stat src/features/generator/catalog
```

Look for, and tell the user about:

- **Removed or renamed rules.** A preset in `presets.ts` that references one
  fails `registry.test.ts`; fix the preset.
- **Changed shared configs.** A config id that disappeared makes
  `pnpm catalog` throw; update the plugin definition's `configs`.
- **Changed peer range** in `catalog/manifest.json`. If a plugin now supports
  or no longer supports an ESLint major, update any copy that states it (for
  example the Unicorn description in `messages/en/generator.json`).
- **A plugin that changed how it is configured** (new import shape, new flat
  config accessor). `generated-config.eslint.test.ts` loads every plugin in
  the real ESLint and catches this.

## 4. A new ESLint major

When the report says a new ESLint major is out, do not add it silently. Tell
the user and, if they want it:

1. Add the major to `ESLINT_MAJORS` in `src/features/generator/types.ts`.
2. Install its `@eslint/js` under an alias and add it to `CORE_JS_PACKAGES` in
   `scripts/generate-rule-catalog.mjs` and to the loader in
   `catalog/index.ts`.
3. Run `pnpm catalog` and check each plugin's peer range against the new
   major.
4. Decide with the user whether to drop the oldest major.

## 5. Verify

Every update ends with all of these passing:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Then run `pnpm check:updates` again and confirm it reports everything up to
date (or explain what is intentionally left behind).

## 6. Report

Summarize: which packages moved from which version to which, rule counts that
changed, any peer-range or config changes users will notice, what was left
behind and why, and the check results. Do not commit unless asked; the commit
message follows Conventional Commits, for example
`chore(catalog): update plugin rule data`.
