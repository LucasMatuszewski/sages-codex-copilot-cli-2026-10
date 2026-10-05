# Repository guidelines

## Purpose and authority

This repository contains materials for the Sages / Sygnity Java workshop on 5-8 October 2026, using OpenAI Codex and GitHub Copilot CLI. The day-one application is the original [sai-pullabhotla/jftp](https://github.com/sai-pullabhotla/jftp), cloned into a sibling directory. This repository does not contain the application, its build, a feature PRD or application ADRs.

Follow the user's language in chat. Participant-facing course content is Polish with diacritics; technical application documentation written in the separate application checkout is English unless the team specifies otherwise. Preserve upstream text and line endings when working with that checkout.

## Layout and boundaries

- `AGENDA.md`: source agenda; confirmed workshop hours are 09:00-17:00 Europe/Warsaw.
- `README.md`: course entry point and separate jFTP clone instructions.
- `course-materials/java/README.md`: day-one exercise.
- `course-materials/slides/`: current slides and prompt library.
- `course-materials/`: optional teaching library, including historical examples.
- `docs/`: course tool notes, not application requirements.

Do not treat archived prompts, sample PRDs or ADRs, optional agent/provider/MCP configurations, hooks or libraries as active requirements. Do not activate optional configuration solely because it is present. During application work, read course material only when the user requests a relevant file or a course-material task. Write application-specific `AGENTS.md`, PRDs, plans and ADRs in the participants' jFTP checkout as they agree on actual work. Do not impose a default stack or assume an existing feature specification.

## Work and verification

For a proposed feature or bug fix in jFTP, establish expected behavior and scope with the user. Record decisions in the application's own PRD or plan before code changes. Establish the original behavior with focused characterization tests; a new requirement needs a meaningful failing test before implementation. Enable the test framework from evidence in the original project and its dependency sources, then verify the affected scope. Check unfamiliar types and methods against imports, call sites or source rather than inventing APIs.

Keep experiments local and use synthetic data. Do not connect to an external FTP service, use real credentials or participant data, deploy artifacts, or include private organization code. Preserve original application code until characterization tests pass. Record exact commands and results. Compilation, test execution and interactive Swing startup are distinct checks. For GUI changes, test the real Swing flow on a graphical desktop and record evidence; if no display is available, report that limitation. Review diffs and remaining warnings honestly; do not weaken tests to hide a failure.

## Git

- Verify before committing. Stage explicit paths only; never use blanket staging or `git commit -a`.
- Keep each logical change reviewable in a focused commit. Do not push without explicit authorization.
- Use the existing checkout. Ask before creating a worktree and remove only worktrees you created.
- Do not commit build output, caches, generated preferences or secrets.
