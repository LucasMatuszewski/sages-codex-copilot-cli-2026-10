# Java team questions: debugging, security, Jenkins MCP, Copilot costs, limits, skills, scope, worktrees (research 14.10.2026)

Verified on 2026-10-14. Audience: Java teams using Windows, IntelliJ/Eclipse, Maven where applicable, Jenkins and an internal Git server.
Local versions confirmed: `codex-cli 0.162.1`, `GitHub Copilot CLI 1.0.88`. Research used official documentation, authenticated GitHub source/release reads and Context7. Recommendations and calculations are identified separately from product guarantees. No client code, credentials or participant data were inspected. No accounts, plugins, agents or schedules were configured.

## Part A

### 1. Can the agent operate a Java debugger without human clicks?

**Direct answer:** Yes, with an actual debugger connection. Shell access alone does not give an agent access to an IDE's suspended frames.

| Route | Verified capabilities and limitations |
| --- | --- |
| JDK `jdb` over JDWP | Launch/attach, method/line breakpoints, stepping and expression inspection. An agent can drive its stdin/stdout. Use a persistent process and wait for suspension; piping an entire command list at startup can race debugger events. Local-variable inspection needs appropriate debug metadata. |
| IntelliJ built-in MCP | Current 2026.2 documentation lists the bundled Debugger MCP toolset: `xdebug_set_breakpoint`, `xdebug_get_frame_values`, stack inspection, session start/control and expression evaluation. Shared-server debugger tools are documented for **2026.1.3 and later**. Do not generalize this to every 2026.x installation. |
| MCP -> DAP -> Java debugger | `debugmcp/mcp-debugger` explicitly supports Java; its repository was active on 2026-10-12. `microsoft/DebugMCP`, active on 2026-10-13, bridges MCP to VS Code's debug API, including Java. The latter requires VS Code and its Java debugger, rather than controlling IntelliJ or Eclipse. |
| Java adapter | Microsoft's `java-debug` implements Java DAP through JDI and integrates with Eclipse JDT Language Server. It is an adapter component, not a standalone MCP server. A compatible bridge must bootstrap it correctly. |
| Eclipse | JDT supports local/remote Java debugging. A maintained, first-party Eclipse IDE MCP toolset exposing equivalent breakpoint/variable control was **UNCONFIRMED** in the checked official sources. Use `jdb` independently or pilot a separate bridge. |
| Copilot IntelliJ plugin | Official docs confirm chat/agent workflows and several IDE entry points. Native breakpoint/variable tools supplied by the Copilot plugin itself are **UNCONFIRMED**. An external Copilot CLI connected to IntelliJ's MCP server is a separate, documented integration route. |

The two MCP bridges above are concrete maintained candidates, not production endorsements. Their Windows/Maven compatibility with this team's applications is **UNCONFIRMED** until a synthetic smoke test. `d4n-sec/jdb-mcp` is another community option using JDI directly, not DAP; its README documents attach-only operation and limitations, so it should not be described as a drop-in full debugger.

**Practical recommendation:**

- For existing IntelliJ users, prefer **IntelliJ 2026.1.3+ with its bundled debugger MCP tools**, a verified Maven run configuration and Codex/Copilot CLI as the client. Pilot: set breakpoint -> start debug -> await suspension -> read variable -> resume. This is the most direct documented route for that IDE; reliability on their machines remains untested.
- For Eclipse users or a reproducible IDE-independent lesson, use the project's existing JDK and Maven wrapper (`mvnw.cmd` if present), compile with needed debug metadata, and let the agent drive `jdb`. Discover the real launch command/classpath from the application instead of assuming Spring Boot or a single executable JAR.
- Bind JDWP to loopback, for example `address=127.0.0.1:5005` on a compatible modern JDK. Check older JDK syntax. Never expose an unauthenticated debugger port to the LAN. Use synthetic state: evaluated methods can change state, and suspending all threads can freeze Swing or trigger timeouts.

Sources: [Oracle jdb](https://docs.oracle.com/en/java/javase/24/docs/specs/man/jdb.html), [JetBrains agentic debugging](https://www.jetbrains.com/help/idea/agentic-debugging.html), [IntelliJ MCP tool list](https://www.jetbrains.com/help/idea/mcp-server.html), [Microsoft Java adapter](https://github.com/microsoft/java-debug), [Microsoft DebugMCP](https://github.com/microsoft/DebugMCP), [community mcp-debugger](https://github.com/debugmcp/mcp-debugger), [community JDI server](https://github.com/d4n-sec/jdb-mcp), [Eclipse remote debugger](https://help.eclipse.org/latest/topic/org.eclipse.jdt.doc.user/concepts/cremdbug.htm), [Copilot IDE entry points](https://docs.github.com/en/enterprise-cloud%40latest/copilot/concepts/copilot-surfaces/copilot-in-ides?tool=jetbrains).

**Dla trenera:** Pokaż IntelliJ MCP na sprawdzonej wersji IDE, a dla Eclipse przygotuj wariant z `jdb`; nie obiecuj debugowania bez testu na komputerze uczestnika.

### 2. Security review, products and an internal Git/Jenkins workflow

**Direct answer:** Ordinary agent review works against a local checkout from any Git host. Hosted PR security products have separate integrations, access requirements and licenses. No agent result establishes compliance with an unspecified law.

- **Codex review:** `/review` supports uncommitted changes, a base branch, a commit and custom instructions. Local `codex review --help` confirms the corresponding CLI targets and custom prompt. Focus a custom review on authorization, untrusted-input paths or another explicit threat; there is no verified dedicated `--security` switch. Do not assume target flags and custom positional prompts compose in every version: express the target in the custom review prompt if necessary.
- **OpenAI security products:** Codex Security Review supports `@codex security review` on connected GitHub PRs for eligible Business/Enterprise/Edu/Pro accounts. Codex Security Cloud is a research preview. The Security plugin/workbench and public `@openai/codex-security` CLI/SDK are separate surfaces; executing scans requires access. OpenAI documents local/CI scans and SARIF export. Jenkins integration is a reasonable adaptation of that CLI, **UNCONFIRMED** on this team's installation, rather than a verified Jenkins-specific integration. Local security scans do not stop for approval prompts; run them in a restricted job environment.
- **GitHub offerings:** Copilot code review provides AI review in supported IDEs and GitHub PRs. Copilot Autofix suggests fixes for supported CodeQL alerts; it needs no Copilot subscription, but private/internal GitHub repositories require GitHub Code Security. Agentic autofix is a separate preview using cloud-agent credits. Security campaigns organize alerts and remediation across an organization's repositories; they are not an independent scanner.
- **Reusable guidance:** OpenAI publishes `security-best-practices`, `security-threat-model` and `security-ownership-map` skills. The best-practices skill explicitly targets Python, JavaScript/TypeScript and Go; Java-specific bundled guidance is not promised. A Java security prompt should identify the actual frameworks, trust boundaries, assets and expected controls, and require reachable attack paths, source locations, confidence, validation and remediation.

**Practical recommendation:**

- Keep the internal Git service and Jenkins. Start with a checked-out revision, existing deterministic Java scanners and a narrowly scoped Codex/Copilot CLI review; archive revision IDs, scanner versions, findings and test evidence. Hosted GitHub campaigns/Autofix are not automatic features of that setup.
- Treat CodeQL licensing separately: external CI is supported, but a Copilot license does not grant unrestricted CodeQL rights for proprietary code on an internal Git server. Confirm the organization's entitlement before proposing that integration.
- Use this reusable review request: "Review only changes between BASE and HEAD for exploitable security regressions. Trace untrusted input to sensitive operations and verify authorization and existing controls. For each finding give path:line, preconditions, impact, confidence and a safe synthetic reproduction. Separate confirmed findings from hypotheses. Do not modify files." Have the security owner define the required legal/control evidence; retain human approval of patches.

Sources: local `codex review --help`; [OpenAI security products, access and CI](https://developers.openai.com/blog/scaling-cyber-defenders-with-daybreak), [OpenAI security skills](https://github.com/openai/skills/tree/main/skills/.curated), [best-practices language boundary](https://github.com/openai/skills/blob/main/skills/.curated/security-best-practices/SKILL.md), [Autofix](https://docs.github.com/en/enterprise-cloud%40latest/code-security/concepts/code-scanning/autofix-for-code-scanning), [campaigns](https://docs.github.com/en/code-security/how-tos/manage-security-alerts/remediate-alerts-at-scale/creating-managing-security-campaigns), [CodeQL CLI and licensing](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-cli).

**Dla trenera:** Zacznij od lokalnego przeglądu konkretnego ryzyka i dowodów z Jenkinsa; funkcje GitHub oraz zgodność prawną omawiaj jako osobne wymagania.

### 3. Is there an official Jenkins MCP server?

**Direct answer:** Yes: `mcp-server`, published in the Jenkins plugin catalog and maintained in `jenkinsci/mcp-server-plugin`. It is a community-maintained Jenkins ecosystem plugin, not Jenkins core or a vendor support guarantee. Latest release checked: **0.211.v5d12e5b_b_437e**, 2026-09-30; its source requires Jenkins **2.541.3**. It exposes both reads and writes, including triggering builds and replaying Pipeline code. No universal "read-only server" toggle was established.

The documented preferred transport is Streamable HTTP at `<jenkins-url>/mcp-server/mcp`. Authentication uses Jenkins user + API token through HTTP Basic. An encoded Basic header remains a secret. The release source checks `Item.BUILD` for build triggers; `readOnlyHint` annotations describe tools and do not impose authorization. Plugin-provided tools and their permissions must also be reviewed.

**Practical recommendation:**

- An administrator should pilot the compatible plugin version on staging, over HTTPS/VPN, with a dedicated service identity granted `Overall/Read` and `Job/Read` only on selected synthetic jobs. Do not grant Build, Configure, Delete, Cancel, Replay, Administer or broad credential access. Avoid `Job/ExtendedRead` unless required; it can expose job configuration.
- For **Codex**, configure that HTTP endpoint privately and use `enabled_tools = ["getJobs", "getJob", "getBuild", "getBuildLog"]` under its MCP server entry. For **Copilot CLI**, add an HTTP server through `/mcp add` or private MCP configuration and set its `tools` allowlist to the same four names. Supply the Basic header through the approved secret mechanism; never commit it or print it. Client filtering supplements server ACLs.
- Confirm identity and one job/build/log read, then prove a direct `triggerBuild` attempt with the same service identity is denied and creates no queued build. Inspect logs for synthetic data only. Codex/Copilot CLI connectivity and negative authorization tests against this team's Jenkins remain **UNCONFIRMED**; the plugin README explicitly says its Copilot CLI example was not tested.

Sources: [Jenkins plugin catalog](https://plugins.jenkins.io/mcp-server/), [release](https://github.com/jenkinsci/mcp-server-plugin/releases/tag/0.211.v5d12e5b_b_437e), [version requirement](https://github.com/jenkinsci/mcp-server-plugin/blob/0.211.v5d12e5b_b_437e/pom.xml#L34), [server permissions](https://github.com/jenkinsci/mcp-server-plugin/blob/0.211.v5d12e5b_b_437e/src/main/java/io/jenkins/plugins/mcp/server/extensions/DefaultMcpServer.java), [Codex MCP configuration](https://learn.chatgpt.com/docs/config-file/config-reference), [Copilot MCP configuration](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers).

**Dla trenera:** Jenkins MCP istnieje; pokazuj go na koncie tylko do odczytu, a blokadę uruchamiania buildów potwierdź po stronie serwera.

### 4. Copilot multipliers, current model prices and USD 25 vs USD 100

**Direct answer:** The premise needs updating. GitHub moved to token-based AI credits on **2026-06-01**. Premium-request multipliers remain only for grandfathered annual Pro/Pro+ plans, which do not receive new models/features. Thus no current premium-request multiplier is published there for Opus 5.5, Sonnet 5.5, GPT-6.1 Sol, GPT-6 Luna or current Gemini models. Legacy examples are Opus 4.8 **27x**, Sonnet 4.6 **9x**, Gemini 3 Pro **6x**; Auto discounts eligible usage by **10%**. These are not prices for the requested newer models. [Legacy billing and multipliers](https://docs.github.com/en/copilot/reference/copilot-billing/request-based-billing-legacy/model-multipliers-for-annual-plans).

Current default-tier USD per million tokens:

| Model | Input | Cached input | Cache write | Output |
| --- | ---: | ---: | ---: | ---: |
| Claude Opus 5.5 | 4 | 0.20 | 5 | 20 |
| Claude Sonnet 5.5 | 2 | 0.10 | 2.50 | 10 |
| GPT-6.1 Sol | 2 | 0.10 | 2.50 | 10 |
| GPT-6 Luna | 0.10 | 0.01 | 0.125 | 0.50 |
| Gemini 3.7 / 3.8 Flash | 0.75 | 0.075 | n/a | 3.75 |
| Gemini 4 Argon | 2 | 0.10 | n/a | 10 |

Flash promotional rates end 2026-12-31; Argon promotion ends 2026-12-01. Long-context tiers can cost more. [Official rates](https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing). Auto gives paid users a 10% model-cost discount in CLI and other supported surfaces, not unlimited work. [Auto selection](https://docs.github.com/en/copilot/concepts/models/auto-model-selection).

**Budget interpretation:** USD 25/100 of *additional usage* buys 2,500/10,000 credits. If these are *total individual monthly budgets*, Pro at USD 10 plus USD 15 additional usage gives 3,000 credits including its current 1,500-credit allowance; Max at USD 100 includes 20,000 credits. Pro+ at USD 39 includes 7,000. Taxes, purchasing policy and changing flex allotments must be checked. [Individual plans and allowances](https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing).

**Illustrative arithmetic, not measured tasks:** A model call with 100k uncached input + 10k output, no cache write, costs USD 0.40 on Sonnet 5.5/Sol 6.1, USD 0.80 on Opus 5.5, USD 0.015 on Luna, and USD 0.1125 on Flash. USD 25 of usage therefore covers about 62/31/1,666/222 such calls; USD 100 covers 250/125/6,666/888. An agent task can make many calls and incurs cache-write/read costs, so these are not task quotas. These calculations use the rate table above; rounding is downward.

**Practical recommendation:**

- Confirm the actual **Copilot** plan, billing model and whether USD 25-100 includes the seat. ChatGPT Business is unrelated. Copilot Business/Enterprise include 1,900/3,900 credits per seat pooled at the billing entity; do not substitute individual-plan allowances. [Organization billing](https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing).
- Start with Auto and normal context/reasoning, inspect a week's actual work, then reserve costly models for difficult investigations. Set organizational/user spending controls; CLI session credit limits are a **public-preview soft limit**, so one in-flight response may overshoot. [Session limits](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/set-session-limit).
- Inspect `/usage` for session/per-model usage and GitHub's billing/usage dashboard for allowances and charges; `/context` measures context occupancy rather than your monthly budget. [CLI usage reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference).

**Dla trenera:** Zastąp tabelę nowych mnożników tabelą kosztów tokenów; najpierw ustal, czy budżet obejmuje licencję i jaki plan firma faktycznie kupiła.

### 5. Can a long Codex task resume automatically after the five-hour limit?

**Direct answer:** Goals continue an unfinished objective across turns, but **Codex 0.162.1 does not automatically reactivate a usage-limited Goal at the quota reset**. Its source marks `UsageLimitExceeded` as `usage_limited`, clears active continuation, and offers a resume prompt when that session is reopened. No reset-time wake-up was found in the inspected Goal implementation. Weekly/account limits can still block work after a five-hour reset.

Goals are **stable and enabled by default** in the pinned release (`Feature::Goals`, `Stage::Stable`, `default_enabled: true`). Use a saved session and `/goal <measurable objective>`; `/goal` opens management, `/goal pause`, `/goal resume`, and `/goal clear` control it. A Goal needs observable completion criteria, constraints and a blocked condition. Do not teach an experimental enabling flag as necessary in 0.162.1. A persisted objective is not an operating-system scheduler.

App automations are now documented as **Scheduled tasks**: they can run in an existing chat or start independent runs. Local-project tasks need the computer on, the desktop app running and the folder available. A scheduled follow-up can continue work, but it does not guarantee quota availability or bypass limits. Worktree/local execution must follow the repository's policy.

**Practical recommendation:**

- For the workshop, define a narrow Goal and use `/goal resume` after the actual reset. Do not promise automatic overnight recovery just because the Goal feature is stable.
- For unattended continuation, the simplest auditable alternative is **one scheduled ordinary continuation turn** after the observed reset time plus a small margin. Record absolute UTC time and the exact saved session ID; Windows Task Scheduler can launch a script that enters the correct checkout and runs the command below. Do not use `--last`, an infinite retry loop, disabled approvals or an automatic switch to paid API billing.
- Put a process lock, timeout, maximum attempts, logs, stop-on-completion condition and repository-state checks around that command. A normal `exec resume` prompt continues the task; it is **not proof of reactivating the persisted Goal's status**. The command syntax was checked with local help; actual quota exhaustion, timer execution and this team's app account behavior are **UNCONFIRMED**.

Example command template, with an explicit UUID to be substituted:

```bash
codex exec resume 00000000-0000-0000-0000-000000000000 "Continue only the approved task from its saved checkpoint; verify completion, stop on blockers, and do not push or deploy."
```

Sources: [Goals guide](https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex), [stable feature in 0.162.1](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/features/src/lib.rs#L1822), [usage-limit transition](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/ext/goal/src/runtime.rs#L243), [error handling](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/ext/goal/src/extension.rs#L404), [resume prompt](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/tui/src/app/thread_goal_actions.rs#L79), [Scheduled tasks](https://learn.chatgpt.com/docs/automations?surface=app); local `codex exec resume --help`.

**Dla trenera:** Goal podtrzymuje pracę między turami, ale reset limitu jej sam nie wznawia; pokaż ręczne wznowienie i osobno omów jednorazowy harmonogram.

### 6. Project skills in Codex 0.162.1 and Copilot CLI

**Direct answer:** Codex 0.162.1 still reads **both `.codex/skills` and `.agents/skills`**, through different discovery paths. "Only `.agents/skills` works" is false for this pinned source.

`roots_from_layer_stack` adds `<project config folder>/skills` for `ConfigLayerSource::Project`; that folder is `.codex`. Separately, `repo_agents_skill_roots` discovers `.agents/skills` between the project root and current directory. The pinned test `layer_roots_preserve_scope_precedence_and_disabled_projects` explicitly expects `repo/.codex/skills` and `repo/nested/.codex/skills`, including a disabled project layer. Do not infer skill trust/authorization semantics merely from whether a config layer is trusted. User `$CODEX_HOME/skills` is explicitly deprecated-but-compatible; `~/.agents/skills` is also read.

Copilot's documented project directories are **`.github/skills`, `.claude/skills`, `.agents/skills`**; personal locations are `~/.copilot/skills` and `~/.agents/skills`. `.codex/skills` is not a documented Copilot discovery location. The Copilot CLI v1.0.88 changelog confirms `.agents/skills` support. Unlike Codex, an equivalent public CLI loader implementation was not verified; the broader list is a documentation claim, not a source-code assertion about its closed implementation.

**Practical recommendation:**

- Use `.agents/skills/<name>/SKILL.md` for a shared Codex + Copilot CLI repository skill; avoid duplicate copies that drift. Keep Copilot-specific material in `.github/skills` only when it needs a separate workflow.
- Existing `.codex/skills` can be migrated deliberately rather than declared broken. Verify discovery with each client's skill listing and explicitly invoke the skill in a fresh session; do not assume directory existence proves activation.

Sources: [pinned Codex loader](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/ext/skills/src/host_roots.rs#L75), [pinned loader tests](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/ext/skills/src/host_roots_tests.rs#L245), [Copilot skill directories](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills), [Copilot v1.0.88 changelog](https://github.com/github/copilot-cli/blob/v1.0.88/changelog.md).

**Dla trenera:** Wspólne skills umieszczaj w `.agents/skills`; wyjaśnij, że `.codex/skills` nadal działa w sprawdzonej wersji Codex.

### 7. Scope creep, excessive defensive code and endless reviews

**Direct answer:** Explicit acceptance criteria, a named change boundary and a finite review contract address this better than a personality switch. This is supported by vendor instruction guidance; no controlled evidence was found that one wording or setting guarantees smaller patches.

Codex exposes `model_verbosity = "low"` for supported models. It controls answer detail, not a maximum code size or number of files. The current reference describes `personality` as deprecated: `friendly`/`pragmatic` no longer select a style, while `none` omits a built-in section. Do not promise that `personality = "pragmatic"` fixes overengineering. Support/effect of verbosity on every selectable model is **UNCONFIRMED**.

**Practical recommendation:**

- Put concrete scope rules in `AGENTS.md`, with acceptance criteria and the allowed files in the task prompt. Permit necessary tests and genuine boundaries; a blanket ban on error handling can remove real protection.
- For reviews, request one pass over an immutable diff, high-confidence P0/P1 issues only, at most five findings and evidence per finding. Define P1 as a defect requiring prompt correction due to material security, data or functional impact. Permit zero findings. After repairs, check affected behavior and regressions; reopen broad review only when new evidence warrants it. The numeric cap is a reporting limit, not proof that all defects were found.
- Copilot repository instructions belong in `.github/copilot-instructions.md` or scoped `.github/instructions/*.instructions.md`. GitHub's review service cannot guarantee arbitrary comment formatting, overview edits or merge blocking from instructions. Keep technical severity/scope rules there; treat an exact finding cap as a local review prompt/consumer contract, not a guaranteed hosted-review setting. The old 4,000-character cutoff was removed in June 2026.

**Copy-ready snippet 1: minimal implementation contract** (`AGENTS.md`; task supplies the actual acceptance criteria and file boundary):

```text
Implement only the stated acceptance criteria using the smallest coherent change.
Reuse existing patterns. Add abstractions, configuration or dependencies only when required by those criteria.
Do not add unrelated refactors, speculative features or defensive branches for states excluded by an enforced invariant.
Handle real failures at the relevant boundary and test the agreed observable behavior.
If another production file outside the task's named boundary is necessary, explain the dependency before expanding scope.
Stop after the required checks pass. Report changed files, verification and any remaining limitation in at most five bullets.
```

**Copy-ready snippet 2: bounded local review prompt** (replace `BASE`/`HEAD` with actual immutable revisions):

```text
Review BASE..HEAD once. Do not edit files.
Read affected call sites and tests only as needed to verify a suspected regression.
Report at most five distinct, high-confidence P0/P1 defects introduced by this diff, ordered by impact.
For each give severity, path:line, triggering conditions, concrete impact and supporting evidence in at most 80 words.
Exclude style, speculative future scenarios, optional abstractions and pre-existing defects.
Do not invent findings to fill the limit. If none qualify, say "No qualifying findings."
State material coverage limits separately. Stop after the report; do not begin another review or fix cycle.
```

Sources: [Codex configuration](https://learn.chatgpt.com/docs/config-file/config-reference), [Copilot instruction guidance and unsupported controls](https://docs.github.com/en/copilot/tutorials/customize-code-review), [4,000-character limit removal](https://github.blog/changelog/2026-06-12-copilot-code-review-new-configurations-and-controls/).

**Dla trenera:** Ćwicz kryteria akceptacji, granice zmiany i jeden przegląd z progiem istotności; samą zwięzłością odpowiedzi nie ograniczysz ilości kodu.

### 8. SSD writes from worktrees versus clones

**Direct answer:** A linked worktree shares Git's object database automatically, but normally materializes another checkout, its own index/metadata and any generated files. A network clone also downloads/writes a separate object store. Local clones may hardlink objects, so "every clone duplicates all history physically" is not universally true. Neither worktrees nor clones imply fresh Maven dependency downloads if they use the same existing local repository.

| Written or retained data | Linked worktree behavior |
| --- | --- |
| Tracked checkout | Another set of ordinary working files; changing branches can rewrite differing files. Sharing packed Git objects does not deduplicate these files. |
| Build output | Per-checkout `target/`, generated sources, test reports and temporary files are rewritten by actual build commands. Repeated clean builds can dominate writes. |
| Maven artifacts | Normally one user-level `.m2/repository`; custom `maven.repo.local`/settings can change this. Concurrent installs of identical SNAPSHOT coordinates can cause cross-branch contamination; sharing needs compatible locking. |
| IDE data | Import/index work and project caches may be repeated. The exact locations, physical duplication and write volume depend on IDE/version/settings and require measurement. |

**Illustrative calculation, not this team's measurement:** With 2 GB of tracked files, 5 GB of build output and 1 GB of additional IDE cache per workspace, four extra fully used workspaces add roughly **32 GB** of logical data writes/storage, plus repeated build churn. A hypothetical independent network clone with 3 GB of history adds another 3 GB per clone. This does not measure SSD NAND writes, compression, copy-on-write savings or drive lifespan; actual SSD TBW/endurance is **UNCONFIRMED** without the drive specification and counters.

**Practical recommendation:**

- Use the existing checkout sequentially unless parallel isolation is actually needed; this repository requires approval for new worktrees. Keep a bounded number, avoid importing every worktree into an IDE, remove completed owned worktrees and delete only verified disposable build output. Do not wipe the shared Maven cache routinely: re-downloads create more writes.
- For a large monorepo, pilot sparse checkout for only the affected modules, retaining parent POMs and dependencies needed by the build. It reduces materialized files, not necessarily stored Git history. Share downloaded Maven artifacts, but serialize conflicting installs or use appropriate Resolver locks/isolation for mutable artifacts.
- Windows Dev Drive uses ReFS. Block cloning is documented from **Windows 11 24H2 / Server 2025** and can make supported copy operations metadata-only with copy-on-write. It is not a guarantee that `git worktree add` uses block cloning: Git may expand objects into new files. This does not automatically apply inside WSL's ext4 filesystem. SSD-write reduction for their Git/IDE/build workload remains **UNCONFIRMED**; measure before migration.

Sources: [Git worktrees](https://git-scm.com/docs/git-worktree), [local clone object sharing](https://git-scm.com/docs/git-clone), [sparse checkout](https://git-scm.com/docs/git-sparse-checkout), [Maven default local repository](https://maven.apache.org/guides/getting-started/index), [Resolver shared access and locks](https://maven.apache.org/resolver/local-repository.html), [Microsoft Dev Drive and block cloning](https://learn.microsoft.com/en-us/windows/dev-drive/).

**Dla trenera:** Najpierw ogranicz liczbę równoległych checkoutów i pełnych buildów; worktree współdzieli historię Git, ale nie usuwa kosztu plików roboczych ani indeksowania IDE.
