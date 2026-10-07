# Repository Guidelines

## Project and authority

This is the course-material repository for the four-day Sages / Sygnity Java workshop on 5-8 October 2026, using OpenAI Codex and GitHub Copilot CLI. Exercises cover repository analysis, context engineering, requirements, architecture decisions, features, bug fixes, legacy refactoring, tests and code review.

Concrete exercise scope and technical decisions are agreed live with the group through research and analysis -> PRD -> ADR where needed -> implementation with agents. Do not assume a default application, framework, build tool, Java version or feature specification.

The workflow below governs Java programming exercises. Apply it in the checkout that owns the exercise code, according to that checkout's instructions. This repository currently contains teaching materials, not a runnable Java application. Examples such as jFTP run in a separate repository; application changes and their documentation belong there.

Communicate in Polish in chat unless the user explicitly requests another language. Write technical repository documentation, PRDs and ADRs in English. Participant-facing lessons, slides and exercise prompts are Polish with diacritics. Preserve upstream text and line endings unless the task requires a change.

## Repository layout and context

- `AGENDA.md`: source agenda; confirmed workshop hours are 09:00-17:00 Europe/Warsaw.
- `README.md`: course entry point and instructions for a separate application checkout.
- `course-materials/java/README.md`: Java legacy exercise.
- `course-materials/slides/`: current slides and prompt library.
- `course-materials/`: optional teaching library, including historical examples.
- `docs/`: course tool notes, not application requirements.
- `assets/`: teaching and reference assets; use only those selected for the exercise.

In the exercise checkout, load only the documents relevant to the affected area:

- The agreed PRD and acceptance criteria, normally `docs/PRD.md`.
- Relevant architecture decisions, normally `docs/ADR/`.
- Existing build, test and run instructions.
- Design guidance if the exercise has an agreed visual reference.

These documents are created during the course; their paths are conventions, not evidence that they already exist. Archived prompts, sample PRDs and ADRs, optional agent/provider/MCP configurations, hooks and libraries are teaching aids, not active requirements. Do not activate them merely because they are present. During application work, read course material only when requested for the exercise.

## Agent Workflow

### Before implementing or refactoring functionality

1. Confirm the actual code checkout, affected scope and relevant agent instructions. Inspect the existing source, build descriptors, imports, call sites and dependency sources before proposing commands or APIs.
2. Read the relevant PRD and ADRs. Define expected observable behavior and acceptance criteria from the specification before writing or changing code.
3. If requirements are missing or ambiguous, establish them with the user and record the agreed exercise scope in the application's PRD before implementation. Add an ADR when a technical decision needs a rationale and alternatives. Routine course-document edits do not require an application PRD or ADR.
4. Identify reproducible build, test and startup commands from the actual project. Use its wrapper when available. Do not assume Maven, Gradle, JUnit, a server framework or a particular JDK; select compatible tools from evidence.
5. For legacy code, establish the baseline with characterization tests before changing production behavior. Keep observed current behavior separate from desired behavior, especially when documenting a defect.

### TDD Rules

For every feature and bug fix:

1. Start from the agreed specification and acceptance criteria, not from the implementation's structure.
2. Write or extend meaningful behavior tests **before** production code. Cover the intended result and relevant failure or boundary cases. A bug fix needs a regression test reproducing the defect.
3. Run the new tests and confirm they **fail for the expected behavioral reason**. Compilation errors, missing dependencies or broken fixtures are not a valid Red step. Record the command and failure.
4. Implement the minimum production change needed to make the tests pass.
5. Run the full verification suite for the changed scope, including affected regression and integration tests. Broaden it when shared code or dependencies are affected.
6. Refactor only while tests remain green; rerun the relevant tests after each meaningful change.
7. **Manually validate the running application** using the real affected flow, as described below. Passing automated tests, including E2E tests, does not establish that the application works.

If suitable test infrastructure is absent, add the smallest compatible setup as part of the task. Establish that it discovers and executes tests; do not silently skip testing or rewrite production logic to make test setup convenient.

For behavior-preserving legacy refactoring, write characterization tests against the original code and get them green before changing it. Assert observable inputs, outputs, state changes and errors rather than private methods or the current class layout. Demonstrate that critical assertions detect a controlled behavioral mutation, then revert that mutation. Existing tests may protect a pure refactor; a new behavior or bug fix still requires Red -> Green -> Refactor.

Investigate production code and fixtures before changing a failing assertion. Do not weaken, disable or delete tests to conceal a defect. Change expected behavior only when the specification supports it, and explain why.

### Manual QA (required after every task affecting the running application)

Use the interface the Java exercise actually provides:

1. Start the application with its verified command and the required local configuration. Confirm successful startup separately from compilation and test execution.
2. Exercise the complete affected flow as a user, using synthetic inputs. Include the successful path and relevant error handling; verify results, state changes and persistence where applicable.
3. For desktop Java/Swing, use a graphical desktop and interact with the real windows, dialogs and controls. Check responsiveness, focus, navigation and relevant thread-related UI behavior. Headless tests do not count as desktop QA.
4. For a CLI, run the real command and check output, exit status and side effects. For an API, start the real service and send representative requests, checking responses and resulting state. For a web UI, use the Playwright CLI to drive the running application and inspect browser errors.
5. Capture screenshots of each changed GUI screen and relevant states. For CLI/API exercises, record representative commands, requests and results. Inspect runtime logs for errors.
6. Check UI text against the exercise's language requirements and compare visual changes with the agreed reference or existing UI conventions. Do not impose an unrelated brand, font or design system.
7. Report the steps, environment and evidence in the task summary. Fix failures before committing. If a display, service or other prerequisite is unavailable, state exactly what remains unverified; the runtime task is incomplete until the required manual QA is performed.

Use only local synthetic fixtures and services. Do not connect to external FTP services, use real credentials or participant data, deploy artifacts or include private organization code. Keep these boundaries in place during manual QA and E2E tests.

### Verification (required before every commit)

Verify the scope relevant to the change using commands confirmed in the actual exercise checkout.

| Test type | Dependencies and doubles | Responsibility |
|---|---|---|
| Unit | Isolate the behavior; mock or stub dependencies where needed for deterministic tests, without mocking the behavior under test | Implementing agent |
| Integration | Exercise real internal components and local fixtures; replace only external services that cannot be included safely in the exercise | Implementing agent and reviewer |
| E2E | No mocks in the exercised flow; use the real application and a local synthetic stack | QA/reviewer |

- Record exact commands and results for compilation/build, test execution and application startup as separate checks. A successful build is not proof that tests ran or that the app starts.
- Confirm all intended tests were discovered and executed, including integration tests that may use a separate build phase or task. Report skips; zero executed tests is not a pass.
- For runtime changes, always start the app and complete Manual QA before committing. Automated E2E results alone are insufficient.
- Verify documentation-only changes through the diff, referenced paths and consistency with the course. They do not require an application build or startup.
- Resolve errors and warnings introduced by the change. Report pre-existing warnings and failures with evidence; do not hide them or claim a clean verification result. A failing required check blocks completion.
- Review the final diff for unintended changes, test quality, regressions and generated files. Incorporate review findings and repeat affected checks after fixes.

### Commit Rules

- Commit only after required verification passes and the changed scope works. Keep one logical change per commit.
- Use `Area: short summary`, for example `Java:`, `Tests:` or `Docs:`. Explain consequential decisions or trade-offs in the body.
- Inspect `git status --short` and stage explicit paths only. Never use `git add .`, `git add -A` or `git commit -a`. Review the staged diff before committing.
- Do not push unless the user explicitly asks.
- Use the existing checkout. Ask before creating a worktree and remove only worktrees you created.
- Preserve other people's changes. Do not commit build output, caches, generated preferences, runtime logs or secrets.

### Completion Criteria

A task is complete only when:

- The change matches the agreed exercise scope and, for application work, the relevant PRD, ADRs and applicable UI guidance.
- Code changes have the required tests written first, with an observed meaningful Red step for new behavior or bug fixes; legacy refactors have a passing characterization baseline.
- Required verification passed honestly, with no unresolved errors or warnings introduced by the change; documentation-only work follows its scope-specific checks above.
- Runtime changes passed startup and manual validation of the real affected flow, with screenshots or command/request evidence.
- The diff is focused and reviewable, and any requested commit follows the rules above.
- The task summary states what changed, exact verification commands and results, manual QA evidence and any remaining limitations. Unperformed required checks mean the task is incomplete.
