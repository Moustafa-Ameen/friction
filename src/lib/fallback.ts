import type { AnalyzeInput, ConflictAnalysis } from './types'

const launchAnalysis: ConflictAnalysis = {
  decision: 'Should we launch the beta this Friday?',
  perspectives: [
    {
      label: 'Launch now',
      summary: 'Speed creates learning before the window closes.',
      claims: ['Competitors are moving quickly', 'Feedback is more valuable than another week of debate', 'The remaining bugs are manageable'],
      priorities: ['Learning speed', 'Competitive timing', 'Momentum'],
    },
    {
      label: 'Wait one week',
      summary: 'Trust is harder to rebuild than a deadline.',
      claims: ['Onboarding still breaks for new users', 'A poor first impression is difficult to undo', 'Weekend support coverage is thin'],
      priorities: ['Reliability', 'Customer trust', 'Support capacity'],
    },
  ],
  sharedGround: ['The team needs real user feedback', 'The opportunity window is moving', 'An open-ended delay is unacceptable'],
  faultlines: [
    { type: 'FACT', title: 'How harmful are the remaining bugs?', explanation: 'The disagreement is about severity, not whether bugs exist.', missingEvidence: 'A short beta would reveal onboarding failure rate and support volume.' },
    { type: 'VALUE', title: 'Speed versus first impression', explanation: 'Both sides are protecting the product, but optimizing for different risks.' },
    { type: 'UNKNOWN', title: 'Can support absorb a small launch?', explanation: 'No one has tested the weekend coverage assumption.', missingEvidence: 'Confirm who is available and define an escalation threshold.' },
  ],
  resolution: {
    title: 'Run a controlled beta, not a public launch',
    rationale: 'A small, gated release creates evidence without spending the product\'s reputation.',
    steps: ['Cap the beta at 25 existing users', 'Disable the unstable onboarding path', 'Review support volume Monday morning'],
    conversationStarter: 'What if we test the riskiest assumption with a small, gated beta instead of treating this as a full launch?',
  },
  confidence: 87,
}

export function fallbackAnalysis(input: AnalyzeInput): ConflictAnalysis {
  if (input.mode === 'transcript' && input.transcript?.trim()) {
    const lines = input.transcript.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    const left = lines.filter((_, index) => index % 2 === 0).slice(0, 3)
    const right = lines.filter((_, index) => index % 2 === 1).slice(0, 3)
    return {
      ...launchAnalysis,
      decision: input.decision.trim() || 'What decision is this conversation trying to make?',
      perspectives: [
        { ...launchAnalysis.perspectives[0], claims: left.length ? left : launchAnalysis.perspectives[0].claims },
        { ...launchAnalysis.perspectives[1], claims: right.length ? right : launchAnalysis.perspectives[1].claims },
      ],
      confidence: 64,
    }
  }

  const decision = input.decision.trim() || launchAnalysis.decision
  const sideA = input.sideA?.trim()
  const sideB = input.sideB?.trim()
  if (!sideA && !sideB) return { ...launchAnalysis, decision }

  return {
    ...launchAnalysis,
    decision,
    perspectives: [
      { ...launchAnalysis.perspectives[0], claims: sideA ? [sideA] : launchAnalysis.perspectives[0].claims },
      { ...launchAnalysis.perspectives[1], claims: sideB ? [sideB] : launchAnalysis.perspectives[1].claims },
    ],
    confidence: 58,
  }
}
