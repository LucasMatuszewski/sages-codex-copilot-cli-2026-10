# Real-browser E2E acceptance

Run the suite from `app/` with the locked dependencies and an installed Google Chrome:

```sh
pnpm test:e2e
```

The suite launches the actual `pnpm dev` stack on leased loopback ports `3001` and `4200`. Each test receives a private temporary SQLite database. The fixture refuses to start if either port is occupied and cleans up only its own process group and temporary directory. Controlled API shutdown proves the listener's `/proc` parent chain reaches the owned runtime process and confirms captured descendants exit. No browser requests are intercepted, findings are written only through the real intake API, and the default `.data/cra.sqlite` database is not used.

The foundation tests cover the root redirect to the Polish register, the unknown-route return path, direct and proxied API health, private SQLite migration/reopen, parent SIGINT shutdown, owned API-child shutdown, and invalid-database-parent startup failure. The register tests run at `1440x1000` and `1024x768`. Each viewport seeds two vulnerabilities and three events through `POST /api/v1/findings`, then verifies the real register query response and rendered rows for identity, title, component, event and shared-tag searches. They also cover no results, clear, URL query restoration after reload and browser back, same-query resubmission, and that typing alone does not request results.

Register query responses are checked against `RegisterQueryResultSchema`; intake requests and responses use the shared schemas. Read-only SQLite snapshots verify the exact seeded rows remain unchanged after browser searches, shutdown and a migration reopen that applies zero migrations. Seed receipts, raw query results and SQLite snapshots are written under ignored `app/artifacts/F03/<run-id>/<viewport>/`; screenshots are under `app/artifacts/screenshots/F03/<run-id>/<viewport>/`. Playwright result bundles and per-runtime logs remain under `app/artifacts/Q01/`; the Q01 verification report is retained unchanged.

These E2E checks accept the read-only table and text-search scope of F03. They do not confirm the loading, error or retry states; those states remain in F03 scope for the separate manual-browser QA step. Filters, Kanban, row detail navigation, manual entry and report-preparation workflows are outside this suite's acceptance scope.
