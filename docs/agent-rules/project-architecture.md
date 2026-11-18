# Project architecture guidance

- Treat `AGENTS.md` as the portable baseline.
- The project uses the Next.js App Router, `src/`, strict TypeScript, and the
  `@/*` alias. Do not introduce a Pages Router.
- Keep domain logic and external-service boundaries understandable and
  testable. Avoid hiding business behavior inside generic UI primitives.
- There is no backend: no API routes, database or accounts. Features run in
  the browser and keep their state there.

## Source layout

```text
src/app/                 Routes, route groups and metadata routes (thin files)
src/components/ui/       shadcn-derived primitives (application-owned code)
src/components/common/   Providers, error screen, shared app widgets
src/components/layout/   Shared page chrome (footer)
src/features/<feature>/  Product features (see below)
src/lib/                 Infrastructure: http, logger, storage
src/hooks/               Cross-feature hooks
src/i18n/ messages/en/   Message registry and copy
src/utils/               Small pure helpers (routes, brand, styles)
src/types/               Shared types
```

## Feature folders

Each feature owns its UI, data access and logic:

```text
src/features/<feature>/
  api/queries.ts      queryOptions factories (<feature>Queries) and query hooks
  components/         Feature UI
  pages/<name>.tsx    Page components; src/app route files re-export them
  types.ts            Feature types
  <logic>.ts          Pure, client-safe logic, with a colocated *.test.ts
```

- File names are kebab-case. Group hooks by kind in `queries.ts` and
  `mutations.ts` instead of one file per hook.
- A feature may import another feature only along a clear dependency. Infrastructure
  (`src/lib`, `src/components/ui`) never imports from a feature.
- Shared infrastructure belongs in `src/lib`, not in a feature.
- Route files in `src/app` stay thin: pages re-export a component from
  `features/<feature>/pages/`.
