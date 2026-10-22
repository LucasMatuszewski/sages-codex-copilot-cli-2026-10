# Q01 real-browser foundation acceptance

Run from `app/` with the locked dependencies and an installed Google Chrome:

```sh
pnpm test:e2e
```

The suite launches the actual `pnpm dev` stack on the leased loopback ports 3001 and 4200. It refuses to start if either port is occupied, creates one private temporary SQLite file per test, and cleans up only its own detached process group and temporary directory. Controlled API shutdown requires the listener's `/proc` PPID ancestry to reach the runtime PID and confirms all captured descendants exit. It does not mock browser requests, seed findings, or touch the default `.data/cra.sqlite` database.

The five tests cover the current F01 home and wildcard route, direct and proxied API health, migration idempotence and an empty schema, parent SIGINT shutdown, controlled API-child shutdown, and startup failure for a database path whose parent is an owned regular file. Screenshots use a fresh `app/artifacts/screenshots/Q01/<run-id>/` folder; Playwright results, traces, and runtime logs live under `app/artifacts/Q01/`.

These checks establish the current Q01 harness and F01 foundation only. The root/register behavior is expected to change with F03; no business workflow is accepted by this suite.
