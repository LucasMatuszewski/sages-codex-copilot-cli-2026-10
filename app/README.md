# CRA vulnerability register

The application checkout is being built incrementally. This B01 foundation currently provides a pinned dependency set, server/shared TypeScript checking, a unit-test harness, and a native SQLite integration smoke test. No business API or browser application is available yet.

## Prerequisites

- Node.js 24.x, version 24.15.0 or later. The verified environment used Node.js 24.21.0.
- pnpm 12.14.0 is pinned in `package.json`. With pnpm's project shim enabled, invoking `pnpm` in this directory downloads/runs the declared version; the verified global pnpm was 11.2.2.
- Native modules must be buildable for the local Node.js runtime. B01 explicitly allows reviewed scripts for `better-sqlite3`, `esbuild`, `@parcel/watcher`, `lmdb`, and `msgpackr-extract`.

## Available commands

Run from this directory:

```sh
pnpm install --frozen-lockfile
pnpm test:unit
pnpm test:integration
pnpm typecheck
```

Unit tests cover server/shared `.spec.ts` files. Integration tests cover `server/**/*.integration.spec.ts` and use isolated processes for native SQLite. The SQLite smoke test uses only a synthetic table and a temporary database under the operating system temp directory. These scripts do not start an application server or browser.

## Focused test files

The `test:unit` and `test:integration` scripts run their entire Vitest projects. A multi-file check with the pinned pnpm 12.14.0 and Vitest 5.0.5 toolchain showed that `pnpm test:unit -- <file>` does not filter to that file. Use direct Vitest invocation to select one spec:

```sh
pnpm exec vitest run --project unit server/test-support/isolated-directory.spec.ts
pnpm exec vitest run --project integration server/test-support/sqlite-smoke.integration.spec.ts
```
