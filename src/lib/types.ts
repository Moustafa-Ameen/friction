import { z } from 'zod'

const optionSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  benefits: z.array(z.string().min(1)).min(1).max(3),
  drawbacks: z.array(z.string().min(1)).min(1).max(3),
})

const decisionSchema = z.object({
  title: z.string().min(1),
  importanceScore: z.number().min(0).max(100),
  scoreReason: z.string().min(1),
  situation: z.string().min(1),
  disagreementType: z.enum(['FACT', 'VALUE', 'DEFINITION', 'UNKNOWN']),
  whatWouldHelp: z.string().min(1),
  options: z.array(optionSchema).min(2).max(3),
  nextQuestion: z.string().min(1),
})

export const analysisSchema = z.object({
  summary: z.string().min(1),
  decisions: z.array(decisionSchema).min(1).max(3),
})

export type DecisionOption = z.infer<typeof optionSchema>
export type DecisionItem = z.infer<typeof decisionSchema>
export type ConflictAnalysis = z.infer<typeof analysisSchema>

export type AnalyzeInput = {
  decision?: string
  mode: 'perspectives' | 'transcript'
  sideA?: string
  sideB?: string
  transcript?: string
}
