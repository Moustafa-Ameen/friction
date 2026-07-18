import { useState } from 'react'
import { ArrowRight, CalendarDays, Check, CircleHelp, Clipboard, FileText, Lightbulb, LockKeyhole, Play, RotateCcw, ShieldAlert, Sparkles, TriangleAlert, UserRound, X } from 'lucide-react'
import { fallbackAnalysis } from './lib/fallback'
import { analysisSchema, type AnalyzeInput, type ConflictAnalysis } from './lib/types'

type Mode = AnalyzeInput['mode']
type Source = 'idle' | 'fallback' | 'gpt-5.6'

type Scenario = {
  topic: string
  sideA: string
  sideB: string
  transcript: string
}

const scenarios: Record<string, Scenario> = {
  launch: {
    topic: 'Should we launch the beta this Friday?',
    sideA: 'We need to launch this Friday. We have already slipped twice, our competitors are moving quickly, and real user feedback is more valuable than another week of internal debate. The bugs we have left are visible but manageable.',
    sideB: 'We should wait. The onboarding flow still breaks for new users and a public launch will create a first impression we cannot undo. We do not have enough support coverage this weekend to respond properly.',
    transcript: 'Maya: We need to launch this Friday. We have already slipped twice, and real user feedback is more valuable than another week of internal debate.\n\nJon: We should wait. The onboarding flow still breaks for new users and a public launch will create a first impression we cannot undo.\n\nMaya: Competitors are moving quickly.\n\nJon: We do not have enough support coverage this weekend.',
  },
  hiring: {
    topic: 'Should we hire the experienced candidate or the fast learner?',
    sideA: 'The experienced candidate can own the role immediately and reduce the risk of missing the quarter. We need someone who has already handled this scale.',
    sideB: 'The fast learner has stronger collaboration signals and will grow with the team. Hiring for adaptability gives us a better long-term fit than optimizing for a familiar resume.',
    transcript: 'Aisha: The experienced candidate can own the role immediately and reduce the risk of missing the quarter.\n\nSam: The fast learner has stronger collaboration signals and will grow with the team.\n\nAisha: We need someone who has already handled this scale.\n\nSam: Adaptability gives us a better long-term fit.',
  },
  scope: {
    topic: 'Should we cut scope to hit the client deadline?',
    sideA: 'Cutting scope protects the deadline and lets us validate the core workflow with the client. A focused delivery is better than a late, unfinished promise.',
    sideB: 'Cutting scope removes the feature that makes the product valuable. We should move the deadline rather than deliver something the client cannot use as intended.',
    transcript: 'Priya: Cutting scope protects the deadline and lets us validate the core workflow.\n\nLeo: Cutting scope removes the feature that makes the product valuable.\n\nPriya: A focused delivery is better than a late promise.\n\nLeo: We should move the deadline rather than deliver something incomplete.',
  },
}

function App() {
  const [mode, setMode] = useState<Mode>('perspectives')
  const [scenarioId, setScenarioId] = useState('launch')
  const [topic, setTopic] = useState(scenarios.launch.topic)
  const [sideA, setSideA] = useState(scenarios.launch.sideA)
  const [sideB, setSideB] = useState(scenarios.launch.sideB)
  const [transcript, setTranscript] = useState(scenarios.launch.transcript)
  const [analysis, setAnalysis] = useState<ConflictAnalysis>(() => fallbackAnalysis({ mode: 'perspectives', decision: '', sideA: '', sideB: '' }))
  const [source, setSource] = useState<Source>('idle')
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [practiceOpen, setPracticeOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedUpdate, setCopiedUpdate] = useState(false)
  const [owner, setOwner] = useState('')
  const [reviewDate, setReviewDate] = useState('')

  const loadScenario = (id: string) => {
    const next = scenarios[id]
    if (!next) return
    setScenarioId(id)
    setTopic(next.topic); setSideA(next.sideA); setSideB(next.sideB); setTranscript(next.transcript)
    setError(''); setWarning('')
  }

  const analyze = async () => {
    const payload: AnalyzeInput = { decision: topic, mode, sideA, sideB, transcript }
    if (!topic.trim()) return setError('Add the decision your team is trying to make.')
    if (mode === 'perspectives' && (!sideA.trim() || !sideB.trim())) return setError('Add both perspectives before compiling the conflict.')
    if (mode === 'transcript' && !transcript.trim()) return setError('Paste a conversation before compiling the conflict.')

    setStatus('loading'); setError(''); setWarning('')
    try {
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const body = await response.json() as { analysis?: unknown; source?: Source; warning?: string; error?: string }
      if (!response.ok) throw new Error(body.error || 'Friction could not compile this input.')
      const parsed = analysisSchema.safeParse(body.analysis)
      if (!parsed.success) throw new Error('The analysis response was incomplete. Try again.')
      setAnalysis(parsed.data); setSource(body.source || 'fallback'); setWarning(body.warning || '')
    } catch (requestError) {
      setAnalysis(fallbackAnalysis(payload)); setSource('fallback')
      setWarning(requestError instanceof Error ? `${requestError.message} Showing local analysis instead.` : 'Showing local analysis instead.')
    } finally {
      setStatus('idle')
    }
  }

  const reset = () => {
    loadScenario('launch')
    setMode('perspectives')
    setAnalysis(fallbackAnalysis({ mode: 'perspectives', decision: '', sideA: '', sideB: '' }))
    setSource('idle'); setWarning(''); setError(''); setOwner(''); setReviewDate('')
  }

  const writeToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      textarea.remove()
    }
  }

  const copyStarter = async () => {
    await writeToClipboard(analysis.resolution.conversationStarter)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const copyDecisionPacket = async () => {
    const update = [
      '# Decision packet',
      '',
      `Decision: ${analysis.decision}`,
      '',
      `Proposed path: ${analysis.resolution.title}`,
      '',
      `Owner: ${owner || 'Unassigned'}`,
      `Review date: ${reviewDate || 'Set before sending'}`,
      '',
      'Why this path:',
      analysis.resolution.rationale,
      '',
      'Next steps:',
      ...analysis.resolution.steps.map((step) => `- ${step}`),
      '',
      'Success criteria:',
      ...analysis.resolution.successCriteria.map((criterion) => `- ${criterion}`),
      '',
      'Pressure test:',
      analysis.redTeam.preCommitmentTest,
    ].join('\n')
    await writeToClipboard(update)
    setCopiedUpdate(true)
    window.setTimeout(() => setCopiedUpdate(false), 1600)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top"><span className="brand-mark">F</span><span>friction</span></a>
        <div className="topbar-right"><span className={`status-dot ${source === 'gpt-5.6' ? 'live-dot' : source === 'idle' ? 'ready-dot' : ''}`} /> {status === 'loading' ? 'compiling conflict' : source === 'gpt-5.6' ? 'GPT-5.6 Luna analysis' : source === 'fallback' ? 'local fallback mode' : 'ready to compile'} <button className="icon-button" title="Privacy information"><LockKeyhole size={16} /></button></div>
      </header>

      <main id="top">
        <section className="hero container">
          <div className="eyebrow"><span className="eyebrow-line" /> CONFLICT, MADE LEGIBLE</div>
          <h1>Find the disagreement<br /><em>underneath</em> the argument.</h1>
          <p className="hero-copy">Friction separates facts from assumptions, reveals what people still share, and finds the next move that can get a decision unstuck.</p>
        </section>

        <section className="workspace container">
          <div className="input-panel panel">
            <div className="panel-heading"><div><span className="step">01</span><h2>Bring us the friction</h2></div><button className="text-button" onClick={reset}><RotateCcw size={14} /> Reset</button></div>
            <div className="input-tools"><div className="mode-tabs" role="tablist" aria-label="Conflict input mode"><button className={mode === 'perspectives' ? 'active' : ''} onClick={() => setMode('perspectives')} role="tab" aria-selected={mode === 'perspectives'}>Two perspectives</button><button className={mode === 'transcript' ? 'active' : ''} onClick={() => setMode('transcript')} role="tab" aria-selected={mode === 'transcript'}>Paste conversation</button></div><label className="scenario-select">Sample <select value={scenarioId} onChange={(event) => loadScenario(event.target.value)}><option value="launch">Product launch</option><option value="hiring">Hiring decision</option><option value="scope">Project scope</option></select></label></div>
            <label htmlFor="decision">What is the decision?</label>
            <input id="decision" value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={240} />
            {mode === 'perspectives' ? <div className="sides-grid"><div className="side-input"><div className="field-label"><span className="side-dot coral-dot" /> Side A</div><textarea aria-label="Side A" value={sideA} onChange={(event) => setSideA(event.target.value)} maxLength={12000} /></div><div className="side-input"><div className="field-label"><span className="side-dot teal-dot" /> Side B</div><textarea aria-label="Side B" value={sideB} onChange={(event) => setSideB(event.target.value)} maxLength={12000} /></div></div> : <div className="side-input transcript-input"><div className="field-label"><span className="side-dot gold-dot" /> Conversation transcript</div><textarea aria-label="Conversation transcript" value={transcript} onChange={(event) => setTranscript(event.target.value)} maxLength={12000} /></div>}
            <button className="analyze-button" onClick={analyze} disabled={status === 'loading'}>{status === 'loading' ? <span className="spinner" /> : <Sparkles size={17} />} {status === 'loading' ? 'Compiling...' : 'Compile the conflict'} {!status && <ArrowRight size={17} />}</button>
            <div className="privacy-note"><LockKeyhole size={13} /> Your text is not stored by Friction.</div>
            {error && <div className="form-error" role="alert"><TriangleAlert size={15} /> {error}</div>}
          </div>

          {warning && <div className="warning-banner"><TriangleAlert size={15} /><span>{warning}</span></div>}

          <section className="results" aria-live="polite">
            <div className="results-heading"><div><span className="step">02</span><h2>The conflict, compiled</h2></div><span className="confidence"><span /> {source === 'gpt-5.6' ? 'GPT-5.6 Luna analysis' : source === 'fallback' ? `Local analysis | ${analysis.confidence}% confidence` : 'Demo preview'}</span></div>
            <div className="decision-banner"><div><span className="mini-label">DECISION UNDER REVIEW</span><h3>{analysis.decision}</h3></div><div className="decision-icon"><TriangleAlert size={19} /></div></div>

            <div className="sides-grid result-sides">{analysis.perspectives.map((side, index) => <article className="side-card" key={`${side.label}-${index}`}><div className={`card-top ${index === 0 ? 'coral' : 'teal'}`}><span className="side-dot" /><span>{side.label}</span><span className="perspective">PERSPECTIVE</span></div><p>{side.summary}</p><div className="claim-label">What this side is saying</div><ul>{side.claims.map((claim) => <li key={claim}>{claim}</li>)}</ul><div className="priority-row">Protects <strong>{side.priorities.join(' · ')}</strong></div></article>)}</div>

            <div className="shared-strip"><div className="shared-title"><span className="shared-icon">∩</span><div><span className="mini-label">WHAT BOTH SIDES SHARE</span><strong>There is more common ground than it feels like.</strong></div></div><div className="shared-items">{analysis.sharedGround.map((item) => <span key={item}>{item}</span>)}</div></div>

            <div className="section-heading"><div><span className="step">03</span><h2>Where the friction lives</h2></div><button className="icon-button" title="What do these labels mean?"><CircleHelp size={17} /></button></div>
            <div className="faultline-grid">{analysis.faultlines.map((line) => <article className={`faultline ${line.type.toLowerCase()}`} key={`${line.type}-${line.title}`}><span className="fault-label">{line.type}</span><h3>{line.title}</h3><p>{line.explanation}</p>{line.missingEvidence && <div className="missing-evidence"><span>Next evidence</span>{line.missingEvidence}</div>}</article>)}</div>

            <section className="section-heading pressure-heading"><div><span className="step">04</span><h2>Pressure-test the path</h2></div><ShieldAlert size={18} /></section>
            <section className="red-team-panel"><div className="red-team-intro"><ShieldAlert size={19} /><p>Challenge the plan before the team commits to it.</p></div><div className="pressure-grid"><article><span>Strongest counterargument</span><p>{analysis.redTeam.strongestCounterargument}</p></article><article><span>Hidden assumption</span><p>{analysis.redTeam.hiddenAssumption}</p></article><article><span>Evidence that would change the decision</span><p>{analysis.redTeam.evidenceThatWouldChangeMind}</p></article><article><span>Pre-commitment test</span><p>{analysis.redTeam.preCommitmentTest}</p></article></div></section>

            <div className="resolution-panel"><div className="resolution-intro"><div className="resolution-icon"><Lightbulb size={21} /></div><div><span className="mini-label">A WAY THROUGH</span><h2>{analysis.resolution.title}</h2><p>{analysis.resolution.rationale}</p></div></div><div className="resolution-steps">{analysis.resolution.steps.map((step, index) => <div className="resolution-step" key={step}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step}</strong></div>)}</div><div className="criteria-block"><span className="mini-label">SUCCESS CRITERIA</span><ul>{analysis.resolution.successCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul></div><div className="executor-fields"><label><span><UserRound size={13} /> Decision owner</span><input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="Who owns the next move?" /></label><label><span><CalendarDays size={13} /> Review date</span><input type="date" value={reviewDate} onChange={(event) => setReviewDate(event.target.value)} /></label></div><div className="resolution-actions"><button className="outline-button" onClick={() => setPracticeOpen(true)}><Play size={15} /> Practice this resolution</button><button className="outline-button" onClick={copyDecisionPacket}><Clipboard size={15} /> {copiedUpdate ? 'Decision packet copied' : 'Copy decision packet'}</button></div></div>

            <div className="footer-note"><FileText size={15} /> Generated from the perspectives you provided <span>•</span> Friction does not decide who is right.</div>
          </section>
        </section>
      </main>
      <footer className="footer container"><span>FRICTION / 01</span><span>Make the disagreement legible.</span></footer>

      {practiceOpen && <div className="modal-backdrop" role="presentation" onClick={() => setPracticeOpen(false)}><section className="practice-modal" role="dialog" aria-modal="true" aria-labelledby="practice-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" title="Close practice dialog" onClick={() => setPracticeOpen(false)}><X size={17} /></button><span className="mini-label">PRACTICE THE NEXT MOVE</span><h2 id="practice-title">Start with a question, not a verdict.</h2><p>{analysis.resolution.conversationStarter}</p><button className="copy-button" onClick={copyStarter}>{copied ? <Check size={15} /> : <Clipboard size={15} />} {copied ? 'Copied' : 'Copy conversation starter'}</button></section></div>}
    </div>
  )
}

export default App
