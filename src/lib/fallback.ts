import type { AnalyzeInput, ConflictAnalysis } from './types'

const defaultDecision = {
  title: 'Should we launch the beta this Friday?',
  importanceScore: 86,
  scoreReason: 'This affects customer trust and timing, and the remaining uncertainty could create a costly launch problem.',
  situation: 'The team wants real user feedback, but onboarding bugs and thin weekend support make a full public launch risky.',
  disagreementType: 'FACT' as const,
  whatWouldHelp: 'Run the onboarding flow with a small group of new users and record completion failures plus support requests.',
  options: [
    {
      title: 'Run a small invite-only beta',
      description: 'Test the product with a limited group while keeping the ability to pause access.',
      benefits: ['Creates real feedback quickly', 'Limits the cost of a bad first impression'],
      drawbacks: ['Still needs support coverage', 'Results may not represent a full launch'],
    },
    {
      title: 'Launch publicly on Friday',
      description: 'Accept the current risk and learn from a broader group of users immediately.',
      benefits: ['Maximizes learning speed', 'Avoids another delay'],
      drawbacks: ['Onboarding problems affect more users', 'Support pressure may be hard to contain'],
    },
    {
      title: 'Test onboarding with a small internal group',
      description: 'Run the risky flow with a few testers and use what you learn to set a launch threshold.',
      benefits: ['Turns a concern into evidence', 'Creates a clearer go/no-go decision'],
      drawbacks: ['Takes focused team time', 'Internal testers may not represent new users'],
    },
  ],
  nextQuestion: 'What is the smallest group and support plan that would let us test onboarding safely?',
}

function extractLines(text: string) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
}

export function fallbackAnalysis(input: AnalyzeInput): ConflictAnalysis {
  const lines = extractLines(input.transcript || `${input.sideA || ''}\n${input.sideB || ''}`)
  const decision = input.decision?.trim()
  if (!lines.length && decision) return { summary: `The main decision is whether to ${decision.toLowerCase().replace(/^should we /, '')}.`, decisions: [{ ...defaultDecision, title: decision }] }
  if (!lines.length) return { summary: 'Friction found a decision worth clarifying.', decisions: [defaultDecision] }

  const preview = lines.slice(0, 3).join(' ')
  return {
    summary: `The conversation centers on a choice that needs a clear next step: ${preview}`,
    decisions: [{
      ...defaultDecision,
      title: decision || defaultDecision.title,
      situation: `The conversation includes several views that need to be turned into a concrete choice. ${preview}`,
      options: defaultDecision.options,
    }],
  }
}
