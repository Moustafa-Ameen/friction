<div align="center">

# `friction`

### Make the next decision feel lighter.

<p><strong>Friction turns messy conversations into ranked decisions, visible tradeoffs, and a next question worth answering.</strong></p>

<p>
  <a href="#the-loop">The loop</a> &nbsp; | &nbsp;
  <a href="#run-it">Run it</a> &nbsp; | &nbsp;
  <a href="#architecture">Architecture</a> &nbsp; | &nbsp;
  <a href="#codex--gpt-56">AI build story</a>
</p>

[![Build](https://img.shields.io/badge/build-passing-4c9b7b?style=for-the-badge&labelColor=1d2926)](https://github.com/Moustafa-Ameen/friction)
[![Runtime](https://img.shields.io/badge/runtime-GPT--5.6%20Luna-c45b45?style=for-the-badge&labelColor=1d2926)](https://platform.openai.com/)
[![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite-2f787d?style=for-the-badge&labelColor=1d2926)](https://react.dev/)
[![Privacy](https://img.shields.io/badge/data-local%20by%20default-8a9b78?style=for-the-badge&labelColor=1d2926)](#privacy)

<br />

<img src="assets/friction-loop.svg" alt="Animated Friction decision loop" width="760" />

</div>

<br />

> **A decision system for the moment before the decision.**
>
> Paste the raw conversation. Friction finds what is being decided, shows what matters, compares the paths, and gives you a concrete next move.

<table>
<tr>
<td width="33%" bgcolor="#f8eee8"><strong>01 / SEE IT</strong><br /><br />Find the real decision inside the noise.</td>
<td width="33%" bgcolor="#edf3ef"><strong>02 / WEIGH IT</strong><br /><br />Rank importance and compare upside against risk.</td>
<td width="33%" bgcolor="#f6f1e4"><strong>03 / MOVE IT</strong><br /><br />Save, share, print, and revisit a clear path.</td>
</tr>
</table>

## Why Friction exists

Most decisions do not arrive as clean questions. They arrive as a Slack thread, a tense conversation, three competing opinions, or a feeling that nobody has said the real thing out loud.

Friction is built for that messy first moment. It does not decide who is right. It makes the decision inspectable.

<div align="center">

```mermaid
flowchart LR
    A([Paste the mess]) --> B{{Find the decision}}
    B --> C[/Rank what matters/]
    C --> D[Compare options]
    D --> E{What kind of tension?}
    E -->|FACT| F[Check evidence]
    E -->|VALUE| G[Name priorities]
    E -->|DEFINITION| H[Define the word]
    E -->|UNKNOWN| I[Surface what is missing]
    F --> J([Choose the next question])
    G --> J
    H --> J
    I --> J

    classDef start fill:#f8eee8,stroke:#d95843,color:#1d211f,stroke-width:2px
    classDef core fill:#fffefa,stroke:#c9c6bf,color:#1d211f
    classDef green fill:#edf3ef,stroke:#4d8f88,color:#1d211f
    classDef endNode fill:#1d2926,stroke:#1d2926,color:#fffaf3,stroke-width:2px
    class A start
    class B,C,D,E core
    class F,G,H,I green
    class J endNode
```

*The flow is deliberately progressive: every screen answers one human question before moving to the next.*

</div>

## The product loop

<table>
<tr><th>Step</th><th>What the user sees</th><th>Why it matters</th></tr>
<tr><td><strong>Situation</strong></td><td>A conversation, rough notes, or two perspectives</td><td>No perfect prompt required</td></tr>
<tr><td><strong>What matters</strong></td><td>Decision drivers and a 0-100 importance score</td><td>Urgency becomes visible without pretending to be certainty</td></tr>
<tr><td><strong>Options</strong></td><td>Ranked paths with benefits and drawbacks</td><td>The user can compare instead of arguing in circles</td></tr>
<tr><td><strong>Analysis</strong></td><td>FACT, VALUE, DEFINITION, or UNKNOWN tension</td><td>The disagreement gets a useful category</td></tr>
<tr><td><strong>Decision</strong></td><td>Owner, review date, brief, PDF, and share action</td><td>Insight becomes something a person can act on</td></tr>
</table>

### A small, inspectable model

```mermaid
stateDiagram-v2
    [*] --> Situation
    Situation --> WhatMatters: analyze
    WhatMatters --> Options: see drivers
    Options --> Analysis: compare paths
    Analysis --> Decision: choose next question
    Decision --> Saved: save / share / print
    Saved --> Situation: revisit later
```

<details>
<summary><strong>What Friction does not do</strong></summary>

Friction does not diagnose people, assign blame, decide who is right, or present uncertain claims as facts. It organizes a decision so the people involved can make the judgment.

</details>

## What makes it different

| Ordinary AI chat | Friction |
| --- | --- |
| Answers the last message | Finds decisions inside the whole situation |
| Produces one confident paragraph | Shows ranked decisions and competing options |
| Blurs facts, values, and assumptions | Labels the central tension explicitly |
| Gives generic advice | Produces a specific, checkable next question |
| Forgets the decision after the chat | Saves a titled process locally for later |
| Requires a perfect prompt | Accepts a rough conversation or two perspectives |

## Built for demonstration

The app ships with realistic scenarios so a first-time user can understand the product in seconds:

<table>
<tr>
<td bgcolor="#f8eee8"><strong>Product launch</strong><br />Launch Friday or wait for onboarding fixes?</td>
<td bgcolor="#edf3ef"><strong>Project scope</strong><br />Cut the feature or move the deadline?</td>
<td bgcolor="#f6f1e4"><strong>Hiring choice</strong><br />Choose experience or long-term fit?</td>
</tr>
<tr>
<td><strong>Pricing strategy</strong><br />Flat subscription or usage-based pricing?</td>
<td><strong>Office location</strong><br />Move for collaboration or keep cost stability?</td>
<td><strong>Website redesign</strong><br />Improve comprehension or protect engineering focus?</td>
</tr>
</table>

The interface also gracefully handles manager/report disagreements, roommate disputes, values-based founder decisions, and three-sided family choices.

## Architecture

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant R as React + Vite
    participant S as Express /api/analyze
    participant G as GPT-5.6 Luna
    participant Z as Zod

    U->>R: Paste conversation or perspectives
    R->>S: POST structured input
    S->>S: Validate length and required fields
    S->>G: Request strict JSON analysis
    G-->>S: Structured response
    S->>Z: Validate response contract
    alt Valid response
        Z-->>R: Analysis + live source
    else Invalid response or API failure
        Z-->>S: Reject safely
        S-->>R: Local fallback analysis
    end
    R-->>U: Workspace, brief, PDF, and share actions
```

### Runtime boundaries

```text
Browser
  React/Vite UI, local saved processes, templates, journal notes
  Copy, native share, print/PDF actions
  No API key

Server
  Express /api/analyze
  Input caps and request validation
  OpenAI Responses API call
  Strict structured output + Zod validation
  Fallback response when live analysis is unavailable
```

<details>
<summary><strong>API contract</strong></summary>

`POST /api/analyze`

```json
{
  "decision": "Should we change the hybrid schedule?",
  "mode": "perspectives",
  "sideA": "The team needs more in-person collaboration.",
  "sideB": "The current arrangement was described as permanent."
}
```

The response is validated before rendering:

```ts
type DecisionAnalysis = {
  summary: string
  decisions: Array<{
    title: string
    importanceScore: number
    scoreReason: string
    situation: string
    disagreementType: 'FACT' | 'VALUE' | 'DEFINITION' | 'UNKNOWN'
    whatWouldHelp: string
    options: Array<{
      title: string
      description: string
      benefits: string[]
      drawbacks: string[]
    }>
    nextQuestion: string
  }>
}
```

</details>

## Run it

Requirements: **Node.js 20+**

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev:all
```

Open `http://127.0.0.1:5173`.

The app runs without an API key using local fallback analysis. For live analysis, add a capped personal key to `.env`:

```dotenv
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.6-luna
OPENAI_MAX_OUTPUT_TOKENS=1600
PORT=8787
```

The key is loaded by Express only and is never bundled into browser JavaScript.

```powershell
# Separate processes
npm.cmd run dev
npm.cmd run dev:server

# Production build
npm.cmd run build
npm.cmd start
```

## Privacy

<table>
<tr><td bgcolor="#edf3ef"><strong>No database</strong><br />Conversations are not written to a database.</td><td bgcolor="#f8eee8"><strong>Local storage</strong><br />Saved decisions, templates, and journal notes stay in this browser.</td></tr>
<tr><td><strong>Server-side key</strong><br />The API key never enters browser JavaScript.</td><td><strong>No surprise calls</strong><br />Copying or printing a brief does not create another model request.</td></tr>
</table>

Friction organizes decisions. It does not provide legal, medical, or financial advice.

## Codex + GPT-5.6

```mermaid
flowchart LR
    C[Codex<br/>development-time partner] --> A[Architecture]
    C --> I[Implementation]
    C --> Q[Debugging + QA]
    G[GPT-5.6 Luna<br/>runtime reasoning] --> X[Decision extraction]
    G --> Y[Importance + options]
    G --> Z[Tension + next question]
    A --> F((Friction))
    I --> F
    Q --> F
    X --> F
    Y --> F
    Z --> F

    classDef codex fill:#f8eee8,stroke:#d95843,color:#1d211f
    classDef gpt fill:#edf3ef,stroke:#4d8f88,color:#1d211f
    classDef product fill:#1d2926,stroke:#1d2926,color:#fffaf3
    class C,A,I,Q codex
    class G,X,Y,Z gpt
    class F product
```

### Codex contributed to

- Reframing the original conflict analyzer into a decision workspace.
- Designing the React/Vite information architecture and responsive layout.
- Implementing the Express server boundary so the key stays server-side.
- Building strict structured-output schemas and Zod validation.
- Debugging malformed responses, fallback behavior, and mobile layout issues.
- Implementing saved processes, templates, journal notes, decision sharing, PDF briefs, and resizable navigation.
- Testing manager/report, roommate, values-based, and three-sided scenarios.

### GPT-5.6 Luna runs at runtime

GPT-5.6 Luna extracts decisions, ranks importance, generates options, classifies the central tension, and proposes a specific next question. Codex is not represented as a runtime agent inside the product.

## Quality gates

| Check | Result |
| --- | :---: |
| Production build | `PASS` |
| Server TypeScript audit | `PASS` |
| Fallback schema validation | `PASS` |
| Strict model response validation | `PASS` |
| API key browser scan | `PASS` |
| Mobile overflow check | `PASS` |
| Saved process reload | `PASS` |
| Brief resize interaction | `PASS` |

## Roadmap

```mermaid
timeline
    title Friction roadmap
    Build Week : Situation to decision brief
               : GPT-5.6 structured analysis
               : Local templates, journal, and saved processes
    Next       : Evidence checklist
               : Better multi-person attribution
               : Read-only brief links
    Later      : Team workspaces
               : Decision outcomes and history
               : Calendar and project-tool integrations
```

The roadmap deliberately leaves authentication, databases, OAuth, and collaboration infrastructure out of the hackathon build. The core decision loop comes first.

<div align="center">

### Less circular debate. More visible decisions.

<sub>Built with React, Express, Zod, GPT-5.6 Luna, and Codex.</sub>

</div>
