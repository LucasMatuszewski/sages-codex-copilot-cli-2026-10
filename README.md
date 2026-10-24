## Aktualizacja 24.10.2026

- Poprawione odnośniki do sekcji checklist i działanie bez zapisu ustawień w przeglądarce.
- Wyszukiwanie w słowniku rozwija pasujące pojęcia; karty mają niezależną wysokość.
- Ściąga do pracy z agentem ma czytelniejsze odnośniki i wersję do druku.
- Doprecyzowane planowanie, podział plików, dobór modeli i sprawdzanie zużycia.
- [Materiały szkoleniowe i prezentacje](https://devpowers.com/szkolenia/sages/sygnity-05-10/).

# UPDATE 22.10.2026: Plan Mode, Codex cache, MiMo and Polish dictation

- **CRA application PoC:** implementation is on [`codex/cra-poc-implementation`](https://github.com/LucasMatuszewski/sages-codex-copilot-cli-2026-10/tree/codex/cra-poc-implementation). An internal web app for recording vulnerability findings, reviewing them in a table or Kanban, and preparing editable reporting drafts.
- **Implementation-planning skill:** [`write-implementation-plan` — PR #28](https://github.com/EdukeyTeam/agent-toolbox/pull/28). A training example, pending a merge decision.
- **Plan Mode may be removed from Claude Code:** [Thariq's post](https://x.com/trq212/status/2102813194196758746) says the team is considering removing the mode and using Shift+Tab to adjust effort. This is a proposal, not an announced removal date. In our workflow, planning instructions can live in Skills; the post does not cite Skills usage as the reason for this proposal.
- **Codex cache no longer expires for logged-in users:** [Thibault Sottiaux's announcement](https://x.com/thsottiaux/status/2112712984644784534) says Codex and Work keep cache indefinitely, including when resuming old conversations. Reusing cached context may reduce usage charged against limits and costs; this does not mean the whole conversation is free. The same post describes a separate 12-hour API cache window, not indefinite API retention.
- **Shell configs and MiMo:** the [agent-configs library](course-materials/agent-configs/README.md#shell-aliases-and-mimo) now contains `.bashrc-agents`, `claude-backends.ps1` and `codex-aliases.ps1`. Use `claude-mimo` / `ccm` for the MiMo Token Plan backend. Older copies directly under `course-materials/` have moved here.
- **Polish and Polish-accented English dictation:** [reviewed Handy / Canary 1B v2 research](course-materials/Research/speech-to-text-models-polish-handy.md). Canary is the practical starting recommendation from local trials; the note separates observations from verified benchmarks and explains how to compare models on your own voice.

# UPDATE 16.10.2026: jFTP repository, Codex on Windows, aliases, hooks and Agent Toolbox

**jFTP application repository:** [LucasMatuszewski/jftp-gr2](https://github.com/LucasMatuszewski/jftp-gr2). Most of the course code was implemented there, and I continued it after the workshop:

- `master`: Windows 11 startup protected by 26 characterization tests, RepoMaps, full and compressed Repomix packs, a source-checked code graph, architecture views with rendered diagrams, the current-functionality PRD, retrospective ADRs and a proposed modernization plan. It also has a Maven `pom.xml` security-review hook. The [README](https://github.com/LucasMatuszewski/jftp-gr2#readme) links all of these documents.
- [PR #1, visual update](https://github.com/LucasMatuszewski/jftp-gr2/pull/1) (branch `codex/sygnity-ui-refresh`): a refreshed Swing UI with Sygnity branding, before/after screenshots, 29 passing tests and desktop QA evidence. Treat it as an example and a source of ideas, not a finished design.

**Fixing Codex on Windows (CLI and desktop app):** [Codex Windows sandbox troubleshooting](course-materials/Research/codex-windows-sandbox-troubleshooting-2026-10-15.md). It covers:

- updating the background daemon after a CLI update (`codex app-server daemon update --from-cli --yes`, and what to do when `install.lock` times out);
- why you may get 7-15 UAC prompts in a row (`network_proxy` enabled only in the project config);
- why `gh`, screenshots and GUI tests fail inside the sandbox;
- why resumed sessions keep their old permissions.

Upstream reports: [openai/codex#54440](https://github.com/openai/codex/issues/54440), [openai/codex#54441](https://github.com/openai/codex/issues/54441). Keep `[features] network_proxy = true` in `~/.codex/config.toml`, not in a project config.

**Codex aliases:** [course-materials/agent-configs/.bashrc-agents](course-materials/agent-configs/.bashrc-agents) (bash, WSL, Git Bash) and [course-materials/agent-configs/codex-aliases.ps1](course-materials/agent-configs/codex-aliases.ps1) (PowerShell; dot-source it from `$PROFILE`). Copy the profile files from [agent-configs/codex](course-materials/agent-configs/codex/) to `~/.codex/` first.

```bash
cdxz                      # codex --profile zai (GLM via Z.ai Coding Plan)
cdxor                     # codex --profile openrouter
cdxoc / cdxlfm / cdxsql   # Ollama profiles: cloud model, small local model, text-to-SQL
cdxauto                   # codex --approve-for-me (auto-review instead of manual approvals)
cdxro "explain this repo" # read-only sandbox for safe exploration
cdxwt                     # new session in a managed Git worktree
cdxlast                   # codex resume --last
cdxnd                     # run without the shared background daemon
```

`cdxyolo` (`--dangerously-bypass-approvals-and-sandbox`) disables both the sandbox and approvals. Use it only inside an isolated VM or container.

**Hooks:** [course-materials/hooks-example](course-materials/hooks-example/README.md) contains one `block-secrets.sh` script that works unchanged as a pre-tool hook in Codex (`.codex/hooks.json`, approved once with `/hooks`), Claude Code and Copilot CLI. It blocks reads of `.env`, `secrets/`, SSH keys and `.pem` files. Test it without an agent:

```bash
echo '{"toolName":"bash","toolArgs":{"command":"cat .env"}}' | bash course-materials/hooks-example/block-secrets.sh; echo "exit $?"   # exit 2 = blocked
```

The jFTP repository also uses a hook that gates edits of `pom.xml` behind a security review. More realistic hook examples for Codex and Claude Code will follow in a separate update.

**Agent Toolbox:** our public skill collection at [EdukeyTeam/agent-toolbox](https://github.com/EdukeyTeam/agent-toolbox), for example `write-agents-md`, `write-prd`, `write-adr`, `legacy-codebase-workflows` and `cloudflare-safe`. Open pull requests:

- [#24 atlassian-onprem-safe](https://github.com/EdukeyTeam/agent-toolbox/pull/24): Bitbucket, Jira and Confluence Server / Data Center through safe wrapper scripts. The token and base URL stay in a local file, so the agent never sees them. Still being validated against real servers before merge.
- [#23 write-agents-md](https://github.com/EdukeyTeam/agent-toolbox/pull/23): detailed Manual QA steps and the "mock only from a fresh real response" rule in the AGENTS.md templates.

**More research from group 2:**

- [Local LLM routing: Anthropic Messages vs OpenAI Responses](course-materials/Research/local-llm-routing-messages-vs-responses-2026-10-16.md)
- [Codex Git checkpoint refs](course-materials/Research/codex-git-checkpoints-2026-10-16.md)
- [Codex custom commands vs Claude Code](course-materials/Research/codex-custom-commands-vs-claude-2026-10-16.md)
- Windows Dev Drive as a native alternative to WSL, in [Course Notes](course-materials/Course%20Notes%20-%20AI%20in%20Programming.md)

**Matt Pocock videos with analysis:** "Why software factories fail" and "Fixing the pull request bottleneck". My [NotebookLM notebook](https://notebooklm.google.com/notebook/32cdb78a-bb6a-4934-98f8-a25057ebb605) holds both videos with notes and analysis.

# UPDATE: Angular AI chat demo and jFTP implementation

This example Angular chat app lives in the [Vercel AI SDK repository](https://github.com/vercel/ai/tree/e0fdae62c4ecb980c40e17d3fe87bacce7d14c1f/examples/angular). The demo setup was created 100% in ChatGPT Voice mode on 8 October 2026, by cloning, configuring, building and running the existing upstream example. The original application source was written by the Vercel AI SDK contributors.

We created the branch [`angular-ai-chat-voice-mode-demo`](https://github.com/LucasMatuszewski/sages-codex-copilot-cli-2026-10/tree/angular-ai-chat-voice-mode-demo) for this demo. See [the demo instructions and saved model configuration patch](https://github.com/LucasMatuszewski/sages-codex-copilot-cli-2026-10/blob/angular-ai-chat-voice-mode-demo/course-materials/angular-ai-chat/README.md) to reproduce it. The chat uses Ling 3.1 Flash (Free) through Vercel AI Gateway, with the API key kept on the Express server.

The jFTP implementation code is available in [Lucas Matuszewski's fork, on the `main` branch](https://github.com/LucasMatuszewski/jftp-modernization/tree/main). It includes RepoMap, Repomix, context7-local with local RAG, and basic application updates to run jFTP on Windows 11.

# Codex i GitHub Copilot CLI - warsztat Java (Sages / Sygnity)

5-8 i 13-16 października 2026, 09:00-17:00 czasu polskiego, Zoom, własne komputery. Pracujemy przede wszystkim w OpenAI Codex, a wyniki porównujemy z GitHub Copilot CLI. Pierwszego dnia poznajemy [jFTP autorstwa Sai Pullabhotli](https://github.com/sai-pullabhotla/jftp), istniejący klient FTP/FTPS z interfejsem Swing. Na kolejnych dniach dokumentujemy ten sam kod, naprawiamy start i rozwijamy jedną uzgodnioną zmianę.

- [Strona szkolenia i materiały](https://devpowers.com/szkolenia/sages/sygnity-05-10/)
- [Pełna agenda](AGENDA.md) - zachowany program źródłowy; aktualne godziny to 09:00-17:00.
- [Ćwiczenie jFTP](course-materials/java/README.md)
- [Slajdy i biblioteka promptów](course-materials/slides/README.md)

## Dwa repozytoria

To repozytorium zawiera materiały kursowe i instrukcje. Kod aplikacji pobierz osobno, do sąsiedniego katalogu:

```bash
git clone https://github.com/sai-pullabhotla/jftp.git
```

Pracuj w katalogu `jftp`, zgodnie z jego własnymi plikami i ustaleniami zespołu. Jeśli potrzebujesz odtwarzalnego punktu startowego, użyj rewizji `14e62ceba4e371c2a0b955604b10f065f46f4f7d`. Własny fork przyda się do wysyłania gałęzi i PR, ale nie jest warunkiem rozpoczęcia pracy lokalnej. PRD funkcji i ADR-y tworzycie w repozytorium aplikacji podczas warsztatu, po ustaleniu zakresu zmiany.

Nie zakładaj, że projekt od razu się zbuduje lub uruchomi. Najpierw zbierz dowody o kodzie, zależnościach i środowisku; potem zaplanuj najmniejsze potrzebne kroki. Kompilacja, testy i uruchomienie okna Swing są osobnymi wynikami, które trzeba udokumentować. Do prób używaj wyłącznie lokalnych danych syntetycznych, bez połączenia z cudzym serwerem FTP i bez prawdziwych danych uwierzytelniających.

## Biblioteka dodatkowa

`course-materials/` zawiera slajdy, prompty, konfiguracje narzędzi i archiwalne przykłady. Są pomocami do wyboru, nie wymaganiami aplikacji ani konfiguracją do automatycznego włączenia. Przykładowych PRD i ADR nie przenoś bez sprawdzenia do jFTP. Przed oddaniem pracy przejrzyj diff, wyniki poleceń i nierozstrzygnięte pytania.

Trener: Łukasz Matuszewski · [LinkedIn](https://www.linkedin.com/in/lukaszmatuszewski/) · [X](https://x.com/mrLumatic)
