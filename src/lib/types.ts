import { z } from 'zod'

export const analysisSchema = z.object({
  decision: z.string().min(1),
  perspectives: z.array(z.object({
    label: z.string().min(1),
    summary: z.string().min(1),
    claims: z.array(z.string()).min(1),
    priorities: z.array(z.string()).min(1),
  })).min(2).max(2),
  sharedGround: z.array(z.string()).min(1),
  faultlines: z.array(z.object({
    type: z.enum(['FACT', 'VALUE', 'UNKNOWN', 'DEFINITION']),
    title: z.string().min(1),
    explanation: z.string().min(1),
    missingEvidence: z.string().optional(),
  })).min(1),
  resolution: z.object({
    title: z.string().min(1),
    rationale: z.string().min(1),
    steps: z.array(z.string()).length(3),
    conversationStarter: z.string().min(1),
  }),
  confidence: z.number().min(0).max(100),
})

export type ConflictAnalysis = z.infer<typeof analysisSchema>

export type AnalyzeInput = {
  decision: string
  mode: 'perspectives' | 'transcript'
  sideA?: string
  sideB?: string
  transcript?: string
}
