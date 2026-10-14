# Mapping Claude permissions to Codex

Prepared on 2026-10-14 from the two Claude policies in this training repository.
The adjacent `jftp-gr2` checkout had no `.claude/` or `.codex/` configuration;
the adjacent `jftp/.claude/settings.json` contained hooks rather than permissions.

## Files and sources

| File | Purpose |
|---|---|
| [`../claude/settings.json`](../claude/settings.json) and [`settings.jsonc`](../claude/settings.jsonc) | General Claude example: command allowances, command denials, environment files and secrets |
| [`../../../.claude/settings.json`](../../../.claude/settings.json) | Root policy: additionally denies deletion, logs and archived agent examples; asks about worktrees |
| [`permissions.toml`](permissions.toml) | Standalone, annotated Codex filesystem/network profiles |
| [`rules/course.rules`](rules/course.rules) | Curated command policy with allow, approval and denial examples |
| [`examples/claude-command-parity.rules`](examples/claude-command-parity.rules) | Inactive, literal mapping of every Bash allow/deny in the general Claude example |
| [`../../../.codex/config.toml`](../../../.codex/config.toml) and [`course.rules`](../../../.codex/rules/course.rules) | Root Codex configuration and command policy |

The Claude root and general example differ. The general JSON has no `ask` list;
the root asks about `git worktree add`, its `git -C` form, `EnterWorktree` and
`Agent(isolation:worktree)`. Neither policy supplies a general file-write prompt
list. `plansDirectory`, `statusLine` and the `pom.xml` hooks are separate features
and are outside this permissions conversion.

## Command mapping

Codex uses TOML configuration and Starlark `.rules` files. For command prefixes,
the decision mapping is `allow` -> `allow`, `ask` -> `prompt`, and `deny` ->
`forbidden`; overlapping rules choose `forbidden` before `prompt` before `allow`.
An `allow` rule authorizes execution **outside the sandbox**. This is why blindly
translating Claude's broad allowances would change the protection they provide.
Rules are experimental. [Official rules documentation](https://learn.chatgpt.com/docs/agent-configuration/rules).

```python
# Literal syntax example from Bash(git status:*):
prefix_rule(pattern=["git", "status"], decision="allow")
# Approval example from the root worktree policy:
prefix_rule(pattern=["git", "worktree", "add"], decision="prompt")
# Denial example from Bash(git push:*):
prefix_rule(pattern=["git", "push"], decision="forbidden")
```

The curated policy preserves routine execution within the sandbox and requests
review for escalation. Its small outside-sandbox allow examples are `pwd` and
`whoami`. The comparison file retains every original command allowance for study,
including broad interpreters and package managers; install only rules you have
reviewed for the intended environment.

| Claude commands | Curated Codex behavior when escalation is evaluated | Reason for the mapping |
|---|---|---|
| `cat`, `ls`, `find`, `grep`, `echo`, `wc`, `head`, `tail`, `diff` | `prompt`; adds `rg` | Outside-sandbox reads could access denied files; `find` can execute commands and `echo` can participate in redirection |
| `pwd`, `whoami` | `allow` | Narrow teaching examples |
| `which`, `date`, `export` | `prompt` | Flags and shell behavior need inspection; `export -p` dumps variables |
| `git status/log/diff/show/branch/stash list` | `prompt` for escalation | Repository inspection normally stays in the sandbox |
| `git add/commit/checkout/switch/restore/fetch/merge/rebase` | `prompt` | Protected Git metadata, possible changes to work and network access |
| `npm install/run/test/audit`, `npx`, `pnpm install/run/test` | `prompt` | Scripts and dependencies execute code |
| `tsc`, `eslint`, `prettier`, `jest`, `vitest`, `next`, `turbo`, `tsx`, `node` | `prompt` | Project-controlled code and files remain subject to the sandbox |
| `python`, `python3`, `pip install`, `uv`, `pytest` | `prompt` | Interpreter and dependency access |
| `docker ps/logs/inspect/images` | `prompt` | A daemon can expose host data and environment values |
| `env`, `printenv` | `forbidden` | Avoid blanket environment dumps |
| `git push`, including `--force`; `git reset --hard` | `forbidden` for the shown token prefixes | Preserve explicit publishing and destructive-reset denials |
| `chmod`, `chown`, `sudo`, `curl`, `wget`, `ssh`, `scp` | `forbidden` | Preserve source denials |
| `docker run/rm/rmi`, `docker-compose down` | `forbidden`; adds `docker compose down` | Preserve denials with the modern Compose spelling |
| Root `rm`, `rmdir` | `forbidden` | Present in the root source, absent from the general source |
| Root worktree creation | `prompt`, including `git -C ...` via the broad Git prompt | Ask about directory creation and checkout changes |
| `yarn install/run` | `forbidden` in curated rules; literal allowance in comparison | Shared machine instructions require pnpm |
| Blanket `git add -A/--all/.`, `npm install -g/--global` | `forbidden` for the shown prefixes | Shared machine instructions require explicit staging and pnpm for global installs |
| Maven/Java and Windows executable spellings | Additional `prompt` examples | Relevant to these Java workshops; no build is run by this conversion |

The source comments label several broad allowances as safe or non-destructive.
Those labels do not constrain the program's arguments: `node -e`, Python, `npx`,
package install hooks, Git restore/rebase and Docker inspect deserve their own
assessment. The curated changes above are deliberate; the literal comparison
makes every original Bash entry inspectable.

### Prefix and shell limits

Patterns match argument positions, not command substrings or arbitrary glob
tokens. `["git", "push"]` does not match `git -C . push`; the curated broad Git
prompt catches this form for review. Likewise `git reset HEAD --hard` does not
match the exact destructive-reset prefix. A `*` string would be a literal token.
Aliases, absolute executable paths, `git.exe` spellings and reordered options
need explicit consideration. The curated rules cover selected `.exe` names;
they are not an exhaustive command firewall.

Simple supported POSIX shell chains can be split for evaluation; complex scripts
may remain one wrapper invocation. Windows cmdlets such as `Get-Content` and
`Remove-Item` are commonly embedded in a PowerShell script. Listing a cmdlet as
an executable prefix would not protect every such script. The curated wrapper
rules ask for review; inspect the entire script before approving it. An approved
wrapper can perform operations which direct command rules deny. [Shell wrapper
behavior](https://learn.chatgpt.com/docs/agent-configuration/rules#shell-wrappers-and-compound-commands).

## File reads, writes and approvals

File boundaries belong in beta permission profiles, with exact paths or deny-read
globs. `course-workspace` inherits `:workspace`, preserving its protected config
and Git paths. `course-root` adds the root Claude exclusions. Recursive scans are
bounded at 12 levels in these examples; deeper matches and newly created paths
need platform validation. [Official permission profiles](https://learn.chatgpt.com/docs/permissions).

| Claude file setting or teaching case | Codex setting in these examples |
|---|---|
| `Edit`, `Write`, `MultiEdit` | Workspace writes inherited by `course-workspace` |
| `Read(.env)`, named local/dev/prod/test files | Exact `"deny"` entries under `filesystem.":workspace_roots"` |
| `Read(**/.env)` | Recursive deny glob; also includes nested named variants |
| `Read(**/secrets/**)` | Exact root `secrets` denial plus recursive subtree glob |
| Root `Read(**/logs/**)` | Added by `course-root` |
| Root `Read(course-materials/agent-configs/**)` | `course-root` denies that subtree |
| Root `Read(.env.example)` allowance | Exact `"read"` entry; the synthetic template remains inspectable |
| Demonstrate a read-only file | `".env.example" = "read"`: writes need additional permission |
| Demonstrate workspace review | `course-review` sets workspace `"." = "read"` |
| Demonstrate selected writes | `course-docs` additionally sets `"docs" = "write"` |

The root profile intentionally excludes the archived example folder, matching
the root Claude policy. Select `course-workspace` for a session analyzing those
examples. Review/docs profiles retain writable temporary directories from their
parent; they restrict persistent workspace changes rather than every temp write.

`approval_policy = "on-request"` and `approvals_reviewer = "user"` make boundary
crossings eligible for human review. They do not ask before every workspace edit.
`approval_policy = "never"` removes the prompt path; it does not grant additional
access. A profile `"deny"` is a sandbox restriction, not a Claude-style tool-wide
ban on every possible approved escalation. An approved command can run with
different access. [Approval and sandbox behavior](https://learn.chatgpt.com/docs/agent-approvals-security).

`.git`, `.agents`, `.codex` and `.aws` under writable roots remain protected by the
inherited workspace policy. Changes to them can require approval. Environment
files, subprocess environment variables, outputs, Git history and daemon APIs
are different ways to obtain data; denying one file path does not erase copies
or credentials already inherited by a process. Optional environment filtering
uses `[shell_environment_policy]`, `ignore_default_excludes = false` and
`filters = { "*TOKEN*" = "exclude", "*SECRET*" = "exclude", "*KEY*" = "exclude" }`;
adapt it to required tools. [Configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).

## Network and web tools

The default profiles disable command network access. `course-jetbrains` permits
the two hosts from Claude's `WebFetch`: `blog.jetbrains.com` and
`www.jetbrains.com`. Its domain entries require the sample's
`features.network_proxy = true`. Unknown hosts are not allowlisted.
Direct `curl`/`wget` remain denied by the curated command rules, as in the source;
this network profile is useful for other sandboxed HTTP clients and does not
overrule a forbidden command.

Claude's `WebSearch` maps conceptually to Codex's separate hosted web-search
capability; the standalone sample enables cached search. This command domain
allowlist does not restrict hosted search, page-opening tools, MCPs, connectors
or browser/computer use. `tools.web_search.allowed_domains` filters search
results and is not a universal `WebFetch` permission equivalent. There is no
claim of exact tool-for-tool parity. [Network scope](https://learn.chatgpt.com/docs/permissions#what-the-network-proxy-does-not-control).

## Choose and load the examples

1. Use [`config.toml`](config.toml) for the complete Codex course configuration,
   including these file profiles and human approvals, or merge the minimal
   [`permissions.toml`](permissions.toml) example into your own configuration.
   Remove active `sandbox_mode`, `[sandbox_workspace_write]` and `--sandbox`
   overrides from **every loaded layer** when selecting permission profiles;
   otherwise the legacy settings win. The root config now uses `course-root`.
2. To change the default profile, set `default_permissions` to `course-workspace`,
   `course-root`, `course-review`, `course-docs` or `course-jetbrains`. These are
   permission profiles, distinct from model/provider `--profile` presets.
3. Put curated rules under the intended trusted project's `.codex/rules/` or
   the user's `~/.codex/rules/`. The root project already has its copy. Trust
   decisions belong to the user; restart Codex after changing rules. A user-level
   rule file affects other projects too. Do not copy the inactive comparison
   alongside the curated rules: both files would be evaluated.
4. Check the effective permission mode and writable roots in `/permissions` and
   `/status`. User/provider/managed layers can change the result. Existing active
   sessions do not acquire a new policy merely because a file was edited.

Native Windows must use a sandbox implementation capable of enforcing the chosen
profile. The legacy `unelevated` sandbox cannot enforce denied read paths; use a
supported `elevated` setup, MXC where supported, or WSL. This PC's known sandbox
launch failures are a separate prerequisite. Escalating commands to work around
those failures does not demonstrate enforcement of these file restrictions.
[Windows sandbox documentation](https://learn.chatgpt.com/docs/windows/windows-sandbox).

## Inspect rule decisions without executing the target

From the training repository root, in Bash or PowerShell:

```text
codex execpolicy check --pretty --rules .codex/rules/course.rules -- pwd
codex execpolicy check --pretty --rules .codex/rules/course.rules -- git worktree add ../example
codex execpolicy check --pretty --rules .codex/rules/course.rules -- git push --force origin main
codex execpolicy check --pretty --rules .codex/rules/course.rules -- git -C . push
codex execpolicy check --pretty --rules course-materials/agent-configs/codex/examples/claude-command-parity.rules -- python -c pass
```

Expected decisions are `allow`, `prompt`, `forbidden`, `prompt`, `allow`.
These checks do not execute `git`, Python or worktree creation. The last example
shows why the broad literal mapping is a teaching artifact. Unmatched commands
have no explicit rule decision and still go through Codex's normal handling.
Do not interpret "no matching rule" as permission to run outside the sandbox.

## Validation evidence (2026-10-14)

- Source repository refreshed by fast-forward to `0498a5c`; permission inputs were unchanged.
- Python `tomllib` parsed the root config, general example and standalone permission example.
- Codex CLI `0.162.1` loaded each config in an isolated temporary `CODEX_HOME` with
  `codex features list`. No user configuration, authentication or installed settings were changed.
- `codex execpolicy check` passed 35 decision cases for each curated policy copy and
  all 72 Bash entries from the general Claude JSON: **142 successful checks**.
  This also loads and validates the rules' inline `match` / `not_match` examples.
- Relative documentation links, agreement between root/reusable policy copies,
  config line endings and `git diff --check` passed.
- No target command, dependency install, application build, agent session or sandbox
  enforcement probe was run. Native sandbox enforcement and effective policy
  across the user's real config layers remain unverified; the known Windows
  sandbox launch failure was not reproduced.
