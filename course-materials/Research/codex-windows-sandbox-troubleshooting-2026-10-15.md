# Codex CLI on Windows: daemon updates, sandbox loops and ignored escalations

*Field report, 15-16 October 2026. Codex CLI 0.162.1 (standalone installer) with the app-server daemon, Windows 11 Enterprise 25H2 (build 26200.9448) on a Windows 365 Cloud PC, Entra ID account without local admin rights. Evidence comes from the local session files (`~/.codex/sessions/**/rollout-*.jsonl`), the log database (`~/.codex/logs_2.sqlite`), the sandbox log (`~/.codex/.sandbox/sandbox.<date>.log`) and the openai/codex source and issue tracker.*

Use this when Codex on Windows shows repeated UAC prompts, says "token invalid" for tools that work in your own terminal, or keeps failing commands although it "asked for escalation".

## 1. Architecture you need to know

Since about 0.160, the Codex CLI is a **client**. Agents run in a separate **app-server daemon**, and each command runs in its own sandboxed process:

```
codex (TUI client) --unix socket--> codex app-server --managed-daemon --> per-command sandbox helpers
                                    codex app-server daemon pid-update-loop (auto-updater)
```

- The CLI and the daemon are **versioned separately**. `codex app-server daemon version` prints both (`cliVersion`, `appServerVersion`).
- State lives in `CODEX_HOME` (`~/.codex`): `packages/app-server-daemon/` (daemon releases), `app-server-daemon/` (pid files), `app-server-control/app-server-control.sock`.

## 2. Updating the daemon after a CLI update

```powershell
codex app-server daemon update --from-cli --yes   # copy the CLI build into the daemon and pin it
codex app-server daemon version                   # cliVersion and appServerVersion must match
```

**Problem seen:** `Error: timed out waiting for daemon installer lock ...\packages/app-server-daemon\install.lock`.

**Cause (from source, `codex-rs/app-server-daemon/src/install_lock.rs`):** on Windows the lock file is opened exclusively (`share_mode(0)`), polled every 50 ms, and abandoned after 30 s. A long-running `codex app-server daemon pid-update-loop` process from the old version kept the handle open. `daemon stop` stops the server but **not** that updater process.

**Fix:**

```powershell
codex app-server daemon stop
Get-CimInstance Win32_Process -Filter "Name='codex.exe'" | Select-Object ProcessId, CommandLine
Stop-Process -Id <pid of the 'pid-update-loop' process only>
codex app-server daemon update --from-cli --yes
codex app-server daemon start
codex app-server daemon version
```

`--from-cli` pins the daemon to your CLI build and switches off the auto-updater.

## 3. Windows sandbox backends in 0.162

| Backend | How it isolates | Notes |
|---|---|---|
| `elevated` (default fallback) | Runs commands as separate local users `CodexSandboxOffline` / `CodexSandboxOnline`, with firewall (WFP) rules and ACLs | Setup needs UAC (`codex-windows-sandbox-setup.exe`). Sandbox users have **no access to your Credential Manager or interactive desktop**. |
| `unelevated` | Restricted token | **Cannot enforce deny-read rules.** With a profile that denies `.env*`/`secrets`, Codex refuses to start: `windows unelevated restricted-token sandbox cannot enforce deny-read restrictions directly; refusing to run unsandboxed`. |
| MXC (`[features] prefer_mxc = true` or `[windows] sandbox = "mxc"`) | Microsoft Execution Containers (AppContainer-style), no admin setup | Needs Windows 11 24H2 26100.9278+ or 25H2 26200.9278+. Works on a Windows 365 Cloud PC. Deny-read was verified to work. Open problems: `EPERM realpath` on the profile root (breaks `pnpm dlx`/Node tooling), no cursor/desktop control (`SetCursorPos` -> error 5, issue #53650), path issues (#53786, #53765). |

Quick checks:

```powershell
codex -c windows.sandbox=mxc sandbox --include-managed-config --permission-profile :workspace -- cmd.exe /d /c echo MXC_OK
# deny-read probe: use a throwaway folder with a dummy file, never a real .env
mkdir sandbox-probe; Set-Content sandbox-probe\.env "DUMMY=not-a-secret"
codex sandbox --permission-profile <your-profile> -- cmd.exe /d /c type sandbox-probe\.env   # must fail with "access denied"
Remove-Item -Recurse sandbox-probe
codex doctor                                                                   # look for "sandbox backend"
```

## 4. Symptom: 7-15 UAC prompts for codex-windows-sandbox-setup.exe

**Cause:** the sandbox log shows the stored firewall configuration flipping between two values:

```
sandbox setup required: offline firewall settings changed (stored_ports=[], desired_ports=[3128, 8084])
sandbox setup required: offline firewall settings changed (stored_ports=[3128, 8084], desired_ports=[])
```

- The project `.codex/config.toml` enabled `[features] network_proxy = true`, so project threads want proxy ports `[3128, 8084]`.
- Daemon background threads (working directory `~/.codex`) do not load the project config, so they want `[]`.
- Every flip triggers a full elevated setup, which means one UAC prompt. Subagents and resumed sessions make it worse because each thread checks on its own.
- Parallel setups collide. That produces `orchestrator_helper_incomplete: setup helper exited successfully before setup completed` and `failed to grant ... ACE on user profile ... used by another process (os error 32)`.

You can confirm it by decoding the base64 argument shown in the UAC dialog ("Show more details"). It is the setup payload, including `proxy_ports` and `command_cwd`.

**Fix:** keep `network_proxy` consistent across all layers. Either remove it from the project config or enable it in the user config. A one-time prompt after a Codex upgrade (setup marker version change) is expected.

## 5. Symptom: tools work in your terminal but not in Codex (`gh`, desktop, screenshots)

- `gh` stores its token in Windows Credential Manager under **your** account. Inside any Codex sandbox (`elevated` sandbox user, or MXC container) the token is not visible, so `gh auth status` reports "The token in default is invalid" and `gh pr list` returns HTTP 401.
- GUI QA is blocked the same way. Under `elevated`, `Graphics.CopyFromScreen` fails with "The handle is invalid" and Java tests that need a desktop fail. Under MXC, `SetCursorPos` fails with error 5 and the token reports `TokenIsAppContainer = 1`.

The intended path is escalation: the model sends `"sandbox_permissions":"require_escalated"`, the reviewer (`approvals_reviewer = "auto_review"` or you) approves, and the command runs outside the sandbox. An exec-policy rule can pre-approve it (see the caveat below):

```
# ~/.codex/rules/default.rules
prefix_rule(pattern=["gh", "auth", "status"], decision="allow")
prefix_rule(pattern=["gh", ["pr", "issue", "run", "repo"], ["view", "list", "diff", "checks", "status"]], decision="allow")
```

**Caveat:** with a permission profile that contains deny-read entries (such as `.env*`/`secrets` blocks), 0.162.1 keeps filesystem enforcement even for approved or `allow`-matched commands, and rejects escalation when no suitable sandbox is available (see `agent-configs/codex/PERMISSIONS.md`). Approval or rules therefore cannot restore Credential Manager or desktop access for such a profile. When a tool needs your real account, use a profile without deny-read entries or the unrestricted workaround in section 6.

Check a rule with `codex execpolicy check --rules ~/.codex/rules/default.rules -- gh pr view 1`. When several rules match, **the most restrictive decision wins**, so a catch-all `prompt` rule for `gh` overrides narrower `allow` rules.

## 6. What actually went wrong: escalation silently ignored (0.162.1)

The session files showed:

- 74 of 79 commands in one session requested `require_escalated` with a justification.
- The auto-review model logged reviews (`codex_guardian_v2 ... reviewing approval ... reason=FreshRequired`) **only while the daemon was 0.160.0**. After the switch to 0.162.1, 39 further escalation requests produced no review, no prompt and no approval event.
- Those commands still ran, **inside the sandbox**: `user.home = C:\Users\CodexSandboxOffline`, `TokenIsAppContainer = 1`, and gh traffic went through the sandbox network proxy (`codex.network_proxy.policy_decision ... api.github.com`). This also happened for `gh auth status`, which matched an `allow` rule.

How to inspect your own sessions:

```powershell
# find the session file
Get-ChildItem $env:USERPROFILE\.codex\sessions -Recurse -Filter "*<thread-id>*"
# escalation requests are inside the code-mode "exec" tool input
Select-String -Path <rollout.jsonl> -Pattern 'require_escalated' | Measure-Object
```

```python
# guardian reviews in the log DB (read-only)
import os, pathlib, sqlite3
home = pathlib.Path(os.environ.get("CODEX_HOME", pathlib.Path.home() / ".codex"))
c = sqlite3.connect((home / "logs_2.sqlite").as_uri() + "?mode=ro", uri=True)
c.execute("select ts, feedback_log_body from logs where target like '%guardian%'").fetchall()
```

**Workaround until it is fixed upstream:** temporarily disable the sandbox and rely on approvals. The `.env`/`secrets` deny rules are then **not** enforced.

```toml
# ~/.codex/config.toml
sandbox_mode = "danger-full-access"
# project .codex/config.toml (when it uses permission profiles)
default_permissions = ":danger-full-access"
```

### What `danger-full-access` still checks

`[windows] sandbox` only selects the backend (`elevated`, `unelevated`, `mxc`); it has no "off" value. What happens when you remove it depends on legacy feature flags, managed requirements and MXC preference: on the machine in this report it fell back to `unelevated`, while a clean 0.162.1 install may resolve to no Windows backend at all. Check the effective backend with `codex doctor` (`sandbox backend`) instead of assuming. The sandbox is turned off only through `sandbox_mode = "danger-full-access"` or the `:danger-full-access` permission profile. Approval is a separate setting (`codex-rs/core/src/exec_policy.rs`). With `approval_policy = "on-request"`:

| Command | Behavior without the sandbox |
|---|---|
| Ordinary command | Runs without a prompt |
| Flagged as dangerous (destructive deletes, hard resets) | Prompt, answered by the reviewer (auto-review or you) |
| Matches a `prompt` / `forbidden` rule | Prompt / blocked |

`approval_policy = "untrusted"` is retired in 0.162.1: the config loader rejects it with `approval_policy = "untrusted" is no longer supported; remove this setting`. To get a review for specific commands without the sandbox, add `prefix_rule(..., decision="prompt")` rules for them. `--yolo` (`--dangerously-bypass-approvals-and-sandbox`) disables both the sandbox and approvals.

### Resumed sessions keep their old permissions

A thread stores its permission profile when it is created. After you change `config.toml`, **resumed sessions still use the old profile**. Only new sessions pick up the change.

Picking **Full Access** with `/permissions` in a resumed thread also failed. The thread showed `active_permission_profile: ":danger-full-access"` and `approval_policy: never`, but it kept the 12 deny-read entries for `.env*`/`secrets` and only added `root: write`. Because deny entries remained, the profile still counted as restricted, so Codex started the elevated sandbox. That sandbox then tried to grant itself write access on `C:\`, which a non-admin user cannot do:

```
setup refresh: processed 1 write roots ...; errors=["write ACE failed on C:\: open ACL target for update"]
Failed to create unified exec process: helper_unknown_error: setup refresh had errors
failed to load AGENTS.md instructions for environment `local`: fs sandbox helper failed ... setup refresh had errors
```

**Fix:** start a new session after a permission change, and carry the context over with a short summary. Also note that "Full Access" in that menu sets `approval_policy = never`, which is effectively YOLO.

## 7. FAQ

**Is this caused by Entra ID or the Windows 365 VM?**
Not for the main problems. The UAC loop comes from inconsistent `network_proxy` configuration, and the ignored escalation is Codex logic; neither depends on the account type. MXC was tested and works on the Cloud PC. Entra ID does show up elsewhere (user SIDs `S-1-12-1-...`; see issue #43354 about setup-marker ACLs on domain accounts), and a non-admin account makes every elevated setup a visible UAC prompt. Those make the symptoms more visible, but they are not the root cause.

**Why did other participants not see this?**
The combination was specific: Windows-native Codex with the daemon pinned to 0.162.1, a custom permission profile with deny-read rules, `network_proxy` enabled only at project level, auto-review approvals, and subagent-heavy resumed sessions that need the real desktop and `gh`. A default setup (no project-level proxy flag, no GUI QA, or Codex in WSL/macOS) avoids most of it.

**It worked before. What changed?**
The CLI/daemon update from 0.160.0 to 0.162.1. It changed the sandbox setup marker, which forced re-provisioning, and in this setup escalation stopped reaching the reviewer.

**Will WSL work better?**
For CLI work, most likely yes. The Linux sandbox is a different implementation (Landlock/bubblewrap): no sandbox Windows users, no UAC, no MXC, no Credential Manager. `gh` in WSL has its own login (`~/.config/gh`). The Codex desktop app can also run its agent in WSL. Limits:
- Whether the ignored-escalation bug also affects Linux was **not verified**.
- QA of a **Windows** Swing desktop app has to happen on Windows. WSLg runs the Linux JVM, which is a different runtime and look-and-feel.

## 8. Checklist

1. `codex app-server daemon version`: versions match?
2. `codex doctor`: sandbox backend, startup warnings, MCP paths. A WSL path such as `/mnt/c/...` in a Windows-native config cannot be resolved.
3. Repeated UAC prompts: grep `sandbox setup required` in `~/.codex/.sandbox/sandbox.<date>.log`.
4. "Token invalid" or desktop errors: run the same command in `codex sandbox ...`. If it fails only there, it is the sandbox identity. Then check whether escalation actually happened (section 6).
5. Report upstream with the CLI Bug template, `codex doctor --json` (review it for personal data first) and thread IDs.

## Sources

- openai/codex source: `codex-rs/app-server-daemon/src/install_lock.rs`, `codex-rs/prompts/templates/permissions/approval_policy/on_request_rule_request_permission.md`
- Reported from this investigation: #54440 (escalation ignored, resumed-thread Full Access), #54441 (UAC loop from proxy_ports flip)
- Issues: #53650 (Computer Use under MXC 0x80070005), #53786, #53765, #50915 (MXC), #40217, #30445, #43354 (sandbox setup marker / ACL)
- Codex config docs: "Windows sandbox mode" (`prefer_mxc`), learn.chatgpt.com/docs/config-file/config-basic
