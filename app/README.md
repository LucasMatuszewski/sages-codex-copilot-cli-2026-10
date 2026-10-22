# CRA vulnerability register

The application is built in small, reviewed increments. The current frontend is a Polish-language Angular and Ionic PoC shell with a truthful start screen and a not-found route; the business routes and API are not implemented yet.

## Prerequisites

- Node.js 24.x, version 24.15.0 or later. The verified environment uses Node.js 24.21.0.
- pnpm 12.14.0 is pinned in `package.json`. Running `pnpm` in this directory selects the project version.
- Native modules must be buildable for the local Node.js runtime. B01 allowed reviewed scripts for `better-sqlite3`, `esbuild`, `@parcel/watcher`, `lmdb`, and `msgpackr-extract`.

## Commands

Run from this directory:

```sh
pnpm install --frozen-lockfile
pnpm dev:web
pnpm test:unit
pnpm test:integration
pnpm typecheck
pnpm build
```

`pnpm dev:web` serves the frontend on `http://127.0.0.1:4200`. Frontend unit tests run with Angular's Vitest builder and jsdom. `pnpm test:unit` includes both server/shared Vitest tests and frontend component tests. Integration tests use isolated processes for native SQLite and synthetic local data. `pnpm typecheck` checks server and browser TypeScript with separate configurations. `pnpm build` typechecks the server and builds the web application.

Persistent manual browser evidence is stored in [artifacts/screenshots/F01/](artifacts/screenshots/F01/). Run-specific logs and the generated Angular cache stay under ignored `artifacts/`.

## Frontend foundation

The shell contains one genuine navigation link, **Start**. `/` renders the start page; all other paths, including `/folder/Inbox` and `/register`, render the not-found page. The Sygnity logo and favicon are copies of the repository's selected local assets in `web/src/assets/brand/`. They are retained for this internal PoC; this does not state any redistribution rights. The shell adapts the Angular standalone base and official Ionic sidemenu structure from the pinned starter commit documented in `web/THIRD-PARTY-NOTICES.md`.

The design uses a light-only palette. Dark text (`#003D52`) carries labels on the cyan accent because white text on cyan does not provide sufficient normal-text contrast; cyan is used as a decorative accent. Keyboard focus uses a 3px `#003D52` outline with offset on white and cyan surfaces. Montserrat is named in the CSS, but no local text-font files were supplied, so browsers use their available sans-serif fallback. No fonts or other runtime assets are downloaded externally. No business records or API calls are displayed.

## Persistence foundation

The persistence adapter stores findings in a file-backed SQLite database. From this directory, `pnpm db:migrate` creates the configured database directory, applies pending migrations, and prints a one-line JSON receipt. Set `DATABASE_PATH` to choose a database file; relative paths resolve from this directory. When unset, the path is `.data/cra.sqlite` under this directory. Empty paths and `:memory:` are rejected. Keep local database files out of source control.

## Focused tests

To select a frontend spec, pass its path relative to the application workspace to the Angular builder:

```sh
pnpm exec ng test web --watch=false --include web/src/app/shell/home.page.spec.ts
```

The server Vitest project is separate; do not pass server paths to Angular's test builder. For a focused server unit or integration test, invoke Vitest directly:

```sh
pnpm exec vitest run --project unit server/test-support/isolated-directory.spec.ts
pnpm exec vitest run --project integration server/test-support/sqlite-smoke.integration.spec.ts
```
