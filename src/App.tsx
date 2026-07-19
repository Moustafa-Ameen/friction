import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { ArrowRight, BookOpen, CalendarDays, ChevronLeft, ChevronRight, Clipboard, Download, FileText, Grid2X2, LockKeyhole, MoreHorizontal, PanelRight, Printer, RotateCcw, Save, Settings, Share2, Sparkles, Sun, TriangleAlert, UserRound, Users, X } from 'lucide-react'
import { fallbackAnalysis } from './lib/fallback'
import { analysisSchema, type AnalyzeInput, type ConflictAnalysis } from './lib/types'

type Source = 'idle' | 'fallback' | 'gpt-5.6'
type Step = 1 | 2 | 3 | 4 | 5
type AppPage = 'welcome' | 'workspace' | 'all' | 'team' | 'templates' | 'journal'
type SavedProcess = { id: string; title: string; context: string; transcript: string; sideA: string; sideB: string; analysis: ConflictAnalysis; selectedIndex: number; owner: string; reviewDate: string; updatedAt: string }

const steps = ['Situation', 'What matters', 'Options', 'Analysis', 'Decision']
const scenarios = {
  launch: { context: 'Should we launch the beta this Friday?', transcript: 'Maya: We need to launch this Friday. We have already slipped twice, and real user feedback is more valuable than another week of internal debate.\n\nJon: We should wait. The onboarding flow still breaks for new users and a public launch will create a first impression we cannot undo.\n\nMaya: Competitors are moving quickly.\n\nJon: We do not have enough support coverage this weekend.' },
  scope: { context: 'Should we cut scope to hit the client deadline?', transcript: 'Priya: Cutting scope protects the deadline and lets us validate the core workflow. A focused delivery is better than a late promise.\n\nLeo: Cutting scope removes the feature that makes the product valuable.\n\nLeo: We should move the deadline rather than deliver something incomplete.' },
  hiring: { context: 'Which candidate should we hire?', transcript: 'Aisha: The experienced candidate can own the role immediately and reduce the risk of missing the quarter.\n\nSam: The fast learner has stronger collaboration signals and will grow with the team.\n\nAisha: We need someone who has already handled this scale.\n\nSam: Adaptability gives us a better long-term fit.' },
} as const

function App() {
  const [page, setPage] = useState<AppPage>('welcome')
  const [step, setStep] = useState<Step>(1)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [sample, setSample] = useState('launch')
  const [context, setContext] = useState<string>(scenarios.launch.context)
  const [transcript, setTranscript] = useState<string>(scenarios.launch.transcript)
  const [sideA, setSideA] = useState('')
  const [sideB, setSideB] = useState('')
  const [analysis, setAnalysis] = useState<ConflictAnalysis>(() => fallbackAnalysis({ mode: 'transcript', transcript: '' }))
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [source, setSource] = useState<Source>('idle')
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [owner, setOwner] = useState('')
  const [reviewDate, setReviewDate] = useState('')
  const [copied, setCopied] = useState(false)
  const [title, setTitle] = useState('Untitled decision')
  const [savedProcesses, setSavedProcesses] = useState<SavedProcess[]>([])
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(false)
  const [rightWidth, setRightWidth] = useState(440)
  const [notice, setNotice] = useState('')
  const [resizing, setResizing] = useState(false)
  const selectedDecision = analysis.decisions[selectedIndex] || analysis.decisions[0]
  const sourceLabel = status === 'loading' ? 'analyzing' : source === 'gpt-5.6' ? 'GPT-5.6 Luna' : source === 'fallback' ? 'local fallback' : 'ready'
  const scoreClass = selectedDecision.importanceScore >= 70 ? 'high' : selectedDecision.importanceScore >= 40 ? 'medium' : 'low'

  useEffect(() => {
    try { setSavedProcesses(JSON.parse(localStorage.getItem('friction-processes') || '[]') as SavedProcess[]) } catch { setSavedProcesses([]) }
  }, [])
  useEffect(() => { if (notice) { const timer = window.setTimeout(() => setNotice(''), 2400); return () => window.clearTimeout(timer) } }, [notice])
  useEffect(() => {
    if (!resizing) return
    const move = (event: PointerEvent) => setRightWidth(Math.min(560, Math.max(300, window.innerWidth - event.clientX)))
    const stop = () => setResizing(false)
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', stop)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop) }
  }, [resizing])
  const previewTitle = useMemo(() => title.trim() || selectedDecision.title, [title, selectedDecision.title])

  const loadSample = (id: string) => {
    const next = scenarios[id as keyof typeof scenarios]
    if (!next) return
    setSample(id); setContext(next.context); setTranscript(next.transcript); setAdvancedOpen(false); setError(''); setWarning('')
  }

  const analyze = async () => {
    const payload: AnalyzeInput = advancedOpen ? { decision: context, mode: 'perspectives', sideA, sideB } : { decision: context, mode: 'transcript', transcript }
    if (advancedOpen && (!sideA.trim() || !sideB.trim())) return setError('Add both points of view, or switch back to one conversation.')
    if (!advancedOpen && !transcript.trim()) return setError('Paste a conversation or describe what is going on.')
    setStatus('loading'); setError(''); setWarning('')
    try {
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const body = await response.json() as { analysis?: unknown; source?: Source; warning?: string; error?: string }
      if (!response.ok) throw new Error(body.error || 'Friction could not analyze this situation.')
      const parsed = analysisSchema.safeParse(body.analysis)
      if (!parsed.success) throw new Error('The analysis response was incomplete. Try again.')
      setAnalysis(parsed.data); setSelectedIndex(0); setSource(body.source || 'fallback'); setWarning(body.warning || ''); setStep(1)
    } catch (requestError) {
      setAnalysis(fallbackAnalysis(payload)); setSelectedIndex(0); setSource('fallback'); setWarning(requestError instanceof Error ? `${requestError.message} Showing a local analysis instead.` : 'Showing a local analysis instead.'); setStep(1)
    } finally { setStatus('idle') }
  }

  const reset = () => { loadSample('launch'); setSideA(''); setSideB(''); setOwner(''); setReviewDate(''); setSource('idle'); setWarning(''); setError(''); setStep(1) }
  const saveProcess = () => {
    const next: SavedProcess = { id: crypto.randomUUID(), title: previewTitle, context, transcript, sideA, sideB, analysis, selectedIndex, owner, reviewDate, updatedAt: new Date().toISOString() }
    const merged = [next, ...savedProcesses.filter((item) => item.title !== previewTitle)].slice(0, 12)
    setSavedProcesses(merged); localStorage.setItem('friction-processes', JSON.stringify(merged)); setTitle(previewTitle); setNotice('Decision process saved')
  }
  const loadProcess = (saved: SavedProcess) => { setTitle(saved.title); setContext(saved.context); setTranscript(saved.transcript); setSideA(saved.sideA); setSideB(saved.sideB); setAnalysis(saved.analysis); setSelectedIndex(saved.selectedIndex); setOwner(saved.owner); setReviewDate(saved.reviewDate); setSource('fallback'); setStep(1); setNotice(`Opened ${saved.title}`) }
  const deleteProcess = (id: string) => { const next = savedProcesses.filter((item) => item.id !== id); setSavedProcesses(next); localStorage.setItem('friction-processes', JSON.stringify(next)); setNotice('Saved process removed') }
  const shareProcess = async () => { await writeToClipboard(`${previewTitle}\n\n${selectedDecision.situation}`); setNotice('Decision summary copied') }
  const openWorkspace = () => setPage('workspace')
  const navigate = (next: AppPage) => { setPage(next); if (next === 'workspace') setStep(1) }
  const writeToClipboard = async (text: string) => { try { await navigator.clipboard.writeText(text) } catch { const textarea = document.createElement('textarea'); textarea.value = text; textarea.style.position = 'fixed'; textarea.style.opacity = '0'; document.body.appendChild(textarea); textarea.select(); document.execCommand('copy'); textarea.remove() } }
  const copyDecisionBrief = async () => {
    const brief = [`# Friction decision brief`, '', `Decision: ${selectedDecision.title}`, '', 'What is going on:', selectedDecision.situation, '', `Importance: ${selectedDecision.importanceScore}/100`, selectedDecision.scoreReason, '', 'Options:', ...selectedDecision.options.flatMap((option) => [`## ${option.title}`, option.description, `Upside: ${option.benefits.join('; ')}`, `Risk: ${option.drawbacks.join('; ')}`, '']), 'Next question:', selectedDecision.nextQuestion, '', `Owner: ${owner || 'Unassigned'}`, `Review date: ${reviewDate || 'Not set'}`].join('\n')
    await writeToClipboard(brief); setCopied(true); window.setTimeout(() => setCopied(false), 1600)
  }

  return <div className="app-shell">
    <div className={`product-shell ${leftOpen ? '' : 'left-collapsed'} ${rightOpen ? '' : 'right-collapsed'} ${resizing ? 'is-resizing' : ''}`} style={{ '--brief-width': `${rightWidth}px` } as CSSProperties}>
      <aside className="app-rail">
        <div className="rail-top"><button className="rail-logo" onClick={() => leftOpen ? navigate('welcome') : setLeftOpen(true)} aria-label="Open Friction home">f</button><button className="rail-collapse" onClick={() => setLeftOpen(false)} title="Collapse navigation"><ChevronLeft size={17} /></button></div>
        <nav className="rail-nav" aria-label="Main navigation"><button className={`rail-link ${page === 'workspace' ? 'active' : ''}`} onClick={() => navigate('workspace')}><Sun size={17} /><span>Current decision</span></button><button className={`rail-link ${page === 'all' ? 'active' : ''}`} onClick={() => navigate('all')}><FileText size={17} /><span>All decisions</span></button><button className={`rail-link ${page === 'team' ? 'active' : ''}`} onClick={() => navigate('team')}><Users size={17} /><span>Team decisions</span></button><button className={`rail-link ${page === 'templates' ? 'active' : ''}`} onClick={() => navigate('templates')}><Grid2X2 size={17} /><span>Templates</span></button><button className={`rail-link ${page === 'journal' ? 'active' : ''}`} onClick={() => navigate('journal')}><BookOpen size={17} /><span>Journal</span></button></nav>
        <div className="recent"><span className="rail-label">RECENT DECISIONS</span>{savedProcesses.length ? savedProcesses.slice(0, 3).map((saved) => <div className="recent-item" key={saved.id}><button onClick={() => { loadProcess(saved); navigate('workspace') }}>{saved.title}<small>{new Date(saved.updatedAt).toLocaleDateString()}</small></button><button className="recent-delete" onClick={() => deleteProcess(saved.id)} title={`Delete ${saved.title}`}><X size={12} /></button></div>) : <p className="empty-recent">Saved processes will appear here.</p>}</div>
        <div className="profile"><div className="avatar">S</div><div><strong>Solo plan</strong><small>Personal workspace</small></div><button className="profile-settings" onClick={() => setNotice('Settings are local to this browser')} title="Settings"><Settings size={17} /></button></div>
      </aside>
      <main className="workspace" id="top">
      {page === 'welcome' && <Welcome onStart={openWorkspace} />}
      {page !== 'welcome' && page !== 'workspace' && <LibraryPage page={page} savedProcesses={savedProcesses} onOpen={loadProcess} onStart={openWorkspace} />}
      {page === 'workspace' && <>
        <div className="workspace-head"><div className="title-block"><input className="process-title" value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Decision process title" /><p>Get clarity on what matters, see your options, and choose with confidence.</p></div><div className="head-actions"><button onClick={saveProcess}><Save size={15} /> Save</button><button onClick={shareProcess}><Share2 size={15} /> Share</button><button aria-label="More actions" onClick={() => setNotice('Use Save to keep this process for later')}><MoreHorizontal size={17} /></button>{!rightOpen && <button className="brief-open" onClick={() => setRightOpen(true)} title="Open decision brief"><PanelRight size={16} /> Open brief</button>}<button className="rail-toggle" onClick={() => setLeftOpen(true)} title="Open navigation"><ChevronRight size={16} /></button></div></div>
        <nav className="step-nav" aria-label="Decision workflow">{steps.map((label, index) => <button key={label} className={step === index + 1 ? 'active' : ''} onClick={() => setStep((index + 1) as Step)}><span>{index + 1}</span>{label}</button>)}</nav>
        {warning && <div className="warning-banner"><TriangleAlert size={15} />{warning}</div>}
        <section className="workspace-content">
          <div className="section-kicker"><span>{step === 1 ? '1.' : 'CURRENT'}</span>{step === 1 ? 'Paste your situation' : steps[step - 1]}</div>
          {step === 1 && <><p className="section-help">Add as much detail as you can. The more context, the better the analysis.</p><button className="tips"><Sparkles size={14} /> Tips</button><div className="input-wrap"><textarea className="reference-input" aria-label="Paste your situation" value={advancedOpen ? `${sideA}\n\n${sideB}` : transcript} onChange={(event) => advancedOpen ? setTranscript(event.target.value) : setTranscript(event.target.value)} maxLength={12000} placeholder="Paste your conversation or describe what is going on..." /><span className="character-count">{transcript.length} / 3000</span></div><div className="input-actions"><button className="analyze-button" onClick={analyze} disabled={status === 'loading'}>{status === 'loading' ? 'Analyzing...' : <><Sparkles size={15} /> Analyze situation</>}</button><button className="clear-button" onClick={reset}>Clear</button></div><div className="input-options"><label>Context <input value={context} onChange={(event) => setContext(event.target.value)} placeholder="Optional context" maxLength={240} /></label><select value={sample} onChange={(event) => loadSample(event.target.value)}><option value="launch">Product launch example</option><option value="scope">Project scope example</option><option value="hiring">Hiring example</option></select><button onClick={() => setAdvancedOpen(!advancedOpen)}>{advancedOpen ? 'Use one conversation' : 'Enter two sides separately'}</button></div>{error && <div className="form-error" role="alert"><TriangleAlert size={15} /> {error}</div>}</>}
          {step === 2 && <><p className="section-help">These are the forces behind the decision, ranked by how much they could change the outcome.</p><div className="drivers-grid"><div className="drivers-column"><div className="subhead"><h2>Top decision drivers</h2><button className="score-help" type="button" aria-describedby="score-help-text"><span>How we scored this</span><span className="info-dot">i</span><span className="score-tooltip" id="score-help-text" role="tooltip">Importance combines likely impact, urgency, how difficult the decision is to undo, and how much uncertainty remains.</span></button></div>{[selectedDecision.scoreReason, ...selectedDecision.options.slice(0, 4).map((option) => option.benefits[0])].slice(0, 5).map((driver, index) => <div className="driver-row" key={`${driver}-${index}`}><span>{index + 1}</span><div><strong>{index === 0 ? 'Overall importance' : selectedDecision.options[index - 1]?.title || 'Uncertainty'}</strong><small>{driver}</small></div><b>{Math.max(40, selectedDecision.importanceScore - index * 7)}</b></div>)}</div><div className="options-column"><div className="subhead"><h2>Top options <em>(ranked)</em></h2><button onClick={() => setStep(3)}>Reorder</button></div>{selectedDecision.options.map((option, index) => <OptionCard key={option.title} option={option} index={index} />)}</div></div></>}
          {step === 3 && <><p className="section-help">Compare the paths in front of you. Friction shows the upside and the risk without choosing for you.</p><div className="full-option-grid">{selectedDecision.options.map((option, index) => <OptionCard key={option.title} option={option} index={index} expanded />)}</div></>}
          {step === 4 && <><p className="section-help">A useful analysis makes the uncertainty visible and points to the evidence that would help.</p><div className="analysis-card"><span className="mini-label">WHY THIS MATTERS</span><h2>{selectedDecision.title}</h2><div className="large-score"><strong>{selectedDecision.importanceScore}</strong><span>/100 importance</span></div><p>{selectedDecision.situation}</p><div className="score-bar"><span className={scoreClass} style={{ width: `${selectedDecision.importanceScore}%` }} /></div><small>{selectedDecision.scoreReason}</small><div className={`disagreement-callout ${selectedDecision.disagreementType.toLowerCase()}`}><div><span className="mini-label">WHAT KIND OF DISAGREEMENT?</span><strong>{selectedDecision.disagreementType}</strong></div><div><span className="mini-label">WHAT WOULD HELP?</span><p>{selectedDecision.whatWouldHelp}</p></div></div></div><button className="next-link" onClick={() => setStep(5)}>Make a decision <ArrowRight size={15} /></button></>}
          {step === 5 && <><p className="section-help">Turn the decision into something you can share, revisit, and act on.</p><div className="decision-panel"><span className="mini-label">THE NEXT QUESTION</span><h2>{selectedDecision.nextQuestion}</h2><div className="executor-fields"><label><span><UserRound size={13} /> Owner</span><input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="Name the person" /></label><label><span><CalendarDays size={13} /> Review date</span><input type="date" value={reviewDate} onChange={(event) => setReviewDate(event.target.value)} /></label></div><div className="decision-actions"><button className="analyze-button" onClick={copyDecisionBrief}><Clipboard size={15} /> {copied ? 'Copied' : 'Copy decision brief'}</button><button className="outline-button" onClick={() => window.print()}><Download size={15} /> Download PDF</button><button className="outline-button" onClick={() => window.print()}><Printer size={15} /> Print</button></div></div></>}
          <div className="generated-note"><span className={`analysis-dot ${source === 'gpt-5.6' ? 'live' : ''}`} /> {source === 'gpt-5.6' ? 'GPT-5.6 Luna analysis' : source === 'fallback' ? 'Local fallback analysis' : 'Ready for analysis'} <span className="privacy-copy"><LockKeyhole size={13} /> Your data is private and not stored.</span></div>
        </section>
      </>}
      </main>
      {page === 'workspace' && <>
      <aside className="brief-panel"><div className="brief-resize-handle" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setResizing(true) }} title="Drag to resize brief" /><div className="brief-heading"><div><h2>Decision brief</h2><p>A printable summary of your decision.</p></div><div className="brief-controls"><button onClick={() => setRightOpen(false)} title="Close brief"><X size={15} /></button></div></div><div className="brief-paper"><span className="paper-kicker">DECISION BRIEF</span><h2>{selectedDecision.title}</h2><div className="paper-rule" /><strong className="paper-section-title">Decision</strong><div className="recommendation"><Sparkles size={16} /><div><b>Recommended: Option A</b><span>{selectedDecision.options[0].title}</span></div></div><strong className="paper-section-title">Why</strong><p>{selectedDecision.situation}</p><strong className="paper-section-title">Top factors</strong><ul>{selectedDecision.options.slice(0, 3).map((option, index) => <li key={option.title}>{option.title} ({Math.max(40, selectedDecision.importanceScore - index * 7)})</li>)}</ul><strong className="paper-section-title">Options at a glance</strong><div className="paper-table">{selectedDecision.options.map((option, index) => <div key={option.title}><span>{String.fromCharCode(65 + index)}</span><b>{option.title}</b><em>{Math.max(40, selectedDecision.importanceScore - index * 9)}</em></div>)}</div><div className="paper-meta"><span>Date<strong>{reviewDate || 'Today'}</strong></span><span>Prepared by<strong>Friction</strong></span></div></div><button className="download-button" onClick={() => window.print()}><Download size={15} /> Download PDF</button><button className="print-button" onClick={() => window.print()}><Printer size={15} /> Print</button><div className="brief-private"><LockKeyhole size={13} /> Your data is private and never shared.</div></aside>
      {notice && <div className="toast" role="status">{notice}</div>}
      <div className="print-only"><div className="print-card"><span className="paper-kicker">FRICTION / DECISION BRIEF</span><h1>{selectedDecision.title}</h1><p><strong>Importance:</strong> {selectedDecision.importanceScore}/100. {selectedDecision.scoreReason}</p><h2>Why this matters</h2><p>{selectedDecision.situation}</p><h2>Options at a glance</h2>{selectedDecision.options.map((option, index) => <div className="print-card" key={option.title}><p><strong>{String.fromCharCode(65 + index)}. {option.title}</strong><br />{option.description}</p><p><strong>Upside:</strong> {option.benefits.join('; ')}<br /><strong>Risk:</strong> {option.drawbacks.join('; ')}</p></div>)}<h2>Next question</h2><p>{selectedDecision.nextQuestion}</p><p><strong>Owner:</strong> {owner || 'Unassigned'} &nbsp; <strong>Review date:</strong> {reviewDate || 'Not set'}</p><p>Friction organizes decisions. It does not decide who is right.</p></div></div>
      </>}
    </div>
  </div>
}

function Welcome({ onStart }: { onStart: () => void }) {
  return <section className="welcome-page"><div className="welcome-mark">f</div><span className="welcome-kicker">DECISION CLARITY / 01</span><h1>Make the next decision<br /><em>feel lighter.</em></h1><p>Friction turns conversations, competing priorities, and uncertainty into a clear set of options you can act on.</p><button className="welcome-button" onClick={onStart}>Get started <ArrowRight size={17} /></button><div className="welcome-preview"><div><span>01</span><strong>Paste what is going on</strong><small>Friction finds the decision inside it.</small></div><div><span>02</span><strong>See what matters</strong><small>Rank the forces and compare your options.</small></div><div><span>03</span><strong>Choose with confidence</strong><small>Save a brief you can return to.</small></div></div></section>
}

function LibraryPage({ page, savedProcesses, onOpen, onStart }: { page: Exclude<AppPage, 'welcome' | 'workspace'>; savedProcesses: SavedProcess[]; onOpen: (saved: SavedProcess) => void; onStart: () => void }) {
  const copy = { all: ['All decisions', 'Every decision process saved in this browser.'], team: ['Team decisions', 'A calm place to prepare a decision before sharing it with your team.'], templates: ['Templates', 'Start with a clear shape for the decision in front of you.'], journal: ['Journal', 'Private notes for the questions and patterns you want to remember.'] }[page]
  return <section className="library-page"><div className="library-header"><span className="welcome-kicker">FRICTION WORKSPACE</span><h1>{copy[0]}</h1><p>{copy[1]}</p></div>{page === 'all' && <div className="saved-grid">{savedProcesses.length ? savedProcesses.map((saved) => <button className="saved-card" key={saved.id} onClick={() => { onOpen(saved); onStart() }}><span>{new Date(saved.updatedAt).toLocaleDateString()}</span><strong>{saved.title}</strong><small>{saved.analysis.decisions.length} decision{saved.analysis.decisions.length === 1 ? '' : 's'} found</small><ArrowRight size={16} /></button>) : <div className="empty-state"><FileText size={23} /><h2>No saved decisions yet</h2><p>Give a decision a title and save it from the workspace.</p><button onClick={onStart}>Create your first decision</button></div>}</div>}{page === 'team' && <div className="feature-page"><Users size={29} /><h2>Prepare decisions for a better conversation.</h2><p>Use Friction before a meeting to turn scattered opinions into a shared starting point. Saved processes stay in this browser until you choose to share them.</p><button onClick={onStart}>Start a team decision <ArrowRight size={16} /></button></div>}{page === 'templates' && <div className="template-grid">{['Product launch', 'Hiring choice', 'Project scope', 'Personal change'].map((item, index) => <button key={item} onClick={onStart}><span>0{index + 1}</span><strong>{item}</strong><small>Start with a focused decision prompt.</small><ArrowRight size={16} /></button>)}</div>}{page === 'journal' && <div className="feature-page journal-page"><BookOpen size={29} /><h2>Keep the questions that matter.</h2><textarea placeholder="Write a private note to return to later..." /><button onClick={() => window.localStorage.setItem('friction-journal-note', 'saved')}>Save note</button></div>}</section>
}

function OptionCard({ option, index, expanded = false }: { option: ConflictAnalysis['decisions'][number]['options'][number]; index: number; expanded?: boolean }) {
  return <article className={`reference-option ${expanded ? 'expanded' : ''}`}><div className="option-top"><span>{String.fromCharCode(65 + index)}</span><div><h3>{option.title}</h3><p>{option.description}</p></div><b>{Math.max(40, 78 - index * 12)}</b></div><div className="option-tags"><span className="upside">↑ Upside</span><em>{option.benefits[0]}</em><span className="risk">↓ Risk</span><em>{option.drawbacks[0]}</em></div>{expanded && <div className="expanded-tradeoffs"><div><strong>Benefits</strong><ul>{option.benefits.map((item) => <li key={item}>{item}</li>)}</ul></div><div><strong>Drawbacks</strong><ul>{option.drawbacks.map((item) => <li key={item}>{item}</li>)}</ul></div></div>}</article>
}

export default App
