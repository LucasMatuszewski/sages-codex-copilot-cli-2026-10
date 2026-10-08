# Sages Angular + OpenRouter monorepo scaffold

## Purpose

Create a runnable starting point for a Sages course exercise so Java developers can explore an Angular frontend and an AI SDK example. This stage is limited to adopting and starting an existing scaffold. Further product behavior will be discussed later.

## User and outcome

The primary users are course participants who develop Java and want a working Angular application to build on. The initial outcome is a local development setup that starts the Angular application and its API service together.

## Approved scope

- Use the official Angular example in `vercel/ai` as the upstream starting point.
- Organize the Sages repository as a pnpm monorepo with `apps/web` for Angular and `apps/api` for Express.
- Adapt the upstream example's package declarations from internal `workspace:*` dependencies to published package versions so the copied example can install independently in this repository.
- Configure the server-side AI SDK provider for OpenRouter. Read `OPENROUTER_API_KEY` from the ignored root `.env`; never expose the key to browser code or commit it.
- Keep the upstream example's functionality as provided. Do not add course-specific behavior, voice/microphone support, persistence, or a Java application in this scaffold stage.
- Preserve existing course materials and instructions.
- Keep the HTTP boundary between Angular and Express suitable for a future Java backend to implement in its place. Do not create a placeholder Java application now.

## Acceptance criteria

1. The repository has a documented workspace command that starts the Angular frontend and Express API together.
2. The upstream Angular example is present under `apps/web`, adapted only as needed to run as a package in this repository.
3. The Express API uses the OpenRouter provider and loads its key from `OPENROUTER_API_KEY` at runtime.
4. No real secret is added to tracked files, frontend bundles, logs, or documentation.
5. The scaffold starts locally without modifying or removing existing course materials.
6. The API route used by the frontend is clearly isolated so another backend implementation can provide it later.

## Constraints and boundaries

- Use the versions and commands verified against the upstream example and current official package documentation.
- Keep `.env` ignored; document the expected variable in a safe example file without a real value.
- This stage does not select a final model, design a course-specific chat experience, add voice support, or implement a Java service.
- Do not push or publish the scaffold.

## Upstream research

- The official `vercel/ai/examples/angular` contains Angular 20, Express, AI SDK UI, and a local proxy setup.
- Its package manifest uses `workspace:*` dependencies because it lives inside the Vercel AI SDK monorepo; copying the folder alone requires replacing those references with published package versions.
- The Angular SDK provides `Chat`, `Completion`, and `StructuredObject` integrations. The OpenRouter AI SDK provider is a separate published package and must use a compatible AI SDK version.

## Review questions

- Confirm the two-app layout and scope above.
- Confirm that the scaffold may retain the example's existing chat, completion, structured-output, and sample-tool demonstrations without adding new course-specific features.
