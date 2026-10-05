# jFTP course starter requirements

## Purpose and authority

Prepare the real Java jFTP legacy application for the Sages / Sygnity workshop on 5-8 October 2026. Codex is the primary agent and GitHub Copilot CLI is the second taught tool. The trainer explicitly selected https://github.com/sai-pullabhotla/jftp and requested the complete course boilerplate with minimal personalization. This PRD describes course preparation only; participants will write requirements and ADRs for their chosen changes during the workshop.

## Scope

- Preserve the canonical jFTP Java sources, resources, upstream POM, license and notices without behavior fixes or solved workshop tasks.
- Pin and attribute upstream revisions. Retain the required FTP API dependency at its original 3.0.0 release from its canonical Apache-2.0 source if the historical binary repository is unavailable.
- Add a separate Maven build bridge compatible with a current JDK, excluding only the unused Apple-specific `OSXAdapterOld.java` from compilation while preserving its file, without modifying vendored source or contacting the historical FTP deployment repository.
- Provide a local, offline workshop launcher with an isolated application home and automatic update checks disabled through the existing preference API. This is an explicit launch configuration, not a change to upstream defaults.
- Supply resource/classpath smoke verification, a local synthetic fixture, and an unsolved characterization exercise.
- Document clean-clone setup for native Windows PowerShell and Linux/macOS. A JDK and Maven are local prerequisites; the first build downloads JavaHelp and build/test tooling, subsequent cached builds can run offline.
- Preserve all optional and archived course libraries. Application agents read `course-materials/` only on an explicit request.

## Course publication scope

The authorized delivery includes the copied developer repository and topic-based HTML slide boilerplate, personalized for Sages as organizer and 11 Sygnity Java developers/DevOps. The confirmed timetable is 5-8 October 2026, 09:00-17:00 Europe/Warsaw, on Zoom with participants' own computers. The unchanged approved source agenda remains in `AGENDA.md`; the practical schedule uses the subsequently confirmed hours.

Retain the rich optional library and existing slide structure. Teach Codex first, compare GitHub Copilot CLI throughout, and cover every approved module 1.1-4.4. Start with real jFTP on day one; the next Java project remains a later trainer decision. Publish the reviewed materials, aggregate survey report, glossary, prompts and agenda at `https://devpowers.com/szkolenia/sages/sygnity-05-10/` and the public personal-account repository. Raw survey data, private correspondence, diagnostics and trainer answers stay outside public content and history. The DevPowers publication path is `szkolenia/sages/sygnity-05-10/` in the separate `LucasMatuszewski/DevPowers` repository; its publication job is implemented there, rather than duplicated in this Java starter repository. Prepare a separate course-scoped publication QA job using the existing HTML review-status guard and compatible copy checks, with an exact participant file allowlist. Preserve the existing FutureSkills job and unrelated untracked files.

Repository QA must verify the Java bridge from a clean Linux and native Windows checkout, including unchanged upstream hashes and packaged headless fallback. Git attributes preserve original upstream bytes on Windows. The copied optional Azure PR-Agent workflow must remain inactive until its owner explicitly configures and enables it; ordinary build QA requires no AI credentials. Independent local reviewers and cloud PR reviewers assess the final changes before production publication.

## Acceptance criteria

1. The public repository contains attributable and licensed real jFTP source, with an integrity manifest proving unchanged imported files.
2. A clean participant checkout builds with documented commands and launches the actual Swing application when a graphical desktop is available.
3. Offline smoke verification loads production classes and required resource bundles without connecting to a real FTP server.
4. No modernization, new business domain, AI API application, or participant solution is supplied.
5. Root instructions, setup and exercises describe the Java starter and current course, with links to the unchanged `AGENDA.md` and course website.
6. QA distinguishes compile, test, GUI launch and manual exercise evidence; unavailable GUI verification is reported explicitly.

## Constraints

Use synthetic local files only. Never connect to an external FTP account, deploy upstream artifacts, read secrets, or claim a manual GUI test on compilation evidence. Preserve upstream line endings and bytes. No system/global tool installation is necessary for preparation QA.

## Corrections Log

| Date | ID | Before | Change | Reason |
| --- | --- | --- | --- | --- |
| 2026-10-05 | JAVA-001 | Generic multimodal MVP, TypeScript example and electronics returns domain in copied boilerplate. | Use the trainer-selected existing jFTP Java application; keep optional libraries, remove unrelated active app requirements. | Explicit user choice and current approved course brief before code preparation. |

| 2026-10-05 | COURSE-002 | Starter-only requirements in this document. | Record the already authorized four-day course, copied slides, public destinations and review loop. | Keep the full publication agreement in the repository source of truth. |
| 2026-10-05 | QA-003 | Linux-only local evidence; inherited Azure review workflow needs unconfigured credentials. | Add Linux/Windows build and integrity QA, preserve upstream checkout bytes, make Azure review explicitly opt-in. | A working public starter needs reproducible platform checks without inherited secret requirements. |
| 2026-10-05 | REVIEW-004 | Copied agent permissions permit automatic approval review and network access; generic prompts mention browser UI. | Use visible participant approval and network by consent in the active course config, keep optional provider/plugin examples inactive, and clarify the Java build bridge, GUI and PRD boundary in P18/P19. | Independent Opus review found gaps between the teaching path and copied defaults. |

| 2026-10-05 | PUB-005 | The destination was recorded, but the new course had no separate DevPowers publication QA job. | Prepare scoped QA for `szkolenia/sages/sygnity-05-10/`, retain FutureSkills checks and validate the participant-only file allowlist before the coordinator copies and releases materials. | Record the already authorized publication guard and preserve private artifacts and unrelated checkout changes. |

| 2026-10-05 | SURVEY-006 | Final report passed numerical/privacy checks but retained minor Polish phrasing and chart presentation defects. | Correct only the reviewed report wording, mobile table headings, bar legends and the question-specific count-axis base, preserving all published data and report structure. | Final independent Opus5.5 source and screenshot review; rerun affected browser and arithmetic checks before publishing. |

| 2026-10-05 | REVIEW-007 | A copied P18 library-card summary still described jFTP as an optional follow-up. | Label only that summary as the main day-one legacy example; preserve the already correct complete prompt. | Independent pre-deployment source/copy review identified one stale wrapper description. |

| 2026-10-05 | CLOUD-008 | Cloud review found incomplete fork/remotes instructions, mixed browser/PAT login, unconfirmed break alarms and imprecise Bitbucket migration guidance. | Document fork origin/upstream before first push, use one browser login flow without broad PAT guidance, suppress proposed alarms until confirmed, and correct API-token guidance against current primary documentation. Clarify the separate DevPowers publication workflow repository. | Verify all six cloud findings, retaining the already corrected P18 summary and rejecting outdated assumptions about the latest Atlassian timeline. |

| 2026-10-05 | REVIEW-009 | Final expert review requested clearer manual Git authentication, explicit PR base selection and startup-step ordering. | Document SSH or browser credential-manager authentication for the manual fork, explicitly choose the participant fork/main as PR base, order local identity/branch before day-three login, and document confirmed break flags. | Complete the same cloud-feedback fixes without adding prerequisites or changing course scope; refresh actual screenshots and final source checks. |

| 2026-10-05 | REVIEW-010 | Optional `gh pr view --repo` example omitted its required PR/branch argument. | Pass the demonstrated `moja-praca` branch explicitly; verify the equivalent read-only command against the actual course PR. Clarify updating the break label after confirmation. | Final expert review identified a reproducible command error; actual CLI invocation confirmed the corrected form. |
