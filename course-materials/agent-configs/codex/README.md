# Codex configuration examples

The main [`config.toml`](config.toml) includes the Claude-to-Codex permission
examples: automatic approval review, filesystem read/write/deny profiles, and
public network access by default. Command allow/approval/deny rules are in
[`rules/course.rules`](rules/course.rules).

| File | Use |
|---|---|
| [`config.toml`](config.toml) | Complete example with permissions and existing model/provider/MCP settings |
| [`permissions.toml`](permissions.toml) | Minimal permissions-only example with the same five profiles |
| [`rules/course.rules`](rules/course.rules) | Curated `allow`, `prompt` and `forbidden` command examples |
| [`examples/claude-command-parity.rules`](examples/claude-command-parity.rules) | Inactive literal comparison with the original Claude Bash permissions |
| [`PERMISSIONS.md`](PERMISSIONS.md) | Mapping, deliberate differences, installation requirements and validation evidence |

## Copy into a project

From the training repository root, after reviewing the settings, merge
`course-materials/agent-configs/codex/config.toml` into the target project's
`.codex/config.toml`, and copy the curated rule file to
`.codex/rules/course.rules`. Project configuration and rules load only for a
trusted project. For user-wide settings, the corresponding destinations are
`~/.codex/config.toml` and `~/.codex/rules/course.rules`.

When updating an existing configuration, merge the selected settings rather than
overwriting your model/provider choices. Remove legacy `sandbox_mode` and
`[sandbox_workspace_write]` settings from all active layers so the new file
profiles can take effect. Restart Codex and inspect `/permissions` and `/status`.
Do not install the inactive literal comparison together with the curated rules.

The default `course-workspace` profile permits workspace editing and public
network access, while denying named environment files and secrets. Logs and the
training configuration examples remain available. `course-root` is an equivalent
named preset for the course root. Other examples cover workspace review
(`course-review`), writes limited to `docs/` (`course-docs`), and an optional
restriction to the two JetBrains hosts (`course-jetbrains`). Only one profile is
selected for a session. Automatic review handles eligible approval requests;
it does not review every already-permitted network call.

Tool results stored in history have a 4000-token budget. Search logs with bounded
`rg`/`grep` results or small excerpts; filesystem permissions do not implement a
Read-tool-only ban. See the mapping guide for examples and platform limits.
