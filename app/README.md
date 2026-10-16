# Sages Angular chat demo

A small training spike: Angular 21, Vercel AI SDK 7, Express and AI Gateway. Text-only chat with streamed responses and cancellation. No database, authentication, tools or persistence.

## Run

```sh
pnpm install
# Set AI_GATEWAY_API_KEY in ignored .env, server-side only.
pnpm start
```

Open http://localhost:4200. The API listens on http://127.0.0.1:3000; the Angular development proxy forwards `/api`. Build both parts with `pnpm build`.

## Source and adaptation

Adapted from the [official Vercel AI SDK Angular example](https://github.com/vercel/ai/tree/fa98094401a7318eec5d4005d427579150f970aa/examples/angular), revision `fa98094401a7318eec5d4005d427579150f970aa`. MIT license retained in `UPSTREAM-LICENSE`. Replaced monorepo workspace references with published packages, removed completion/structured-object tabs and synthetic tools, simplified chat, added Polish UI and configured AI Gateway.

The popular [Vercel Chatbot template](https://vercel.com/templates/other/chatbot) uses Next.js; this adaptation uses Vercel's ready Angular example to retain the requested framework.

## Model and account requirements (checked 2026-10-16)

The server pins `nvidia/nemotron-3.5-lightning-free` with no paid fallback. Its [official model card](https://vercel.com/ai-gateway/models/nemotron-3.5-lightning-free) lists free input and output. This is a trial offer, with no promise of permanent free availability. NVIDIA logs prompts and output for product improvement. Use synthetic prompts only, never personal or confidential data.

A Vercel account and AI Gateway API key are required. The separate [Gateway free tier](https://vercel.com/docs/ai-gateway/pricing) provides $5 every 30 days for eligible teams and a subset of models with lower limits. That credit offer is distinct from a zero-price model. The [FAQ](https://vercel.com/docs/ai-gateway/faq) says free-credit access can require a valid payment method; free-model access must be checked for the actual account. Do not add a payment method or buy credits for this demo.

A temporary demo key was requested with 7-day expiry and a $1 total quota; a quota is a ceiling, not a payment or credit purchase. The key remains only in ignored `.env`, mode 600. No secret values are documented here. Manage/revoke the temporary key in the Vercel dashboard after the workshop.

## References

- [AI SDK Angular source](https://github.com/vercel/ai/tree/main/examples/angular)
- [AI SDK chat and stream protocol](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot)
- [AI Gateway provider](https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway)
- [AI Gateway CLI key management](https://vercel.com/docs/cli/ai-gateway)

## Local verification

`pnpm build`: Angular production build and backend TypeScript compilation. Real browser checks cover message entry, disabled empty submission, Enter submission, error handling and mobile layout. A model response is verified separately from UI startup; missing account access is never represented by a synthetic AI reply.

Live integration check: HTTP 200 with `text/event-stream`, 20 text-delta chunks in 2.4 seconds, no error events. The actual model response appeared in the browser. This account accessed the selected free model without adding a payment method or purchasing credits during this task.

The demo server is kept running in Herdr workspace `w1E`, pane `w1E:p1`, with ordinary runtime log `/tmp/sages-demo-server.log`.

Final check: production frontend + backend build exited 0 without warnings; browser observed 22 distinct growing assistant-text lengths during a real response, no UI error. Mobile viewport 390 x 844 had body width 390, with no horizontal overflow. Screenshots: `/tmp/sages-chat-ai.png`, `/tmp/sages-chat-mobile.png`, `/tmp/sages-chat-final.png`.

## Brand adaptation from jftp-gr2

The chat uses the design system selected in [LucasMatuszewski/jftp-gr2](https://github.com/LucasMatuszewski/jftp-gr2), source revision `8cec56fe7083ba71784528f8988c3f9ae234f8e8` on `master`. The source checkout is `/home/lucas/DEV/COURSES/Sages/jftp-gr2` and was kept unchanged.

- `assets/logo.svg` copied byte-for-byte to `public/brand/sygnity-logo.svg`; cyan SVG is used unchanged on white at its original aspect ratio.
- `assets/favicon.png` copied to `public/brand/favicon.png`.
- `assets/design-tokens.json` copied to `design/jftp-gr2-tokens.json`. Source interpretation: `docs/design-guidelines.md`.
- Applied source cyan `#00AEEF`, accent blue `#1E73BE`, body `#3A3A3A`, white/light-gray surfaces, Montserrat, 32px medium headings, 4px spacing scale, 2px controls and 3px message panels.
- Source guidelines name Montserrat but contain no text-font binary. The variable font is self-hosted from the official Google Fonts `ofl/montserrat/Montserrat[wght].ttf`, with its SIL Open Font License in `public/fonts/OFL-Montserrat.txt`. No icon fonts are needed.
- Small primary-button text uses source navigation gray `#333333` on cyan rather than source white-on-cyan, improving text contrast above 4.5:1. Secondary labels use the source accent blue on white.

The Sygnity logo remains a brand asset; verify usage rights before public use or redistribution. This adaptation is for the requested local training demo.

Brand verification: `pnpm build` exited 0 without warnings. At 722px and 1440px, document width matched viewport width; SVG loaded at 160x48, Montserrat loaded locally, primary token was #00AEEF. Primary button text contrast is 4.99:1. Actual model response rendered after the styling change, with zero browser errors. Screenshots: `/tmp/sygnity-chat-722.png`, `/tmp/sygnity-chat-722-conversation.png`, `/tmp/sygnity-chat-wide.png`.
