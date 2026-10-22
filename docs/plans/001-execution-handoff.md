# CRA PoC execution handoff

**Status: paused (22 October 2026).** The human asked to finish B02, pause the CRA work, and move the project to a native WSL checkout. B02 is complete; do not start F01 or B03 and do not infer that the paused goal has resumed. The foundation phase is unfinished: there is no frontend, API server, or browser preview yet.

## Source of truth and delivered state

Use the [canonical implementation plan, F01 card](000-implementation-plan.md#task-f01), [PRD](../PRD.md), [ADR-000](../ADR/000-main-architecture.md), [ADR-001](../ADR/001-api-and-persistence.md), [ADR-002](../ADR/002-frontend-and-starter.md), and [design guidelines](../design-guidelines.md) as the requirements and architecture sources. This handoff records delivery and migration evidence; it does not restate functional requirements.

The delivered branch is `codex/cra-poc-implementation`. Reviewed commits are B01 `e6c254cdc3df171d565d8a0d2f481be746e3f038`, C01 `a35bd27da869f4781cbf1f40d5e559a126abce2f`, B04 `d5fa361f28cee4a50e62c1c18be42990c8e084c0`, and B02 `eab26ac58d21b064bc7cd0672e27431505427bd3`. B02 CI is green for its exact SHA in [workflow run 39788832611](https://github.com/LucasMatuszewski/sages-codex-copilot-cli-2026-10/actions/runs/39788832611): frozen install, 16 unit tests, 11 integration tests, and typecheck. No skips were reported.

The project context configuration is commit `a28dcb51a514f5003e501b58e5bda5f1e941ae6d`; the safe-destination copy base is `5731e87af948dc6e570696d645e8e0b8fc10a883`. The native checkout is at `/home/lucas/DEV/COURSES/Sages/sages-codex-copilot-cli-2026-10-cra-poc`, branch `codex/cra-poc-implementation`, with HEAD/upstream at `5731e87af948dc6e570696d645e8e0b8fc10a883` and a clean tracked checkout at migration verification. Its app tree hash is `0629de6c5fc86796a2c241a954f6602e10149b4c`. Maintenance did not change the app tree. Do not attribute the earlier CI run to later documentation commits outside the workflow path filter.

## Native WSL verification

The [migration report](../../.agent-briefs/cra/maintenance/migration-report.md) is the source for detailed copy checks and raw log paths. The original `/mnt/c/Users/BiuroEdukey/DEV/COURSES/sages-codex-copilot-cli-2026-10` checkout remains available as rollback. The proposed sibling checkout without `-cra-poc` already belongs to a different course and has local untracked work; it was left untouched. `app/node_modules` was regenerated natively from the frozen lockfile; prior ignored QA evidence and artifacts were copied and retained. Local `core.autocrlf=false` was set in the destination; do not change global Codex home, auth, or session state.

From native `DEST/app`, `pnpm install --frozen-lockfile` passed in 7.99 s. It emitted Node warning `[DEP0176]` (`fs.R_OK` is deprecated; use `fs.constants.R_OK`). Separate native checks passed with zero skipped tests:

| Command | Result | Time |
| --- | --- | ---: |
| `pnpm test:unit` | 16 passed across 3 files; exit 0 | 2.70 s |
| `pnpm test:integration` | 11 passed across 3 files; exit 0 | 7.75 s |
| `pnpm typecheck` | exit 0 | 5.61 s |

The native integration suite (11 tests across 3 files, 7.75 s total) covers the migration CLI applying one migration on the first run, applying zero on the second while retaining data, and returning a sanitized failure for an invalid database location. These are suite-level native timings; no individual CLI timing is claimed. Integration fixtures use private temporary files; the default `.data/cra.sqlite` remains absent. No web build, dev server, browser preview, or manual UI QA was run. There are no QA screenshots because F01 has not started; native CLI evidence is under `app/artifacts/WSL-migration/20261022T140612Z/`.

## Next authorized sequence

After the human resumes the work, follow the canonical plan order: F01 Ionic shell, then B03 API, then Q01 foundation QA, followed by the remaining dependency-ordered work. Before delegating F01, regenerate its temporary brief from the native root and current HEAD using the delivered B02 interfaces. Cached briefs contain old absolute paths and historical evidence; do not run them unmodified. Keep one source writer at a time, honor exclusive script leases, use test-first semantic Red and manual runtime QA, and make granular reviewed commits. Push only under the already authorized feature-branch policy. Do not add application features before the human resumes the paused work.

Keep screenshots, when later produced, under `app/artifacts/screenshots/<task>/<run-id>/`, outside runner-cleared output. The project needs a manual UI retarget: in the Codex project, use **Edit project → Add folder → Make primary** and select the native destination in WSL Ubuntu-26.04 (use its UNC path if needed). New chats should then start from the primary folder. Start a new native WSL chat before continuing; the current Windows-backed chat does not automatically adopt the moved checkout. See [Codex projects](https://learn.chatgpt.com/docs/projects) and [Codex for Windows](https://learn.chatgpt.com/docs/windows/windows-app).

The project context example sets `model_context_window = 800000`, `model_auto_compact_token_limit = 700000`, and scope `"total"`; it does not force a model. See the [context-window guide](../../course-materials/codex-context-window.md). These project settings require the trusted project layer and a new session to load; do not claim that the existing chat hot-reloaded them.

## Tracking and pause boundary

Tracking references are the `Implement local CRA …` epic (`sacs-0nmk`), B02 (`sacs-0nmk.3`), and `Move Sages …` maintenance task (`sacs-phi7`). Task acceptance is recorded in evidence/notes, but records were not automatically closed. Before future dispatch, reconcile their state from the delivered commits and use the human-readable name together with each ID.

This handoff does not mark the paused goal complete, resume it, or close tracking records. The manager will review and publish this handoff separately.
