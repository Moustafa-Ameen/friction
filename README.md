# Friction

Friction helps work teams understand what is underneath a disagreement. It separates claims from assumptions, shows where two perspectives still overlap, and proposes a small, testable next move.

## Run locally

Requirements: Node.js 20 or newer.

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev:all
```

Open `http://127.0.0.1:5173`.

The app works without an API key using a local fallback analysis. To enable live analysis, set `OPENAI_API_KEY` in `.env` and use `OPENAI_MODEL=gpt-5.6-luna` for the lowest-cost GPT-5.6 variant. Responses are capped at 1,600 output tokens by default. The key is read only by the Express server and is never sent to the browser.

For separate processes, use `npm.cmd run dev` for Vite and `npm.cmd run dev:server` for the analysis server.

## What to try

1. Choose the Product launch, Hiring decision, or Project scope sample.
2. Review the two perspectives or switch to Paste conversation.
3. Select **Compile the conflict**.
4. Inspect the shared ground, faultlines, missing evidence, and proposed third option.
5. Open **Practice this resolution** to copy a neutral conversation starter.

## API

`POST /api/analyze` accepts JSON with:

```json
{
  "decision": "Should we launch the beta this Friday?",
  "mode": "perspectives",
  "sideA": "...",
  "sideB": "..."
}
```

Use `mode: "transcript"` with a `transcript` field to analyze pasted chat or email text. Inputs are limited to keep requests bounded. Friction does not persist submitted conversations.

## How GPT-5.6 is used

GPT-5.6 performs the central conflict analysis through the server-side `/api/analyze` endpoint. Its structured response identifies each perspective, shared ground, faultlines, missing evidence, and a testable resolution. Friction validates the response before rendering it. If the API is unavailable, the product falls back to a clearly labeled local analysis so the demo remains runnable.

## How Codex accelerated the build

Codex was used to scaffold the React/Vite product, shape the conflict-analysis workflow, implement the responsive UI, add the Express/OpenAI server boundary, debug TypeScript and build issues, and verify the product at desktop and mobile sizes. Product decisions were made around a focused work-team audience, neutral analysis, privacy by default, and a visible third-option resolution instead of a generic chatbot response.

## Limitations

Friction organizes the disagreement in the submitted text; it does not determine who is right. It is not legal, medical, or financial advice. GPT-5.6 may misunderstand ambiguous text, so users should verify important decisions with the people and evidence involved.

## Build

```powershell
npm.cmd run build
npm.cmd start
```

The production server serves the built frontend and the `/api/analyze` endpoint. Set `PORT` to change the server port.
