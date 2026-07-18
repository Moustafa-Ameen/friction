import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import OpenAI from 'openai'
import { z } from 'zod'
import { analysisSchema, type AnalyzeInput } from '../src/lib/types'
import { fallbackAnalysis } from '../src/lib/fallback'

const app = express()
const port = Number(process.env.PORT || 8787)
const MAX_INPUT_LENGTH = 12000

app.use(express.json({ limit: '32kb' }))

const inputSchema = z.object({
  decision: z.string().trim().max(240).default(''),
  mode: z.enum(['perspectives', 'transcript']),
  sideA: z.string().trim().max(MAX_INPUT_LENGTH).optional(),
  sideB: z.string().trim().max(MAX_INPUT_LENGTH).optional(),
  transcript: z.string().trim().max(MAX_INPUT_LENGTH).optional(),
}).superRefine((value, ctx) => {
  const hasPerspectives = value.mode === 'perspectives' && value.sideA && value.sideB
  const hasTranscript = value.mode === 'transcript' && value.transcript
  if (!hasPerspectives && !hasTranscript) ctx.addIssue({ code: 'custom', message: 'Provide both perspectives or paste a conversation.' })
})

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['decision', 'perspectives', 'sharedGround', 'faultlines', 'resolution', 'redTeam', 'confidence'],
  properties: {
    decision: { type: 'string' },
    perspectives: { type: 'array', minItems: 2, maxItems: 2, items: { type: 'object', additionalProperties: false, required: ['label', 'summary', 'claims', 'priorities'], properties: { label: { type: 'string' }, summary: { type: 'string' }, claims: { type: 'array', items: { type: 'string' } }, priorities: { type: 'array', items: { type: 'string' } } } } },
    sharedGround: { type: 'array', items: { type: 'string' } },
    faultlines: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['type', 'title', 'explanation', 'missingEvidence'], properties: { type: { type: 'string', enum: ['FACT', 'VALUE', 'UNKNOWN', 'DEFINITION'] }, title: { type: 'string' }, explanation: { type: 'string' }, missingEvidence: { type: ['string', 'null'] } } } },
    resolution: { type: 'object', additionalProperties: false, required: ['title', 'rationale', 'steps', 'successCriteria', 'conversationStarter'], properties: { title: { type: 'string' }, rationale: { type: 'string' }, steps: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } }, successCriteria: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } }, conversationStarter: { type: 'string' } } },
    redTeam: { type: 'object', additionalProperties: false, required: ['strongestCounterargument', 'hiddenAssumption', 'evidenceThatWouldChangeMind', 'preCommitmentTest'], properties: { strongestCounterargument: { type: 'string' }, hiddenAssumption: { type: 'string' }, evidenceThatWouldChangeMind: { type: 'string' }, preCommitmentTest: { type: 'string' } } },
    confidence: { type: 'number', minimum: 0, maximum: 100 },
  },
}

function promptFor(input: AnalyzeInput) {
  const source = input.mode === 'transcript'
    ? `Conversation transcript:\n${input.transcript}`
    : `Side A:\n${input.sideA}\n\nSide B:\n${input.sideB}`
  return `Decision under review: ${input.decision}\n\n${source}`
}

async function runModel(input: AnalyzeInput) {
  if (!process.env.OPENAI_API_KEY) return { analysis: fallbackAnalysis(input), source: 'fallback' as const }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
    max_output_tokens: Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 1600),
    input: [
      { role: 'system', content: [{ type: 'input_text', text: 'You are Friction, a neutral decision system for work teams. Use only the supplied text. Do not invent evidence, diagnose people, assign blame, or give legal, medical, or financial advice. Separate claims from values, assumptions, definitions, and unknowns. Represent both perspectives fairly. Prefer a small, testable third option that reduces uncertainty. For the proposed resolution, generate exactly three measurable success criteria. Then red-team that resolution fairly: state the strongest counterargument, the most dangerous hidden assumption, what evidence would change the recommendation, and one small pre-commitment test. Challenge the plan, not either person. Return only the requested JSON structure.' }] },
      { role: 'user', content: [{ type: 'input_text', text: promptFor(input) }] },
    ],
    text: { format: { type: 'json_schema', name: 'conflict_analysis', strict: true, schema: responseSchema } },
  })
  const parsed = analysisSchema.safeParse(JSON.parse(response.output_text))
  if (!parsed.success) throw new Error('The model returned an invalid conflict analysis.')
  return { analysis: parsed.data, source: 'gpt-5.6' as const }
}

app.get('/api/health', (_req, res) => res.json({ ok: true, mode: process.env.OPENAI_API_KEY ? 'gpt-5.6' : 'fallback' }))

app.post('/api/analyze', async (req, res) => {
  const parsed = inputSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input.' })
  try {
    const result = await runModel(parsed.data)
    return res.json(result)
  } catch (error) {
    console.error(error)
    const reason = error instanceof Error ? error.message.slice(0, 180) : 'Unknown API error.'
    return res.json({ analysis: fallbackAnalysis(parsed.data), source: 'fallback', warning: `Live analysis was unavailable (${reason}) Friction used its local fallback.` })
  }
})

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')
app.use(express.static(distDir))
app.get('/', (_req, res) => res.sendFile(path.join(distDir, 'index.html')))

const server = app.listen(port, () => console.log(`Friction analysis server listening on http://127.0.0.1:${port}`))

const shutdown = () => server.close(() => process.exit(0))
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
process.stdin.resume()
