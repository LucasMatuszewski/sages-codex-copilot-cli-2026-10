# Code-graph tools vs Aider repo map and Repomix (research 14.10.2026)

Question from Sages group 2 (14.10.2026): how do code-graph tools for agents (heard as "opengraf", "grafity", "codebase memo mcp") compare with Aider's repo map and Repomix for large legacy Java codebases? Web research delegated to OpenCode/GLM-5.3, then key facts re-checked by the trainer's orchestrating agent on 14.10.2026: GitHub stars, licenses, creation and push dates via the GitHub API, the GitNexus LICENSE file (PolyForm Noncommercial 1.0.0), and the abstracts of arXiv:2606.22417 and arXiv:2603.27277. Labels: [official] = project's own docs/README; [community] = independent blog/list/discussion; [vendor claim] = number produced by the tool's maker; [research] = preprint/paper; [anecdote] = unverified individual report.

Related course material: [legacy-repository-analysis.md](legacy-repository-analysis.md) and the `legacy-codebase-workflows` skill in [Edukey Agent Toolbox](https://github.com/EdukeyTeam/agent-toolbox).


## 1. Identifying "opengraf", "grafity", "codebase memo mcp"

### Direct answer

| Heard name | Most likely real tool | Confidence |
|---|---|---|
| "codebase memo mcp" | **codebase-memory-mcp** (DeusData) | High |
| "grafity" | **Graphify** (Graphify-Labs) - or **Graphiti** (Zep); both are real, famous, and phonetically close; see reasoning | Medium (two credible candidates) |
| "opengraf" | **UNCONFIRMED** - no notable code-graph tool is named "OpenGraf"; best candidates are **Opengrep** (Semgrep fork, phonetically near-identical but a SAST tool, not a code graph) or a garbled **Graphify/graf**. Open question for the trainer. | Low |

### "codebase memo mcp" -> codebase-memory-mcp

* **Pick:** https://github.com/DeusData/codebase-memory-mcp - ~46.6k stars, MIT license, latest release **v0.11.0 (2026-09-15)**, maintainer: DeusData organization. Description: "High-performance code intelligence MCP server. Indexes codebases into a persistent knowledge graph ... 158 languages, sub-ms queries, 99% fewer tokens. Single static binary, zero dependencies." [official]
* **Reasoning:** near-exact phonetic and semantic match ("memo" ~ "memory"), and it is one of the most-starred "code graph MCP" tools as of Oct 2026, exactly matching the trainer's context (a compact map of a big repo for Claude Code/Codex-class agents).
* Candidates considered and rejected: none serious - no other prominent "codebase memory" MCP exists at comparable visibility.

### "grafity" -> Graphify (primary) or Graphiti (alternative)

* **Primary pick: Graphify** - https://github.com/Graphify-Labs/graphify - **~126.5k stars** (the most-starred tool in this category), Apache-2.0, created 2026-04-03, default branch `v8`, packaged on PyPI as `graphifyy`; maintainer: **Safi Shamsi / Graphify Labs** (YC S26 batch; has a paid Graphify Cloud at app.graphify.com). Latest tagged release date: UNCONFIRMED (ships via PyPI/`v8` branch; API shows pushes on 2026-10-14). [official]
  * Reasoning: the trainer's framing was "code graph tools to give coding agents a compact map of a big repository". Graphify's one-liner is exactly that ("Turn any codebase ... into a queryable knowledge graph. A /graphify skill for Claude Code, Cursor, Codex, and Gemini CLI") and it became the category's breakout tool in April-October 2026 (launched off a Karpathy tweet, 12k stars in 48 h per an Ask HN post; Rust rewrites like `graf` and Graphicle now exist because of it). [community: HN threads, see Sources] "Grafity" is also a very common by-ear/typo spelling of "Graphify" (the PyPI package itself is `graphifyy`, and community posts misspell it constantly).
* **Alternative: Graphiti** - https://github.com/getzep/graphiti - ~31.8k stars, Apache-2.0, latest release **v0.30.2 (2026-09-08)**, maintainer: **Zep (getzep)**. [official]
  * Reasoning to prefer it instead: phonetically, "grafity" ~ "gra-FIT-ee" is nearly a perfect match for *Graphiti*, while Graphify ends in "-fy". If the trainer's list came from an "agent memory / knowledge-graph" conversation rather than a repo-map conversation, Graphiti is the intended tool.
  * **Why I still rank Graphify first:** Graphiti is *not* a codebase-mapping tool. It is a general temporal-knowledge-graph framework for agent memory (episodes -> entities/facts in Neo4j/FalkorDB, LLM-driven extraction). It cannot index a Java repo out of the box. In a talk about giving agents a map of a large Java codebase, Graphify is the tool that fits; Graphiti would be the odd one out. Both are documented in section 2 so either interpretation can be used.
* Candidates considered and rejected: **Graphite** (stacked-PR code review tool, no "open"/repo-map match), **graf / ctxrs/graf** (Rust rewrite of Graphify - plausible only if the trainer heard about it via Graphify), **Graphicle** (Rust port of Graphify), **Microsoft GraphRAG** (document corpus summarization, different category), **GitNexus** (no phonetic match).

### "opengraf" -> UNCONFIRMED

Searches performed: DuckDuckGo (`opengraf code tool`, `"opengraf" MCP`, `knowledge graph codebase MCP`), GitHub repository search (`opengraf` - 14 repos, all irrelevant: OpenGraffiti, a "Graf Open Library", an open Scion VCS clone "opengraft"), HN Algolia full-text search (`opengraf` - nothing in the coding-agent space). **No notable tool for code graphs is named "OpenGraf".** Candidates ranked:

1. **Opengrep** - https://github.com/opengrep/opengrep - community fork of Semgrep (from Semgrep 1.100.0, LGPL-2.1, repository created 2024-12-14; "most advanced open source SAST engine"). [official + community comparisons at semgrep.dev FAQ, endorlabs.com, aikido.dev] Phonetically "Opengrep" is almost exactly what a listener would write as "opengraf" (p/f confusion by ear). **But it is static analysis / pattern matching, not a code graph or repo map** - if this is the match, the trainer mixed categories.
2. **OpenGraph (HKUDS)** - https://github.com/HKUDS/OpenGraph - "OpenGraph: Towards Open Graph Foundation Models" (EMNLP 2024). Exact name match, but it is a graph-foundation-model research project for graph ML, not a codebase tool.
3. **A garbled Graphify/"graf"/"open-source graphify"** - given the other two names in the list are code-graph MCP tools, "opengraf" may simply be "open" + "graf(fy)" misremembered, or the trainer conflating Opengrep with the graph tools discussed the same day.
4. **OpenGrok** (oracle/opengrok) - the classic Java source-code search/cross-reference browser used on huge Java legacy codebases; contextually plausible for this audience, but phonetically weaker ("grok" vs "graf"). Not verified further.

**Recommendation:** treat "opengraf" as unresolved and confirm the source of the name; the workshop can cover it as either Opengrep (SAST) or fold it into the Graphify demo.

### Wrong assumptions flagged

* The brief assumes all three heard names are "code graph" tools. "opengraf" likely is not one (probably Opengrep, a SAST engine) - or is a misheard Graphify.
* "grafity" is genuinely ambiguous between two very different tools (Graphify = codebase map; Graphiti = agent-memory KG framework). Covering both is safer than picking one.

## 2. How each tool builds and exposes its representation

### Aider repo map - https://github.com/Aider-AI/aider (~49.5k stars, Apache-2.0, latest release v0.86.0 2025-08-09, maintainer Paul Gauthier / Aider-AI; note: last push to the repo was 2026-05-22 - development has visibly slowed) [official]

* **Representation:** tree-sitter parses each file to an AST; definitions and references are extracted via per-language `tags.scm` queries (modified from upstream tree-sitter grammars, incl. `tree-sitter-java`). A file-level dependency graph is built (files are nodes, references create edges) and a **graph ranking algorithm (PageRank-style)** selects which identifiers to show under a token budget. No LSP, no embeddings, no SCIP, no database. [official: aider.chat/2023/10/22/repomap.html]
* **Output:** a static, textual "repo map" (classes/methods/signatures with tree-sitter line excerpts) injected into the chat context each request. Not a file, not queryable - purely prompt context.
* **Java:** first-class via tree-sitter-java (signatures, definitions/references); no type resolution. Aider supports many languages through `py-tree-sitter-languages` / tree-sitter-language-pack. [official]
* **Incremental:** recomputed as needed; cached parse data per file. Nothing persisted across sessions beyond cache.
* **Storage:** local, in-process only. **Install:** `pip install aider-chat`. **Maturity:** very high (49.5k stars, since 2023), but release cadence has slowed (last release Aug 2025).

### Repomix - https://github.com/yamadashy/repomix (~28.8k stars, MIT, latest release v1.18.1 2026-09-21, maintainer Kazuki Yamada / yamadashy) [official]

* **Representation:** none structural by default - it **packs** files into one AI-friendly artifact (XML/Markdown/JSON/plain) with directory structure, file summaries, metrics, token counts. Optional `--compress` uses **tree-sitter** to strip implementations and keep signatures/structure (experimental). No graph, no embeddings. [official: repomix.com/guide/code-compress]
* **Output:** static text file (`repomix-output.xml` etc.), plus an **MCP server** (`repomix --mcp`, experimental) exposing tools: `pack_codebase`, `pack_remote_repository`, `read_repomix_output`, `grep_repomix_output`, and (in `--sandbox` mode) `file_system_read_file` / `file_system_read_directory`. [official: repomix.com/guide/mcp-server]
* **Java:** any text packs fine; compression quality for Java is tree-sitter-grammar-dependent - UNCONFIRMED beyond "tree-sitter based".
* **Incremental:** none - snapshot by design (can go stale). Watch mode re-packs on file change. **Storage:** local file; **privacy caution:** the packed file is typically pasted into a chat service, which sends the whole repo off-machine.
* **Install:** `npx repomix@latest` / npm / Homebrew / Docker. Security: Secretlint-based secret detection, git-config execution hardened in v1.18.1 (GHSA-4p5g-gh74-q524). **Maturity:** high, active (pushed 2026-10-11).

### codebase-memory-mcp (CBM) - DeusData [official README]

* **Representation:** vendored tree-sitter grammars (**162 languages**) -> persistent knowledge graph of functions, classes, imports, routes, channels + typed edges (`CALLS`, `IMPORTS`, `DEFINES`, `IMPLEMENTS`, `INHERITS`, `HTTP_CALLS`, cross-repo `CROSS_*`). A **Hybrid LSP layer adds semantic type resolution for Java, Kotlin, Python, TS/JS, PHP, C#, Go, C, C++, Perl**. Embeddings are bundled (Nomic `nomic-embed-code`, int8) - no API key. BM25 via SQLite FTS5. Pure-C backend, single static binary, in-memory SQLite, LZ4, Cypher-like queries. [official]
* **Output / MCP tools:** 17 MCP tools, including `get_architecture` (routes/hotspots/dependencies/clusters/cycles), `search_graph` (structural + `semantic_query` vector search), `search_code` (graph-augmented grep), `trace_path`, `detect_changes` (git-diff -> affected symbols + risk), `find_dead_code`, `manage_adr`, `system_structure`, `index_repository`, `index_status`, Cypher query tool. Plus CBM Lens local web UI (graph visualization, local chat). [official; tool sample corroborated by community article codex.danielvaughan.com]
* **Java:** strong on paper - tree-sitter + Hybrid LSP type resolution explicitly lists Java. [official]
* **Incremental:** `auto_index`, git-based background watcher (`auto_watch`, `watcher_enabled`), `detect_changes` maps uncommitted diffs to symbols. **Storage:** local SQLite under `~/.cache/codebase-memory-mcp`; no network calls ("nothing phones home"); optional local-only browser model download. [official]
* **Install:** single binary via install.sh / install.ps1; auto-configures 45 agent client surfaces (Claude Code, Codex, OpenCode...). Windows note: PowerShell execution policy and a documented Microsoft Defender false positive (`Trojan:Script/Wacatac.B!ml`). **Maturity:** 46.6k stars, 4,177 commits, v0.11.0, SLSA-3 + OpenSSF scorecard, arXiv preprint - young but heavily engineered.

### Graphify - Graphify-Labs [official README, v8]

* **Representation:** local **tree-sitter AST** parsing for ~40 languages (deterministic, no LLM for code); cross-file edges `calls`/`imports`/`inherits`/`mixes_in`; **every edge tagged `EXTRACTED` vs `INFERRED`**; **Leiden community detection** clusters subsystems; "god nodes" = highest-degree concepts. Docs, PDFs, images, video optionally get an LLM semantic pass (your assistant's model or a configured key: Gemini/Claude/OpenAI/DeepSeek/Ollama/Bedrock). **No vector store.** [official]
* **Output:** three static artifacts in `graphify-out/` (`graph.html` interactive map, `GRAPH_REPORT.md`, `graph.json`) + CLI queries (`graphify query/path/explain`); integrates as a **skill** (`/graphify .`) for Claude Code, Codex, OpenCode, Copilot CLI, Cursor, Gemini CLI and 20+ others; optional MCP server extra (`graphifyy[mcp]`); optional Neo4j/FalkorDB push; PreToolUse hooks (Claude Code/Gemini) + AGENTS.md rules steer agents to query the graph instead of grepping. [official]
* **Java:** parsed via the ~40-language tree-sitter tier; `.graphifyrc` can pin ambiguous extensions. Exact Java edge quality: UNCONFIRMED beyond "cross-file links via tree-sitter".
* **Incremental:** `/graphify <path> --update` re-extracts only changed files; AST cache; `graphify hook install` auto-rebuilds on commit/checkout; `graphify update .` after `git pull`. [official]
* **Storage:** local-first; code never leaves the machine (`--code-only` runs fully offline); query log in `~/.cache/graphify-queries.log`; **Graphify Cloud** (paid, 14-day trial) is the always-on cross-repo tier - that one is a cloud service. [official]
* **Install:** Python 3.10+ and uv/pipx, `graphify install` auto-detects assistants (explicit Windows support incl. winget for uv). **Maturity:** 126.5k stars but only ~6 months old (created 2026-04), v8 branch, YC-backed company - expect churn; community already reports slow queries on large repos (motivating the `graf` Rust fork). [community: HN]

### Graphiti - Zep [official README]

* **Representation:** **not a code parser.** LLM+embedding-driven extraction of entities/facts/episodes into a temporal knowledge graph; bi-temporal validity windows, provenance, incremental updates without full recomputation; hybrid retrieval (semantic + BM25 + graph traversal). Backends: Neo4j 5.26+, FalkorDB, Amazon Neptune; Kuzu deprecated. Needs an LLM API key (default OpenAI; Anthropic/Gemini/Groq/Ollama possible); structured-output-capable models strongly recommended. [official]
* **Output:** Python/TS SDKs, REST service (FastAPI), and an **MCP server** (`mcp_server/`) with episode management (add/get/delete), entity & relationship management, semantic/hybrid search, group management, graph maintenance. [official]
* **Java:** N/A - it ingests text/JSON you feed it; it would not map a Java codebase without custom ingestion. Using it for code means shipping source or summaries to an LLM per ingestion.
* **Incremental:** core feature (episodes invalidate facts, no batch recomputation). **Storage:** external graph DB (self-hosted or Neptune); Zep's hosted "Context Graph Engine" is the commercial cloud. **Install:** `pip install graphiti-core` + Neo4j/FalkorDB (Docker typical) + API key - the heaviest setup in this list. **Maturity:** 31.8k stars, arXiv paper (2501.13956), active company; as a *codebase map* it is the wrong shape, as *agent memory* it is mature.

### Secondary candidates (for completeness)

* **GitNexus** - https://github.com/abhigyanpatwari/GitNexus - ~47.9k stars, **PolyForm Noncommercial 1.0.0** (Warning: not free for commercial use), created 2025-08, pushed 2026-10-14, maintainer: individual (abhigyanpatwari), npm `gitnexus`. TypeScript/Node; tree-sitter native parsing + optional local embeddings (transformers/onnxruntime, opt-in); LadybugDB embedded graph store; Leiden clustering; **19 MCP tools** (17 per-repo: `query` BM25+semantic+RRF, `context`, `impact`, `trace`, `detect_changes`, `rename`, `cypher`, `route_map`, `tool_map`, `api_impact`, `pdg_query` taint/PDG, etc.) + MCP resources + prompts + agent skills + Claude Code/Codex hooks; `analyze --watch` incremental with debounce; Spring Boot Actuator + AsyncAPI enrichment (Java-friendly); web UI; optional Render cloud deploy (~$35/mo). Latest release tag: UNCONFIRMED. [official README]
* **code-graph-rag** - https://github.com/vitali87/code-graph-rag - ~5.3k stars, MIT, maintainer vitali87. Tree-sitter -> **Memgraph** (Docker) under one schema; optional compiler-grade frontends (libclang, go/types, Roslyn, **javac**, Jedi) layer exact facts on top; runtime trace merging (`cgr trace`, eBPF); natural-language -> Cypher; AST surgical patching; ast-grep structural search; MCP server; realtime-updates guide. Java: "fully supported" + opt-in javac frontend. Needs Python 3.12+, Docker, cmake, ripgrep. [official README]
* **CodeGraphContext** - https://github.com/CodeGraphContext/CodeGraphContext - ~4.3k stars, MIT, v0.5.1, maintainer Shashank Shekhar Singh. MCP server + CLI; tree-sitter for 23 languages (Java included) + optional **SCIP** indexers for precision (scip-clang needs `compile_commands.json`, scip-dotnet for C#; no Java SCIP); embedded FalkorDB Lite/KuzuDB default, Neo4j optional; `cgc watch` live updates; pre-indexed `.cgc` bundles; GCF output format claims ~62% tool-response token reduction. [official README]
* **Serena** (mentioned as LSP alternative) - https://github.com/oraios/serena - ~30.3k stars, non-standard license (NOASSERTION per GitHub API), oraios. Symbol-level semantic retrieval/editing toolkit over language servers; no graph DB. Java language-server support: UNCONFIRMED (not verified in this pass). [official metadata only]

## 3. Aider repo map and Repomix specifics

### Aider repo map (all [official: aider.chat/docs/repomap.html + blog 2023/10/22/repomap.html])

* **Pipeline:** tree-sitter (via py-tree-sitter-languages, since Oct 2023 replacing ctags) parses each file -> `tags.scm` queries extract **definitions and references** -> files become nodes of a graph, references create dependency edges -> a **graph ranking algorithm (PageRank-style)** scores identifiers -> the map shows only the highest-ranked definitions, rendered as signature excerpts with `:...` elisions.
* **Token budget:** `--map-tokens`, **default 1k tokens**. Aider dynamically resizes the map per chat state - usually within budget, but expands significantly when no files have been added to chat and it must convey the whole repo.
* **What the LLM gets:** every file listed with its key classes/methods/signatures; benefits stated: (1) often enough context to use a module's API from the map alone; (2) the model can pick which files to ask to see, and aider `/add`s them.
* **Selection logic:** "the most important identifiers, the ones most often referenced by other portions of the code" - i.e., referenced-ness drives ranking, then budget truncation.
* **Java:** tree-sitter-java is one of the credited grammars; map includes Java class/method signatures. No type resolution - the map is syntactic.

### Repomix (all [official: repomix.com guides])

* **Packing:** `npx repomix@latest` -> `repomix-output.xml` (or `--style markdown|json|plain`) containing metrics (top files by size), directory tree, and file contents; respects `.gitignore`; `--include`/`--ignore` fast-glob patterns (`repomix --include "src/**/*.ts,**/*.md"`); `repomix.config.json` for persistent settings; `--remote user/repo` packs remote GitHub repos (branches/commits); Docker image; Chrome extension; GitHub Actions; token counting per file and per repo.
* **`--compress` (experimental):** tree-sitter extraction that "preserves function/method signatures, interface/type definitions, class structures" and removes implementations, loops/conditionals, internal variables - docs cite **~70% token reduction** (vendor claim). Per-file pattern rules in config (`output.patterns` with per-pattern `compress` / `directoryStructureOnly`).
* **Token counting:** per-file and whole-pack counts surfaced in output metrics "useful for LLM context limits".
* **Security:** Secretlint scan leaves out files matching credential formats; v1.18.1 fixed GHSA-4p5g-gh74-q524 (crafted repo `.git/config` could execute commands via git `log`/`diff`).
* **MCP server (experimental):** `repomix --mcp` (optionally `--sandbox` confining to a workspace with read-only tools). Tools: `pack_codebase`, `pack_remote_repository`, `read_repomix_output` (line-range partial reads), `grep_repomix_output` (RegExp + context lines), `file_system_read_file`, `file_system_read_directory`. Docs note compression is "generally not needed since `grep_repomix_output` allows incremental content retrieval".
* **Incremental updates:** none by design (snapshot); watch mode re-packs.

## 4. Evidence of benefit (code-graph tools vs plain grep/ripgrep)

**Independent-measurement tier is thin.** The most citable independent evidence is a June 2026 preprint, and a practitioner blog that audits vendor numbers. No neutral head-to-head "graph MCP vs ripgrep" benchmark with absolute numbers surfaced in this research.

1. **Bhola et al., "Code Isn't Memory: A Structural Codebase Index Inside a Coding Agent" (arXiv:2606.22417, June 2026)** - [research, independent of the MCP tool vendors; reported via community summary]. Within-harness ablation (identical model/sandbox, 3 seeds) on SWE-PolyBench Verified and SWE-bench Pro with Claude Opus 4.7: adding a structural index produced a "large localisation gain and a statistically separated resolve gain" with **no cost penalty per task and lower cost per solved problem**. Exact resolve-rate deltas require running their harness. URL: https://arxiv.org/abs/2606.22417 (as cited by https://codex.danielvaughan.com/2026/07/06/structural-codebase-indexing-coding-agents-codex-cli-mcp-knowledge-graph-navigation/).
2. **Vogel et al., "Codebase-Memory: Tree-Sitter-Based Knowledge Graphs for LLM Code Exploration via MCP" (arXiv:2603.27277, March 2026)** - [research, vendor-affiliated (the CBM makers)]. Across 31 repositories: **10x lower token use, 2.1x fewer tool calls, answer quality 83% vs 92% for file-by-file exploration** - i.e., tokens saved but raw exploration still scored higher on answer quality; graph wins on graph-native queries (hub detection, caller ranking, dead code) in 19/31 languages. URL: https://arxiv.org/abs/2603.27277.
3. **codebase-memory-mcp README numbers** - [vendor claim]: ~120x fewer tokens in a self-reported five-query comparison (~3,400 vs ~412,000 tokens, file-by-file vs graph); Linux kernel (28M LOC, 75K files) indexed in ~3 min; Cypher relationship queries <1 ms (Apple M3 Pro); Django in ~6 s (49K nodes/196K edges, per Vaughan's article). URL: https://github.com/DeusData/codebase-memory-mcp.
4. **Graphify BENCHMARKS.md** - [vendor claim, methodology described]: LOCOMO (n=300) recall@10 **0.497** vs mem0 0.048 / supermemory 0.149; LongMemEval-S (n=50) QA 76% (tied with dense RAG); **ERPNext cross-tool key-fact coverage 82.0% vs grep/read baseline 70.8%** (the closest thing to "graph vs grep" in their set); graph build with 0 LLM credits; judges blind-validated (Cohen's kappa 0.81). "Cut agent token spend by 80%" is the Graphify Cloud marketing line. URL: https://github.com/Graphify-Labs/graphify (BENCHMARKS.md).
5. **Repomix compression** - [vendor claim]: ~70% token reduction with `--compress` (tree-sitter signature extraction). URL: https://repomix.com/guide/code-compress.
6. **CodeGraphContext GCF** - [vendor claim]: ~62% smaller tool responses in GCF output format. URL: https://github.com/CodeGraphContext/CodeGraphContext.
7. **Zep/Graphiti paper (arXiv:2501.13956)** - [research, vendor (Zep employees)], about agent memory, not code graphs: DMR benchmark 94.8% vs MemGPT 93.4%; LongMemEval accuracy **up to +18.5%** with **90% latency reduction** vs baselines. URL: https://arxiv.org/abs/2501.13956.
8. **Daniel Vaughan, "Structural Codebase Indexing: Why grep Is Not Enough" (updated 2026-10-14)** - [community, independent practitioner]: audits both papers, provides the Codex CLI config/AGENTS.md navigation protocol, and caveats - "the 83% quality figure ... means the graph alone is not sufficient"; Hybrid LSP covers only 9 languages; generated code pollutes graphs; token break-even "within two or three multi-file tasks" (his estimate, not a measurement).
9. **Anecdotes:** DaiDocs HN post claims 218x token savings vs Graphify (unverified, self-interested); `graf` claims "1000x faster Graphify queries" (vendor claim, Rust+SQLite rewrite); an Ask HN author of a competing tool notes Graphify "uses an LLM to INFER system structure, labeling its own edges as inferred" (partially outdated - v8 tags edges EXTRACTED/INFERRED and does deterministic AST for code). HN URLs in Sources.

**Bottom line for the workshop:** credible independent evidence says structural indexes improve *localisation* and *token cost* on multi-file changes without hurting resolve rate (arXiv:2606.22417), but the headline 10-120x token figures in tool READMEs are vendor-run; one vendor paper itself shows lower answer quality than plain exploration (83% vs 92%), so graphs complement rather than replace grep.

## 5. Practical recommendation for the workshop

**Default stack for a legacy Java codebase (5,000-line classes, deep call chains):**

1. **Baseline first: plain search + a good AGENTS.md.** Codex CLI and Copilot CLI already ship ripgrep-class search. A well-written AGENTS.md (build/test commands, module map, danger zones, conventions) is zero-infrastructure and never goes stale in a dangerous way. For teams just starting with agents, this plus IDE navigation (Eclipse/IntelliJ) is often enough - it is also the control group against which any graph tool should be measured. [aligned with the Vaughan protocol and the graaph.org selection guide]
2. **Static map for orientation: Repomix (+ Aider-style map if using aider).** Use `repomix --compress --include "src/main/java/**"` for a one-shot architecture hand-off, onboarding pack, or "review this before we talk" context for chat UIs. Cheap, local, portable; but a snapshot - fine for a workshop demo, wrong for a live sprint. Caution: pasting the pack into a hosted chat uploads the whole repo - a real privacy boundary for enterprise code.
3. **A queryable code graph MCP is worth it when:** the repo is huge and polyglot, changes are routinely multi-file, agents keep missing callers/dependencies, or you need impact analysis ("who calls this", blast radius) and dead-code detection as first-class queries. For **Java specifically**, prefer tools with semantic type resolution: **codebase-memory-mcp** (Hybrid LSP incl. Java; single static binary; fully local) or **code-graph-rag** (javac frontend; needs Docker+Memgraph). Graphify is the easiest demo (one `uv tool install`, `/graphify .`) and the most impressive in-browser visualization, with honest EXTRACTED/INFERRED edge labels. GitNexus has the deepest tool surface (impact/PDG/taint, Spring Actuator enrichment) but its **PolyForm Noncommercial license is a blocker for corporate use** - flag this explicitly.
4. **Graphiti is a different tool for a different lesson:** use it to teach agent *memory* (temporal facts, provenance), not repo mapping. Don't demo it as "the code graph".

**Risks to teach explicitly:**

* **Stale index:** every graph tool can silently diverge from the working tree; CBM and GitNexus ship watchers/stale-detection hooks, Graphify rebuilds on commit - but on corporate machines where agents run in short sessions, staleness will happen. Teach "check `index_status`/staleness before trusting the graph" (Vaughan's AGENTS.md protocol encodes this).
* **Privacy:** CBM is fully local (strongest story); Graphify code-parsing is local but docs/PDF/images go to an LLM backend, and Graphify Cloud is SaaS; code-graph-rag/CodeGraphContext need a local graph DB (Docker) but stay local; Graphiti sends ingestion text to an LLM API by default; Repomix's output usually leaves the machine via chat paste. Map this to the course's "no external services with course code" rule.
* **Setup cost on corporate Windows:** CBM = single binary but PowerShell execution policy + documented Defender false positive; Graphify = Python+uv (winget-able), otherwise clean; code-graph-rag/Graphiti = Docker + graph DB - often impossible in locked-down environments; GitNexus = Node with native tree-sitter builds (C++ toolchain issues documented; `GITNEXUS_SKIP_OPTIONAL_GRAMMARS=1` workaround).
* **Tool-call overhead:** 17-19 MCP tools eat context/tool-schema budget; Codex tool search (v0.142+) mitigates this; use tool allow-lists (`enabled_tools` in Codex config) and response token caps (`maxTokens`/`tool_output_token_limit`). Also: agents ignore instructions - one HN practitioner built a pre-tool-call policy gate because agents kept grepping despite AGENTS.md guidance. [community]
* **License/maturity traps:** GitNexus PolyForm Noncommercial; Graphify is 6 months old with a company behind it (fast churn); Aider's release cadence has slowed since Aug 2025.
* **Quality caveats:** vendor benchmarks are vendor-run; the CBM paper itself shows lower answer quality than plain exploration; graphs degrade on generated code (protobuf stubs, bundled assets) - configure ignores.

## 6. Comparison table

| Tool | Representation | Interface | Java support | Incremental updates | Local/cloud | License | Maturity (stars, as of 2026-10-14) |
|---|---|---|---|---|---|---|---|
| Aider repo map | tree-sitter tags + file-dependency graph ranked PageRank-style under token budget | Static text injected in prompt | Good (tree-sitter-java signatures; no types) | Recomputed per session (cache) | Local | Apache-2.0 | Very high (49.5k stars) but slowed (v0.86.0, 2025-08) |
| Repomix | Packed files (+ optional tree-sitter signature compression) | Static file (XML/MD/JSON/plain) + experimental MCP (`pack_codebase`, `grep_repomix_output`, ...) | OK (text; compress via tree-sitter, quality UNCONFIRMED) | None (snapshot; watch re-pack) | Local (output often pasted into cloud chat) | MIT | High (28.8k stars, v1.18.1 2026-09) |
| codebase-memory-mcp ("codebase memo mcp") | tree-sitter (162 langs) + Hybrid LSP type resolution + embeddings + SQLite graph | 17 MCP tools + local web UI (CBM Lens) + Cypher | Strong (tree-sitter + LSP type resolution) | Yes (git watcher, auto_index, detect_changes) | Local only | MIT | High adoption (46.6k stars, v0.11.0 2026-09; arXiv preprint) |
| Graphify ("grafity" primary) | tree-sitter AST ~40 langs + Leiden communities, EXTRACTED/INFERRED edges, no vectors | Static graph.json/html/report + CLI query/path/explain + skill for 20+ agents + optional MCP | OK (tree-sitter tier; edge quality UNCONFIRMED) | Yes (`--update`, AST cache, git hooks) | Local-first code; docs->LLM; Cloud tier paid | Apache-2.0 | Newest, biggest (126.5k stars; created 2026-04; YC S26) |
| Graphiti ("grafity" alternative) | LLM/embedding temporal knowledge graph (episodes/entities/facts) | Python/TS SDK, REST, MCP server | N/A (not a code parser) | Yes (core feature) | Self-hosted graph DB (Neo4j/FalkorDB/Neptune); hosted Zep | Apache-2.0 | High (31.8k stars, v0.30.2 2026-09; arXiv 2501.13956) |
| GitNexus | tree-sitter native + optional local embeddings + Leiden; LadybugDB | 19 MCP tools + resources/prompts + skills + hooks + web UI | Good (tree-sitter; Spring Actuator enrichment) | Yes (`analyze --watch`, auto-sync, stale-detection hooks) | Local; optional Render deploy | Warning: PolyForm Noncommercial | High adoption (47.9k stars; created 2025-08) |
| code-graph-rag | tree-sitter + optional compiler frontends (javac et al.) + Memgraph | CLI + MCP server, NL->Cypher | Strong ("fully supported" + javac frontend) | Yes (realtime-updates guide; trace merging) | Local (needs Docker) | MIT | Medium (5.3k stars) |
| CodeGraphContext | tree-sitter (23 langs) + optional SCIP; embedded FalkorDB Lite/Kuzu/Neo4j | CLI + MCP server | OK (tree-sitter; SCIP is C/C++/C# only) | Yes (`cgc watch`) | Local (embedded DB) | MIT | Medium (4.3k stars, v0.5.1) |
| "opengraf" | UNCONFIRMED - likely Opengrep (Semgrep fork, SAST, LGPL-2.1) or misheard Graphify | - | - | - | - | - | - |

## Sources

Official documentation:

* Aider repo map docs - https://aider.chat/docs/repomap.html
* Aider blog "Building a better repository map with tree sitter" (2023-10-22) - https://aider.chat/2023/10/22/repomap.html
* Aider repo/releases - https://github.com/Aider-AI/aider (API: 49,549 stars; v0.86.0 2025-08-09; pushed 2026-05-22)
* Repomix site/guides - https://repomix.com/ , https://repomix.com/guide/mcp-server , https://repomix.com/guide/code-compress
* Repomix repo/release - https://github.com/yamadashy/repomix (API: 28,837 stars; v1.18.1 2026-09-21)
* codebase-memory-mcp README + release - https://github.com/DeusData/codebase-memory-mcp (46.6k stars; MIT; v0.11.0 2026-09-15)
* Graphify README (v8) - https://github.com/Graphify-Labs/graphify (API: 126,525 stars; Apache-2.0; created 2026-04-03); docs.graphify.com
* Graphiti README + release - https://github.com/getzep/graphiti (31.8k stars; Apache-2.0; v0.30.2 2026-09-08)
* GitNexus README - https://github.com/abhigyanpatwari/GitNexus (API: 47,882 stars; PolyForm Noncommercial)
* code-graph-rag README - https://github.com/vitali87/code-graph-rag (5.3k stars; MIT)
* CodeGraphContext README - https://github.com/CodeGraphContext/CodeGraphContext (4.3k stars; MIT; v0.5.1)
* Serena repo metadata - https://github.com/oraios/serena (30,267 stars; license NOASSERTION)
* Opengrep - https://github.com/opengrep/opengrep ; Semgrep comparison - https://docs.semgrep.dev/faq/comparisons/opengrep
* OpenGraph (HKUDS) - https://github.com/HKUDS/OpenGraph

Research preprints:

* Vogel et al., Codebase-Memory (2026) - https://arxiv.org/abs/2603.27277
* Bhola et al., Code Isn't Memory (2026) - https://arxiv.org/abs/2606.22417
* Rasmussen et al., Zep: A Temporal Knowledge Graph Architecture - https://arxiv.org/abs/2501.13956

Community/blog sources (independent of the tool vendors unless noted):

* Daniel Vaughan, "Structural Codebase Indexing: Why grep Is Not Enough" - https://codex.danielvaughan.com/2026/07/06/structural-codebase-indexing-coding-agents-codex-cli-mcp-knowledge-graph-navigation/
* graaph.org (fan-run Graphify guides site), "Code Intelligence MCP Servers" (2026-07-14) - https://graaph.org/ai-coding/mcp/code-intelligence-mcp-servers/
* HN threads (via Algolia): "Show HN: graf (1000x faster graphify in Rust)" - https://github.com/ctxrs/graf ; "Graphicle, a Rust port of Graphify" - https://github.com/graphicle-ai/graphicle ; Ask HN on Graphify's 12k-stars-in-48h launch and INFERRED edges; "Show HN: Open-Source DaiDocs now beats Graphify by 218x low tokens" (anecdote)
* GitHub repository searches: `code graph mcp` sorted by stars (Graphify-Labs/graphify 127k, DeusData/codebase-memory-mcp 46.6k, tirth8205/code-review-graph 32.2k, ...) and `opengraf` (14 irrelevant repos); DuckDuckGo searches for opengraf/knowledge-graph-codebase-MCP (rate-limited partway).

UNCONFIRMED items summary: identity of "opengraf"; Graphify latest tagged release date; Repomix Java compression quality; Graphify Java edge quality; GitNexus latest release tag; Serena Java language-server support; absolute resolve-rate deltas for arXiv:2606.22417.
