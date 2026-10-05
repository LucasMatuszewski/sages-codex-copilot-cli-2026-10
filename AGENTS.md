# Repository guidelines

## Project and authority

This is the Sages / Sygnity Java workshop repository, 5-8 October 2026, taught with OpenAI Codex and GitHub Copilot CLI. Day one uses the real legacy Swing jFTP application from https://github.com/sai-pullabhotla/jftp. The full reusable course boilerplate and historical libraries are retained.

`docs/PRD.md` describes the authorized starter preparation. Participants define the requirements for their actual feature, bug fix or refactoring during the workshop and record architectural decisions in `docs/ADR/`. Do not infer a multimodal AI application, electronics returns domain or TypeScript stack from archived examples. No AI API key is needed by jFTP.

Chat and participant-facing material: Polish with diacritics. Technical application documentation: English. Preserve imported upstream text and line endings.

## Layout

- `app/jftp/`: complete pinned upstream application, including its original POM and license.
- `app/ftpapi/`: complete pinned upstream FTP API 3.0.0 dependency source.
- `app/build-bridge/`: course Maven modules compiling the original sources.
- `app/launcher/`: course-only offline launcher and classpath smoke tests.
- `app/fixtures/`: synthetic local files.
- `docs/`: authoritative requirements and architectural decisions.
- `course-materials/`: optional teaching library and slides.

**Do not read, browse, search or index `course-materials/` during application work unless the user explicitly requests a relevant file or course-material task.** Its prompts, sample PRDs, ADRs and agent configurations are examples, not application requirements. Do not activate optional Claude, provider, MCP, hook or global agent configurations merely because they exist in the boilerplate.

## Development

1. Read the actual current PRD and applicable ADR before changing behavior. Record user decisions and corrections there before implementation.
2. Preserve the imported baseline during starter preparation. Workshop changes require an explicit specification. Do not solve future exercises or modernize the application unsolicited.
3. For a feature or bug fix, specify the expected behavior, add a meaningful failing test first, implement the smallest change, then verify the affected scope. Characterization tests capture current behavior; distinguish that behavior from newly agreed requirements.
4. Keep fixtures local and synthetic. No external FTP connection, real credentials, participant data, organization code or production deployment.
5. Do not modify tests or the integrity manifest to disguise failures. Review the diff and explain remaining warnings honestly.

## Build and verification

Use a JDK 17 and Maven 3.9.x. Run commands from the repository root:

```bash
mvn -f app/pom.xml test
```

```bash
mvn -f app/pom.xml verify
```

```bash
java -jar app/launcher/target/jftp-workshop.jar
```

The first Maven run requires access to Maven Central. A warmed cache supports `mvn -o -f app/pom.xml verify`. The build bridge targets Java 8 bytecode with a modern compiler plugin. It excludes only the unused Apple-specific `OSXAdapterOld.java` and preserves that source file. Upstream HTTP/FTP publishing repositories and release/deploy plugins are not inherited. See `app/UPSTREAM.md` for precise provenance.

The launcher uses an isolated `app/.workshop-home/`, disables automatic updates through the upstream preference API, and opens the original Swing UI. `-Dworkshop.home=<path>` overrides that home. Keep the session disconnected and use `app/fixtures/local-files/` for local UI checks. Do not run the upstream main directly during offline workshop verification; it uses the real user home and enables update checks by default.

For changes affecting GUI behavior, exercise the real Swing screen and relevant local flow on a graphical desktop; record evidence. Browser automation and npm dev servers are not GUI QA for this Java app. With no display, report the limitation and run scoped headless checks, never claim a GUI pass. For documentation-only work use link/text checks; for imported source preservation optionally run `python3 scripts/verify-upstream.py`.

Two supplied tests check resources and class loading only. They do not validate FTP transfers or provide the participant characterization solution. Add behavior tests in `app/launcher/src/test/java/` or agree a separate test module before changing the structure.

## Git

- Verify before committing. Stage explicit paths only, never `git add .`, `git add -A` or `git commit -a`.
- Keep each logical change reviewable with a focused commit. Never push without explicit permission.
- Use the existing checkout. Ask before creating a worktree; remove only worktrees you created when their work ends.
- Do not commit generated `target/`, workshop preferences, portable toolchains, caches or secrets.
