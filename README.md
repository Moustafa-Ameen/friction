# Friction

Friction is a decision system for work teams. It maps what people disagree about, pressure-tests the proposed path, and turns the result into an accountable action packet.

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
5. Review the pressure test, add an owner and review date, then copy the decision packet or practice the neutral conversation starter.

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

GPT-5.6 Luna performs the central conflict analysis through the server-side `/api/analyze` endpoint. The frontend sends the decision and either two perspectives or a pasted transcript to Express; Express sends the text to the Responses API and requests a strict structured JSON response containing the conflict map, three success criteria, and a four-part red-team pressure test. Friction validates that response with Zod before rendering it. If the API is unavailable, the product falls back to a clearly labeled local analysis so the demo remains runnable. The decision-packet action formats the already-validated result plus local owner/review-date fields and does not call the model again.

The visible workflow mirrors the analysis pipeline: read both sides, find agreement, identify what needs proof, then test a way forward. This makes the product more than a generic advice prompt: each stage produces a different artifact that feeds the next stage.

## How Codex accelerated the build

Codex was used as the development-time engineering partner for Friction: it scaffolded the React/Vite product, shaped the conflict-analysis workflow, implemented the responsive UI, added the Express/OpenAI server boundary, wrote and debugged the Zod validation path, fixed the strict structured-output schema, and verified the product at desktop and mobile sizes. It is not a runtime agent inside the app. At runtime, GPT-5.6 Luna performs the analysis, the browser renders the red-team critique, and the browser formats the accountable decision packet from the validated result. Product decisions were made around a focused work-team audience, neutral analysis, privacy by default, and a visible third-option resolution instead of a generic chatbot response.

Key engineering decisions included keeping the API key server-side, validating every model response before rendering, using a local fallback for reliable judging, and making the decision packet a client-side transformation so sharing it never spends another model request.

## Limitations

Friction organizes the disagreement in the submitted text; it does not determine who is right. It is not legal, medical, or financial advice. GPT-5.6 may misunderstand ambiguous text, so users should verify important decisions with the people and evidence involved.

## Build

```powershell
npm.cmd run build
npm.cmd start
```

The production server serves the built frontend and the `/api/analyze` endpoint. Set `PORT` to change the server port.
