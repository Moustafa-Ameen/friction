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
  required: ['summary', 'decisions'],
  properties: {
    summary: { type: 'string' },
    decisions: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'object', additionalProperties: false, required: ['title', 'importanceScore', 'scoreReason', 'situation', 'disagreementType', 'whatWouldHelp', 'options', 'nextQuestion'], properties: { title: { type: 'string' }, importanceScore: { type: 'number', minimum: 0, maximum: 100 }, scoreReason: { type: 'string' }, situation: { type: 'string' }, disagreementType: { type: 'string', enum: ['FACT', 'VALUE', 'DEFINITION', 'UNKNOWN'] }, whatWouldHelp: { type: 'string' }, options: { type: 'array', minItems: 2, maxItems: 3, items: { type: 'object', additionalProperties: false, required: ['title', 'description', 'benefits', 'drawbacks'], properties: { title: { type: 'string' }, description: { type: 'string' }, benefits: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'string' } }, drawbacks: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'string' } } } } }, nextQuestion: { type: 'string' } } } },
  },
}

function promptFor(input: AnalyzeInput) {
  const source = input.mode === 'transcript'
    ? `Conversation transcript:\n${input.transcript}`
    : `Side A:\n${input.sideA}\n\nSide B:\n${input.sideB}`
  return `Optional context: ${input.decision || '(none provided; infer the decisions from the supplied text)'}\n\n${source}`
}

async function runModel(input: AnalyzeInput) {
  if (!process.env.OPENAI_API_KEY) return { analysis: fallbackAnalysis(input), source: 'fallback' as const }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
    max_output_tokens: Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 1600),
    input: [
      { role: 'system', content: [{ type: 'input_text', text: 'You are Friction, a calm decision clarity tool for everyday people and teams. Use only the supplied text. Do not invent facts, diagnose people, assign blame, or give legal, medical, or financial advice. Extract up to three concrete decisions that the text says or strongly implies need to be made. Give each decision a short, plain-English title. Rank importance from 0 to 100 using impact, urgency, how hard it is to undo, and how much uncertainty remains. Explain the score in one short sentence. Classify the central disagreement for each decision as exactly one of FACT, VALUE, DEFINITION, or UNKNOWN: FACT means a disputed claim could be checked, VALUE means priorities or ideas of success differ, DEFINITION means people use an important word or standard differently, and UNKNOWN means the supplied text does not establish what is missing. Provide one specific, checkable answer to what would help next; do not use generic phrases like “communicate better” or “clarify expectations.” For each decision, describe the situation in plain English and generate two or three concrete action options. Do not include a passive wait option unless the text clearly requires waiting; prefer actions such as doing a smaller version, changing the approach, asking for a commitment, or gathering one specific piece of evidence. For every option, list clear benefits and drawbacks. End each decision with one useful next question. Use everyday language, not consultant jargon. Return only the requested JSON structure.' }] },
      { role: 'user', content: [{ type: 'input_text', text: promptFor(input) }] },
    ],
    text: { format: { type: 'json_schema', name: 'decision_analysis', strict: true, schema: responseSchema } },
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
    console.error(error instanceof Error ? error.message : 'Unknown API error')
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
