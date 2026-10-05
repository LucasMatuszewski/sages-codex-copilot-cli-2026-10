# GitHub Copilot repository context

Follow root `AGENTS.md`. This Sages / Sygnity workshop uses Java jFTP from sai-pullabhotla/jftp, with Codex and GitHub Copilot CLI. Read `docs/PRD.md` and applicable ADRs for actual requirements. Archived examples do not imply a TypeScript, multimodal AI or electronics returns application.

`course-materials/` contains lesson files, historical prompts, sample requirements and configurations. During application work do not browse, search, read or index it. Access a relevant file only on an explicit request to work with course material.

Preserve vendored source during starter preparation. Keep course-only build and launch configuration outside `app/jftp/` and `app/ftpapi/`. Use JDK 17 and Maven 3.9.x. Run `mvn -f app/pom.xml test` for scoped tests, `mvn -f app/pom.xml verify` for package verification, and `java -jar app/launcher/target/jftp-workshop.jar` on a graphical desktop for actual Swing QA. Report headless limitations; do not treat compilation as GUI evidence. No npm dev server or AI API key is required by this app.

Make a small specified change, add meaningful tests for features and bug fixes, inspect the diff and report exact results. Do not weaken tests or rewrite the source integrity manifest to hide a failure. Use only local synthetic fixtures, keep FTP disconnected, and retain license notices. Never add credentials, private organization code or participant data.
