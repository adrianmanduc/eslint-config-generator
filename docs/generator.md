# Generator

The product is a single page (`/`) that builds an `eslint.config.mjs` (or `eslint.config.ts`) for
ESLint 9 or 10. It runs entirely in the browser: no API route, no database and
no account. The only persistence is the visitor's own `localStorage`.

Everything lives in `src/features/generator/`.

## How it fits together

```text
plugins/<id>.ts        One plugin definition each (plain data)
plugins/index.ts       The registry; its order is the order in the output
catalog/*.json         Generated rule metadata, one lazy chunk per plugin
catalog/index.ts       Lazy loaders and the manifest (versions, peer ranges)
presets.ts             Starting points for popular stacks
state.ts               State shape, reducer, preset application, storage parsing
rules.ts               What the selected shared configs set for each rule
generate-config.ts     State to eslint.config.mjs and the package list
semver.ts              Does a plugin's peer range accept the chosen ESLint major
tour.ts                The guided tour: its steps and open/closed state
share.ts               Encodes and decodes the state for shareable links
import-eslintrc.ts     Maps a legacy .eslintrc (JSON) onto a generator state
components/about.tsx   Server-rendered how-it-works, plugin list and FAQ below
                       the generator: the text search engines see, since the
                       generator itself only renders in the browser
components/            The UI: toolbar, sidebar, plugin panel, rule list, output
```

- **State** (`GeneratorState`) holds the ESLint major, package manager, globals,
  ignores, the enabled plugins with their selected shared configs and options,
  and the user's rule overrides keyed by full rule id.
- **Rule overrides are minimal.** A rule is stored only when it differs from
  what the selected shared configs already set, so the output stays short.
- **Shared configs come first, overrides second.** `resolveBaseRules` replays
  the selected configs in registry order, which is why the UI can show that
  typescript-eslint turned a core rule off.
- **Type-aware setup is automatic.** A type-checked config, or any enabled rule
  whose catalog entry says `typed`, adds `parserOptions.projectService`.
- **Some plugins are scoped.** A plugin with `files` (the test runners) is
  emitted as one block whose shared configs sit in `extends`, so they only
  apply to those files.
- **File matching is explicit.** ESLint only lints `.js`, `.mjs` and `.cjs` by
  default, so plugins declare `fileTypes` and the output starts with a `files`
  entry covering them.

## The guided tour

A five-step tour opens on a visitor's first visit and can be restarted from
the "How to use" button in the header. Whether it has been seen is stored in
`localStorage` (`generatorTour.v1`).

A step points at the element marked `data-tour="<target>"`; the tour
highlights it and scrolls it into view, while the tour card itself stays in a
corner of the screen. Two elements may share a target and the visible one is
used: on small screens the output step points at the Configure / Your config
switch, because the output panel is hidden behind it.

To change the tour, edit `TOUR_STEPS` in `tour.ts`, the copy under `tour` in
`messages/en/generator.json`, and the `data-tour` attributes. When a tour
target is renamed or removed in the UI, update the step that points at it.

## TypeScript config files

`state.configFormat` is `mjs` or `ts`; states saved before it existed default to
`mjs` in `parseStoredState`. The code is the same either way, with two
TypeScript-only additions so the file type-checks under a strict tsconfig (Next.js
and others type-check it during the build):

- `jiti` is added to the install command, because ESLint loads a TypeScript
  config through it, and so is a plugin's `typesPackage` when the package ships
  no types (`@types/eslint-plugin-jsx-a11y`).
- A config marked `typesMismatch` (Tailwind CSS) is written as
  `... as Linter.Config`, because the plugin's published types do not match
  ESLint's.

`generated-config.eslint.test.ts` loads a TypeScript config in ESLint and runs
`tsc` over every preset's `eslint.config.ts`. When a new plugin fails that
check, set `typesPackage` or `typesMismatch` on its definition.

## Shareable links

The Share button copies a link of the form `/#config=<payload>`. The payload is
`{ v: 1, s: GeneratorState }` as JSON, compressed with the browser's
`CompressionStream("deflate-raw")` and encoded as base64url. Because it is in
the hash, the config never reaches the server or the analytics.

`components/starting-config.tsx` reads the hash on load (and on `hashchange`),
removes it from the URL, and validates the state with `parseStoredState`, so a
link from an older registry loses only what no longer exists. An untouched
editor takes the shared config at once; otherwise the visitor confirms before
their setup is replaced. A link that cannot be read shows an error toast.

Links outlive releases. When the state shape changes in a way
`parseStoredState` cannot repair, bump `SHARE_VERSION` in `share.ts` (and keep
reading the old version if possible).

## Preset pages

Every preset has a static page at `/<slug>` (`src/app/[preset]/page.tsx`,
slugs in `presets.ts`) with its own title, description, heading and canonical
URL from `presets.pages` in `messages/en/generator.json`. The pages are in the
sitemap and linked from the "ESLint configs by stack" column in the footer
(`components/footer-stacks.tsx`), so every page links to all of them.

On a preset page `components/starting-config.tsx` starts the editor from that
preset: at once when the visitor has nothing of their own (an untouched preset
or a blank config), otherwise after a confirmation. A share link in the URL
wins over the page's preset.

## Importing an .eslintrc

`import-eslintrc.ts` reads JSON (comments and trailing commas allowed, or a
package.json with `eslintConfig`). It maps `extends` (`eslint:recommended`,
`plugin:<name>/<config>`, `next/core-web-vitals`, …), `plugins`, `env`
(browser and node), `ignorePatterns` and `rules`. Legacy names are translated in
`LEGACY_PLUGIN_NAMES` and `RULE_PREFIX_RENAMES` (`import/` becomes `import-x/`,
`node/` becomes `n/`). The dialog loads the catalogs first, so rules the
installed plugins no longer have are skipped. Everything skipped, and the
number of `overrides` blocks, is shown to the visitor. When you add a plugin,
add its legacy name to `LEGACY_PLUGIN_NAMES`.

## The rule catalog

Rule names, descriptions, docs links and the contents of every shared config
are not written by hand. `pnpm catalog` runs
`scripts/generate-rule-catalog.mjs`, which imports each plugin package (they
are devDependencies for this purpose) and writes `catalog/<id>.json` plus
`catalog/manifest.json`.

Run it after adding a plugin or upgrading a plugin package, and commit the
result.

ESLint core has one catalog per major. Both use the rule metadata of the
installed ESLint (9 and 10 ship the same rules); the recommended config comes
from `@eslint/js` for 9 and from the `eslint-js-v10` alias for 10. A second
ESLint is deliberately not installed, because its `eslint` binary would shadow
the one this repository lints with.

## Keeping it up to date

`pnpm check:updates` (`scripts/check-updates.mjs`) prints, for every plugin,
the installed version, the version the catalog was generated from and the
latest release on npm. It flags a release that changes which ESLint majors a
plugin supports and a new ESLint major the generator does not offer, and it
exits with 1 when something needs attention. `--offline` skips the registry
and only checks the catalog against the installed packages.

After upgrading a package, run `pnpm catalog` and review the catalog diff:
it shows which rules and shared configs changed. `registry.test.ts` fails
when a plugin was upgraded without regenerating.

## Adding a plugin

1. Install the package: `pnpm add -D <package>`.
2. Add `plugins/<id>.ts` with a `PluginDefinition` (copy a similar one). The
   fields are documented on the type in `types.ts`. Accessors are property
   paths on the default import, for example `["configs", "flat", "recommended"]`.
3. Register it in `plugins/index.ts` (position decides output order) and add
   its loader to `catalog/index.ts`.
4. Add its description under `plugins.descriptions` in
   `messages/en/generator.json`.
5. Add it to the plugin table in `README.md`.
6. Run `pnpm catalog`, then `pnpm test`.

The tests catch a missed step: `registry.test.ts` checks the catalog, the
loader and the copy, and `generated-config.eslint.test.ts` loads a config that
uses the plugin, with and without its shared configs, in the real ESLint.
A plugin that does not support the ESLint this repository runs (Unicorn needs
ESLint 10) is skipped there, so its output is not exercised by the tests.

To remove a plugin, delete its definition, registry entry, loader, catalog
file and description, and uninstall the package. Stored states that reference
it are cleaned up by `parseStoredState`.

## Adding a preset

Add an entry to `presets` in `presets.ts` and its name and description under
`presets.items` in `messages/en/generator.json`. A preset lists plugins (with
optional config and option overrides), globals, ignores and rule overrides.
`registry.test.ts` verifies that everything it references exists, and
`generated-config.eslint.test.ts` loads it in ESLint.

The page copy under `about` in `messages/en/generator.json` names the presets
and what the Next.js + Tailwind preset contains; update it when presets change.
The plugin list below the generator is built from the registry, so a new
plugin appears there on its own.

## Known limits

- Rule options are edited as a JSON array; there is no form generated from the
  rule's schema.
- When a factory config is customized (for example Stylistic `customize`), the
  options it produces are not known to the catalog, so rule rows show only the
  inherited severity.
- A plugin whose peer range does not include the selected ESLint major is
  still offered, with a warning. The generator does not pin plugin versions.
