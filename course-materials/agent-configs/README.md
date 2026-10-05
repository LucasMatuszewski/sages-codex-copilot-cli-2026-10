# Agent config examples

Example configurations for the agents used in the course. The repository root holds only basic settings (permissions, sandbox, MCP servers). Provider profiles and sub-agents live here: copy the ones you need and adapt them. Writing your own sub-agent from one of these is a course exercise.

Each folder has the shape of that tool's own config folder.

| Folder | What it holds | Where it goes |
|---|---|---|
| `codex/` | `config.toml` (user-level example), provider profiles `<name>.config.toml` for Ollama, OpenRouter and Z.ai with `models.zai.json`, sub-agents in `agents/` | `~/.codex/` for the config and the profiles; `.codex/agents/` in your project for the sub-agents |
| `claude/` | `settings.json` (and a commented `settings.jsonc`), `CLAUDE.md`, `statusline.sh`, sub-agents in `agents/`, `mcp-jetbrains.json` (JetBrains MCP server for a default Windows install of IntelliJ IDEA 2025.3.3; set the path of your own IDE) | `~/.claude/` for settings, `CLAUDE.md` and the status line; `.claude/agents/` in your project for the sub-agents |
| `copilot/` | start scripts with allowed and denied tools, a custom agent in `agents/` | run the script from the repository root; `.github/agents/` in your project for the agent |
| `opencode/` | `opencode.jsonc` with a default model and MCP servers | `~/.config/opencode/` or your project root |

## Codex profiles

Codex reads profile files only from `~/.codex/`. Copy them there, then choose one:

```bash
cp course-materials/agent-configs/codex/*.config.toml course-materials/agent-configs/codex/models.zai.json ~/.codex/
```

```bash
codex --profile ollama-lfm
```

Check the `model:` and `provider:` lines Codex prints at startup: a profile name without a file is not an error, Codex just runs the default model.

## Sub-agents

- TypeScript and Node.js: `claude/agents/be-developer.md`, `fe-developer.md`, `qa-engineer.md`; `codex/agents/frontend-nextjs-developer.toml`, `e2e-qa-engineer.toml`.
- Java and Spring Boot: `claude/agents/java-be-developer.md` (short) and `java-be-developer-long.md`, `java-fe-developer.md`, `java-qa-engineer.md`; `codex/agents/java-springboot-developer.toml`.
- Code review in Copilot: `copilot/agents/CodeReview.agent.md`.

To use one, copy it into your project (`.claude/agents/`, `.codex/agents/` or `.github/agents/`), replace the stack-specific parts (build tool, test runner, framework) with yours, and adjust the list of skills to the ones you have installed.
