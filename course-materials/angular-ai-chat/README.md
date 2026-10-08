# Angular AI chat: Voice mode demo

The demo setup was created 100% in ChatGPT Voice mode on 8 October 2026. ChatGPT cloned, installed, built, configured and started the official Angular example from the Vercel AI SDK repository. The upstream application was reused, rather than written again.

## Source and saved changes

- Upstream: [Vercel AI SDK Angular example](https://github.com/vercel/ai/tree/e0fdae62c4ecb980c40e17d3fe87bacce7d14c1f/examples/angular).
- Pinned revision: `e0fdae62c4ecb980c40e17d3fe87bacce7d14c1f`.
- [voice-mode-demo.patch](voice-mode-demo.patch) changes the chat's selected model and the Express server's default model to `inclusionai/ling-3.1-flash-free`.
- The example uses Angular 21, Express and workspace packages from the upstream monorepo. It must run inside that monorepo.

This course repository stores the exact demo changes and reproduction instructions. The full upstream checkout, dependencies, generated files and credentials are not included.

## Reproduce the demo

Run these commands from the course repository root. Use Node.js 24 and pnpm; the upstream repository declares its own pnpm version.

```bash
git clone https://github.com/vercel/ai.git ../vercel-ai-demo
git -C ../vercel-ai-demo checkout e0fdae62c4ecb980c40e17d3fe87bacce7d14c1f
git -C ../vercel-ai-demo apply --unidiff-zero \
  "$PWD/course-materials/angular-ai-chat/voice-mode-demo.patch"
cd ../vercel-ai-demo
pnpm install --filter '@example/angular...' --ignore-scripts
pnpm exec turbo build --filter='@example/angular...' --concurrency=4
```

Create `examples/angular/.env` locally with your own AI Gateway key:

```dotenv
AI_GATEWAY_API_KEY=your_key_here
```

Keep that file ignored by Git. The key is loaded by Express and is never included in the browser bundle.

```bash
pnpm --filter @example/angular start
```

Open <http://localhost:4200>. Angular proxies API requests to Express on port 3000. Stop both servers with `Ctrl+C` in the terminal running the start command.

## Free model and verification

[Ling 3.1 Flash (Free)](https://vercel.com/ai-gateway/models/ling-3.1-flash-free) had zero input and output prices when the demo was run. Vercel lists the promotional pricing end date as 13 October 2026. Check availability and pricing before running it again; an AI Gateway key is still required.

The demo was verified with an upstream workspace build (18 successful tasks), startup of Angular and Express, and a streaming request through Angular's `/api/chat` proxy. The request returned HTTP 200 and `Cześć!` with no error events. Automated test suites were not run.

OpenRouter integration and moving the application into a standalone course monorepo remain future work. This saved demo uses Vercel AI Gateway.
