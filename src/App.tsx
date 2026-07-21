import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { ArrowRight, ArrowUpDown, BookOpen, BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clipboard, Download, FileText, Filter, Grid2X2, Leaf, LockKeyhole, Maximize2, MoreHorizontal, PanelRight, Pencil, Plus, Printer, RefreshCw, RotateCcw, Save, Search, Settings, Share2, SlidersHorizontal, Sparkles, Sun, Trash2, TriangleAlert, UserRound, Users, X } from 'lucide-react'
import { fallbackAnalysis } from './lib/fallback'
import { analysisSchema, type AnalyzeInput, type ConflictAnalysis } from './lib/types'

type Source = 'idle' | 'fallback' | 'gpt-5.6'
type Step = 1 | 2 | 3 | 4 | 5
type AppPage = 'welcome' | 'workspace' | 'all' | 'team' | 'templates' | 'journal'
type SavedProcess = { id: string; title: string; context: string; transcript: string; sideA: string; sideB: string; analysis: ConflictAnalysis; selectedIndex: number; owner: string; reviewDate: string; updatedAt: string }
type DecisionTemplate = { id: string; name: string; context: string; transcript: string; updatedAt: string; builtIn?: boolean }
type JournalNote = { id: string; title: string; content: string; tag: string; updatedAt: string }

const steps = ['Situation', 'What matters', 'Options', 'Analysis', 'Decision']
const disagreementLabels = { FACT: 'A fact we can check', VALUE: 'Different priorities', DEFINITION: 'Different meanings', UNKNOWN: 'Something is missing' } as const
const scenarios = {
  launch: { context: 'Should we launch the beta this Friday?', transcript: 'Maya: We need to launch this Friday. We have already slipped twice, and real user feedback is more valuable than another week of internal debate.\n\nJon: We should wait. The onboarding flow still breaks for new users and a public launch will create a first impression we cannot undo.\n\nMaya: Competitors are moving quickly.\n\nJon: We do not have enough support coverage this weekend.' },
  scope: { context: 'Should we cut scope to hit the client deadline?', transcript: 'Priya: Cutting scope protects the deadline and lets us validate the core workflow. A focused delivery is better than a late promise.\n\nLeo: Cutting scope removes the feature that makes the product valuable.\n\nLeo: We should move the deadline rather than deliver something incomplete.' },
  hiring: { context: 'Which candidate should we hire?', transcript: 'Aisha: The experienced candidate can own the role immediately and reduce the risk of missing the quarter.\n\nSam: The fast learner has stronger collaboration signals and will grow with the team.\n\nAisha: We need someone who has already handled this scale.\n\nSam: Adaptability gives us a better long-term fit.' },
} as const
const defaultTemplates: DecisionTemplate[] = [
  { id: 'product-launch', name: 'Product launch', context: scenarios.launch.context, transcript: scenarios.launch.transcript, updatedAt: '2026-01-01T00:00:00.000Z', builtIn: true },
  { id: 'project-scope', name: 'Project scope', context: scenarios.scope.context, transcript: scenarios.scope.transcript, updatedAt: '2026-01-01T00:00:00.000Z', builtIn: true },
  { id: 'hiring-choice', name: 'Hiring choice', context: scenarios.hiring.context, transcript: scenarios.hiring.transcript, updatedAt: '2026-01-01T00:00:00.000Z', builtIn: true },
]
const demoScenarioTemplates: DecisionTemplate[] = [
  { id: 'pricing-strategy', name: 'Pricing strategy', context: 'Which pricing model should we launch with?', transcript: 'Maya: A simple monthly plan is easiest for customers to understand and lets us ship pricing this week.\n\nJon: A usage-based model protects our margins as larger customers grow.\n\nMaya: Usage pricing will make the product feel unpredictable for small teams.\n\nJon: A flat plan could leave significant revenue on the table.', updatedAt: '2026-01-01T00:00:00.000Z', builtIn: true },
  { id: 'team-office', name: 'Team office location', context: 'Should our team move to a new office?', transcript: 'Maya: The new office is closer to most of the team and gives us better space for collaboration.\n\nJon: The current office is affordable and people have built routines around it.\n\nMaya: We lose time when the whole team cannot work together.\n\nJon: A move adds cost before we know whether attendance will improve.', updatedAt: '2026-01-01T00:00:00.000Z', builtIn: true },
  { id: 'website-redesign', name: 'Website redesign', context: 'Should we redesign the website this quarter?', transcript: 'Maya: The current site makes it difficult for new visitors to understand the product.\n\nJon: A redesign could distract engineering from reliability work already promised to customers.\n\nMaya: We can focus on the homepage and test whether comprehension improves.\n\nJon: We need evidence that the site is the bottleneck before committing the quarter.', updatedAt: '2026-01-01T00:00:00.000Z', builtIn: true },
]
const demoDecisionRows = [
  { id: 'demo-launch', name: 'Product launch', status: 'In progress', step: 'Options', updated: '2h ago', templateId: 'product-launch' },
  { id: 'demo-scope', name: 'Project scope', status: 'In progress', step: 'What matters', updated: '1d ago', templateId: 'project-scope' },
  { id: 'demo-pricing', name: 'Pricing strategy', status: 'Ready to decide', step: 'Analysis', updated: 'Yesterday', templateId: 'pricing-strategy' },
  { id: 'demo-hiring', name: 'Hiring choice', status: 'Decided', step: 'Decision', updated: '3d ago', templateId: 'hiring-choice' },
  { id: 'demo-office', name: 'Team office location', status: 'In progress', step: 'What matters', updated: '4d ago', templateId: 'team-office' },
  { id: 'demo-redesign', name: 'Website redesign', status: 'Archived', step: 'Decision', updated: '1w ago', templateId: 'website-redesign' },
]

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
  const [templates, setTemplates] = useState<DecisionTemplate[]>(defaultTemplates)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(false)
  const [rightWidth, setRightWidth] = useState(440)
  const [notice, setNotice] = useState('')
  const [resizing, setResizing] = useState(false)
  const selectedDecision = analysis.decisions[selectedIndex] || analysis.decisions[0]
  const generatedAt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())
  const sourceLabel = status === 'loading' ? 'analyzing' : source === 'gpt-5.6' ? 'GPT-5.6 Luna' : source === 'fallback' ? 'local fallback' : 'ready'
  const scoreClass = selectedDecision.importanceScore >= 70 ? 'high' : selectedDecision.importanceScore >= 40 ? 'medium' : 'low'

  useEffect(() => {
    try { setSavedProcesses(JSON.parse(localStorage.getItem('friction-processes') || '[]') as SavedProcess[]) } catch { setSavedProcesses([]) }
    try { const stored = JSON.parse(localStorage.getItem('friction-templates') || 'null') as DecisionTemplate[] | null; if (stored?.length) setTemplates(stored) } catch { /* Keep the built-in templates. */ }
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
  const useTemplate = (template: DecisionTemplate) => { setTitle(template.name); setContext(template.context); setTranscript(template.transcript); setSideA(''); setSideB(''); setAdvancedOpen(false); setSource('idle'); setWarning(''); setError(''); setStep(1); setPage('workspace'); setNotice(`Loaded ${template.name}`) }
  const saveTemplates = (next: DecisionTemplate[]) => { setTemplates(next); localStorage.setItem('friction-templates', JSON.stringify(next)) }

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
  const shareDecision = async (decisionTitle: string, summary: string) => {
    const text = `friction decision: ${decisionTitle}\n\n${summary}`
    try {
      if (navigator.share) await navigator.share({ title: `friction: ${decisionTitle}`, text })
      else { await writeToClipboard(text); setNotice('Decision summary copied') }
    } catch (shareError) {
      if (!(shareError instanceof DOMException && shareError.name === 'AbortError')) setNotice('Unable to share this decision')
    }
  }
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
      {page === 'welcome' && <Welcome onStart={openWorkspace} onUseTemplate={useTemplate} onOpenSaved={(saved) => { loadProcess(saved); navigate('workspace') }} onTemplates={() => navigate('templates')} templates={templates} savedProcesses={savedProcesses} />}
      {page !== 'welcome' && page !== 'workspace' && <LibraryPage page={page} savedProcesses={savedProcesses} templates={templates} onOpen={loadProcess} onStart={openWorkspace} onUseTemplate={useTemplate} onShare={shareDecision} onSaveTemplates={saveTemplates} />}
      {page === 'workspace' && <>
        <div className="workspace-head"><div className="title-block"><input className="process-title" value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Decision process title" /><p>Get clarity on what matters, see your options, and choose with confidence.</p></div><div className="head-actions"><button onClick={saveProcess}><Save size={15} /> Save</button><button onClick={shareProcess}><Share2 size={15} /> Share</button><button aria-label="More actions" onClick={() => setNotice('Use Save to keep this process for later')}><MoreHorizontal size={17} /></button>{!rightOpen && <button className="brief-open" onClick={() => setRightOpen(true)} title="Open decision brief"><PanelRight size={16} /> Open brief</button>}<button className="rail-toggle" onClick={() => setLeftOpen(true)} title="Open navigation"><ChevronRight size={16} /></button></div></div>
        <nav className="step-nav" aria-label="Decision workflow">{steps.map((label, index) => <button key={label} className={step === index + 1 ? 'active' : ''} onClick={() => setStep((index + 1) as Step)}><span>{index + 1}</span>{label}</button>)}</nav>
        {warning && <div className="warning-banner"><TriangleAlert size={15} />{warning}</div>}
        <section className="workspace-content">
          <div className="section-kicker"><span>{step === 1 ? '1.' : 'CURRENT'}</span>{step === 1 ? 'Paste your situation' : steps[step - 1]}</div>
          {step === 1 && <><p className="section-help">Add as much detail as you can. The more context, the better the analysis.</p><button className="tips"><Sparkles size={14} /> Tips</button><div className="input-wrap"><textarea className="reference-input" aria-label="Paste your situation" value={advancedOpen ? `${sideA}\n\n${sideB}` : transcript} onChange={(event) => advancedOpen ? setTranscript(event.target.value) : setTranscript(event.target.value)} maxLength={12000} placeholder="Paste your conversation or describe what is going on..." /><span className="character-count">{transcript.length} / 3000</span></div><div className="input-actions"><button className="analyze-button" onClick={analyze} disabled={status === 'loading'}>{status === 'loading' ? 'Analyzing...' : <><Sparkles size={15} /> Analyze situation</>}</button><button className="clear-button" onClick={reset}>Clear</button></div><div className="input-options"><label>Context <input value={context} onChange={(event) => setContext(event.target.value)} placeholder="Optional context" maxLength={240} /></label><select value={sample} onChange={(event) => loadSample(event.target.value)}><option value="launch">Product launch example</option><option value="scope">Project scope example</option><option value="hiring">Hiring example</option></select><button onClick={() => setAdvancedOpen(!advancedOpen)}>{advancedOpen ? 'Use one conversation' : 'Enter two sides separately'}</button></div>{error && <div className="form-error" role="alert"><TriangleAlert size={15} /> {error}</div>}</>}
          {step === 2 && <><p className="section-help">These are the forces behind the decision, ranked by how much they could change the outcome.</p><div className="drivers-grid"><div className="drivers-column"><div className="subhead"><h2>Top decision drivers</h2><button className="score-help" type="button" aria-describedby="score-help-text"><span>How we scored this</span><span className="info-dot">i</span><span className="score-tooltip" id="score-help-text" role="tooltip">Importance combines likely impact, urgency, how difficult the decision is to undo, and how much uncertainty remains.</span></button></div>{[selectedDecision.scoreReason, ...selectedDecision.options.slice(0, 4).map((option) => option.benefits[0])].slice(0, 5).map((driver, index) => <div className="driver-row" key={`${driver}-${index}`}><span>{index + 1}</span><div><strong>{index === 0 ? 'Overall importance' : selectedDecision.options[index - 1]?.title || 'Uncertainty'}</strong><small>{driver}</small></div><b>{Math.max(40, selectedDecision.importanceScore - index * 7)}</b></div>)}</div><div className="options-column"><div className="subhead"><h2>Top options <em>(ranked)</em></h2><button onClick={() => setStep(3)}>Reorder</button></div>{selectedDecision.options.map((option, index) => <OptionCard key={option.title} option={option} index={index} />)}</div></div></>}
          {step === 3 && <><p className="section-help">Compare the paths in front of you. Friction shows the upside and the risk without choosing for you.</p><div className="full-option-grid">{selectedDecision.options.map((option, index) => <OptionCard key={option.title} option={option} index={index} expanded />)}</div></>}
          {step === 4 && <><p className="section-help">A useful analysis makes the uncertainty visible and points to the next useful check.</p><div className="analysis-card"><span className="mini-label">WHY THIS MATTERS</span><h2>{selectedDecision.title}</h2><div className="large-score"><strong>{selectedDecision.importanceScore}</strong><span>/100 importance</span></div><p>{selectedDecision.situation}</p><div className="score-bar"><span className={scoreClass} style={{ width: `${selectedDecision.importanceScore}%` }} /></div><small>{selectedDecision.scoreReason}</small><div className={`disagreement-callout ${selectedDecision.disagreementType.toLowerCase()}`}><div className="tension-type"><span className="mini-label">THE DISAGREEMENT IS ABOUT</span><strong>{disagreementLabels[selectedDecision.disagreementType]}</strong></div><div><span className="mini-label">WHAT TO CHECK NEXT</span><p>{selectedDecision.whatWouldHelp}</p></div></div></div><button className="next-link" onClick={() => setStep(5)}>Make a decision <ArrowRight size={15} /></button></>}
          {step === 5 && <><p className="section-help">Turn the decision into something you can share, revisit, and act on.</p><div className="decision-panel"><span className="mini-label">THE NEXT QUESTION</span><h2>{selectedDecision.nextQuestion}</h2><div className="executor-fields"><label><span><UserRound size={13} /> Owner</span><input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="Name the person" /></label><label><span><CalendarDays size={13} /> Review date</span><input type="date" value={reviewDate} onChange={(event) => setReviewDate(event.target.value)} /></label></div><div className="decision-actions"><button className="analyze-button" onClick={copyDecisionBrief}><Clipboard size={15} /> {copied ? 'Copied' : 'Copy decision brief'}</button><button className="outline-button" onClick={() => window.print()}><Download size={15} /> Download PDF</button><button className="outline-button" onClick={() => window.print()}><Printer size={15} /> Print</button></div></div></>}
          <div className="generated-note"><span className={`analysis-dot ${source === 'gpt-5.6' ? 'live' : ''}`} /> {source === 'gpt-5.6' ? 'GPT-5.6 Luna analysis' : source === 'fallback' ? 'Local fallback analysis' : 'Ready for analysis'} <span className="privacy-copy"><LockKeyhole size={13} /> Your data is private and not stored.</span></div>
        </section>
      </>}
      </main>
      {page === 'workspace' && <>
      <aside className="brief-panel"><div className="brief-resize-handle" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setResizing(true) }} title="Drag to resize brief" /><div className="brief-heading"><div><h2>Decision brief</h2><p>A printable summary of your decision.</p></div><div className="brief-controls"><button onClick={() => setRightOpen(false)} title="Close brief"><X size={15} /></button></div></div><div className="brief-paper"><span className="paper-kicker">DECISION BRIEF</span><h2>{selectedDecision.title}</h2><div className="paper-rule" /><strong className="paper-section-title">Decision</strong><div className="recommendation"><Sparkles size={16} /><div><b>Recommended: Option A</b><span>{selectedDecision.options[0].title}</span></div></div><strong className="paper-section-title">Why</strong><p>{selectedDecision.situation}</p><strong className="paper-section-title">Top factors</strong><ul>{selectedDecision.options.slice(0, 3).map((option, index) => <li key={option.title}>{option.title} ({Math.max(40, selectedDecision.importanceScore - index * 7)})</li>)}</ul><strong className="paper-section-title">Options at a glance</strong><div className="paper-table">{selectedDecision.options.map((option, index) => <div key={option.title}><span>{String.fromCharCode(65 + index)}</span><b>{option.title}</b><em>{Math.max(40, selectedDecision.importanceScore - index * 9)}</em></div>)}</div><div className="paper-meta"><span>Generated<strong>{generatedAt}</strong></span><span>Prepared by<strong>friction</strong></span></div></div><button className="download-button" onClick={() => window.print()}><Download size={15} /> Download PDF</button><button className="print-button" onClick={() => window.print()}><Printer size={15} /> Print</button><div className="brief-private"><LockKeyhole size={13} /> Your data is private and never shared.</div></aside>
      {notice && <div className="toast" role="status">{notice}</div>}
      <div className="print-only"><article className="print-document"><header className="print-header"><div className="print-brand"><span>f</span><strong>friction</strong></div><span className="print-header-label">DECISION BRIEF</span></header><section className="print-hero"><span className="paper-kicker">DECISION CLARITY</span><h1>{selectedDecision.title}</h1><p>One clear view of what matters, what could change the decision, and the paths in front of you.</p></section><section className="print-summary"><div><span className="print-label">IMPORTANCE</span><strong>{selectedDecision.importanceScore}<small>/100</small></strong></div><div><span className="print-label">GENERATED</span><b>{generatedAt}</b></div><div><span className="print-label">PREPARED BY</span><b>friction</b></div></section><section className="print-section print-recommendation"><span className="print-label">RECOMMENDED PATH</span><h2>{selectedDecision.options[0].title}</h2><p>{selectedDecision.situation}</p></section><section className="print-section"><span className="print-label">WHY THIS MATTERS</span><p>{selectedDecision.scoreReason}</p></section><section className="print-section"><span className="print-label">OPTIONS AT A GLANCE</span><div className="print-options">{selectedDecision.options.map((option, index) => <div className="print-option" key={option.title}><div className="print-option-heading"><span>{String.fromCharCode(65 + index)}</span><h3>{option.title}</h3><b>{Math.max(40, selectedDecision.importanceScore - index * 9)}</b></div><p>{option.description}</p><div className="print-tradeoffs"><span><b>Upside</b>{option.benefits.join('; ')}</span><span><b>Risk</b>{option.drawbacks.join('; ')}</span></div></div>)}</div></section><section className="print-next"><span className="print-label">NEXT QUESTION</span><h2>{selectedDecision.nextQuestion}</h2><div className="print-owner"><span>Owner <b>{owner || 'Unassigned'}</b></span><span>Review date <b>{reviewDate || 'Not set'}</b></span></div></section><footer className="print-footer"><span>friction / decision clarity</span><span>Your data is private and never shared.</span></footer></article></div>
      </>}
    </div>
  </div>
}

function Welcome({ onStart, onUseTemplate, onOpenSaved, onTemplates, templates, savedProcesses }: { onStart: () => void; onUseTemplate: (template: DecisionTemplate) => void; onOpenSaved: (saved: SavedProcess) => void; onTemplates: () => void; templates: DecisionTemplate[]; savedProcesses: SavedProcess[] }) {
  const demoTemplates = templates.slice(0, 3)
  const latest = savedProcesses[0]
  return <section className="welcome-page"><div className="welcome-dashboard-head"><div className="welcome-brand"><div className="welcome-mark">f</div><strong>Friction</strong></div><button className="welcome-new-button" onClick={onStart}><Plus size={15} /> New decision <ArrowRight size={14} /></button></div><div className="welcome-dashboard-intro"><span className="welcome-kicker">DECISION CLARITY / TODAY</span><h1>Clarity today.<br /><em>Confidence tomorrow.</em></h1><p>Turn a messy conversation or a difficult choice into clear options you can act on.</p><button className="welcome-button" onClick={onStart}>Start a new decision <ArrowRight size={17} /></button></div><div className="welcome-dashboard-cards"><div className="welcome-continue-card">{latest ? <><span className="card-eyebrow">CONTINUE DECISION</span><strong>{latest.title}</strong><small>Saved {new Date(latest.updatedAt).toLocaleDateString()} · Ready to revisit</small><button onClick={() => onOpenSaved(latest)}>Open decision <ArrowRight size={14} /></button></> : <><span className="card-eyebrow">A SIMPLE START</span><strong>Bring Friction a decision.</strong><small>Paste what is happening and let the analysis reveal what matters.</small><button onClick={onStart}>Open workspace <ArrowRight size={14} /></button></>}</div><div className="welcome-how-card"><span className="card-eyebrow">HOW IT WORKS</span><div><b>01</b><span>Describe the situation</span></div><div><b>02</b><span>Compare what matters</span></div><div><b>03</b><span>Choose a path forward</span></div></div></div><div className="welcome-section-head"><div><span className="card-eyebrow">TRY A SCENARIO</span><h2>See Friction in action.</h2></div><button onClick={onTemplates}>View templates <ArrowRight size={14} /></button></div><div className="welcome-demo-grid">{demoTemplates.map((template) => <button key={template.id} onClick={() => onUseTemplate(template)}><span>{template.name}</span><small>{template.context}</small><b>Try it <ArrowRight size={14} /></b></button>)}</div></section>
}

function LibraryPage({ page, savedProcesses, templates, onOpen, onStart, onUseTemplate, onShare, onSaveTemplates }: { page: Exclude<AppPage, 'welcome' | 'workspace'>; savedProcesses: SavedProcess[]; templates: DecisionTemplate[]; onOpen: (saved: SavedProcess) => void; onStart: () => void; onUseTemplate: (template: DecisionTemplate) => void; onShare: (title: string, summary: string) => void; onSaveTemplates: (templates: DecisionTemplate[]) => void }) {
  const copy = { all: ['All decisions', 'Every decision process saved in this browser.'], team: ['Team decisions', 'A calm place to prepare a decision before sharing it with your team.'], templates: ['Templates', 'Start with a clear shape for the decision in front of you.'], journal: ['Journal', 'Private notes for the questions and patterns you want to remember.'] }[page]
  return <section className="library-page"><div className="library-header"><span className="welcome-kicker">FRICTION WORKSPACE</span><h1>{copy[0]}</h1><p>{copy[1]}</p></div>{page === 'all' && <AllDecisions savedProcesses={savedProcesses} templates={templates} onOpen={onOpen} onStart={onStart} onUseTemplate={onUseTemplate} onShare={onShare} />}{page === 'team' && <div className="feature-page"><Users size={29} /><h2>Prepare decisions for a better conversation.</h2><p>Use Friction before a meeting to turn scattered opinions into a shared starting point. Saved processes stay in this browser until you choose to share them.</p><button onClick={onStart}>Start a team decision <ArrowRight size={16} /></button></div>}{page === 'templates' && <TemplateLibrary templates={templates} onUse={onUseTemplate} onSave={onSaveTemplates} />}{page === 'journal' && <JournalPage />}</section>
}

const starterNotes: JournalNote[] = [
  { id: 'starter-launch', title: 'Product launch', content: 'Narrowing the focus to a tighter MVP feels right. The earliest users cared most about speed and simplicity.', tag: 'Product launch', updatedAt: '2026-05-14T09:41:00.000Z' },
  { id: 'starter-career', title: 'Career', content: 'Exploring a move into product strategy. I am energized by solving ambiguous problems and working across teams.', tag: 'Career', updatedAt: '2026-05-10T16:22:00.000Z' },
  { id: 'starter-reflection', title: 'Reflection', content: 'Grateful for time with family this weekend. It helped me reset and come back with more clarity.', tag: 'Reflection', updatedAt: '2026-05-06T08:15:00.000Z' },
]

function JournalPage() {
  const [notes, setNotes] = useState<JournalNote[]>(starterNotes)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tag, setTag] = useState('Reflection')
  const [query, setQuery] = useState('')
  const [saved, setSaved] = useState(false)
  useEffect(() => { try { const stored = JSON.parse(localStorage.getItem('friction-journal-notes') || 'null') as JournalNote[] | null; if (stored?.length) setNotes(stored) } catch { /* Keep starter notes. */ } }, [])
  const persist = (next: JournalNote[]) => { setNotes(next); localStorage.setItem('friction-journal-notes', JSON.stringify(next)) }
  const newNote = () => { setActiveId(null); setTitle(''); setContent(''); setTag('Reflection'); setSaved(false) }
  const editNote = (note: JournalNote) => { setActiveId(note.id); setTitle(note.title); setContent(note.content); setTag(note.tag); setSaved(false) }
  const saveNote = () => { if (!title.trim() || !content.trim()) return; const nextNote = { id: activeId || crypto.randomUUID(), title: title.trim(), content: content.trim(), tag: tag.trim() || 'Reflection', updatedAt: new Date().toISOString() }; persist([nextNote, ...notes.filter((note) => note.id !== nextNote.id)]); setActiveId(nextNote.id); setSaved(true) }
  const visibleNotes = notes.filter((note) => `${note.title} ${note.content} ${note.tag}`.toLowerCase().includes(query.toLowerCase()))
  const prompts = [{ label: 'What keeps resurfacing?', icon: RefreshCw, value: 'What keeps resurfacing?\n\n' }, { label: 'What did I learn today?', icon: Sun, value: 'What did I learn today?\n\n' }, { label: 'What would I do differently?', icon: SlidersHorizontal, value: 'What would I do differently?\n\n' }]
  return <div className="journal-workspace"><div className="journal-topbar"><div><span className="welcome-kicker">FRICTION WORKSPACE</span><h2>Journal</h2><p>Private notes for the questions and patterns you want to remember.</p></div><div className="journal-top-actions"><div className="journal-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes" aria-label="Search notes" /></div><button className="analyze-button" onClick={newNote}><Pencil size={15} /> New note</button></div></div><div className="journal-columns"><section className="journal-composer"><div className="journal-composer-head"><h2>What's on your mind?</h2><Maximize2 size={15} /></div><div className="journal-formatbar"><span>Paragraph</span><b>B</b><em>I</em><span>• list</span><span>1. list</span><span>“</span><span>↗</span></div><textarea value={content} onChange={(event) => { setContent(event.target.value); setSaved(false) }} placeholder="Start writing..." aria-label="Journal note" /><div className="journal-note-fields"><input value={title} onChange={(event) => { setTitle(event.target.value); setSaved(false) }} placeholder="Note title" aria-label="Note title" /><select value={tag} onChange={(event) => setTag(event.target.value)} aria-label="Note tag"><option>Reflection</option><option>Product launch</option><option>Career</option><option>Personal</option></select></div><div className="journal-prompts">{prompts.map(({ label, icon: Icon, value }) => <button key={label} onClick={() => setContent((current) => current ? `${current}\n\n${value}` : value)}><Icon size={14} />{label}</button>)}</div><div className="journal-savebar"><span><LockKeyhole size={15} /> Private to you</span><button className="analyze-button" onClick={saveNote} disabled={!title.trim() || !content.trim()}><Save size={15} /> Save note</button><span className={saved ? 'journal-saved' : ''}><CheckCircle2 size={15} /> {saved ? 'Saved just now' : 'Not saved yet'}</span></div></section><section className="journal-recent"><div className="journal-recent-head"><h2>Recent notes</h2><button title="Journal filters"><SlidersHorizontal size={16} /></button></div>{visibleNotes.length ? visibleNotes.map((note, index) => <article className="journal-note-card" key={note.id} onClick={() => editNote(note)}><div className={`journal-note-icon note-${index % 3}`}><TargetIcon index={index} /></div><div className="journal-note-body"><h3>{note.title}</h3><p>{note.content}</p><span>{note.tag}</span></div><time>{new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}<br />{new Date(note.updatedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</time><button title={`Edit ${note.title}`} aria-label={`Edit ${note.title}`} onClick={(event) => { event.stopPropagation(); editNote(note) }}><MoreHorizontal size={16} /></button></article>) : <div className="journal-empty">No notes match your search.</div>}</section></div></div>
}

function TargetIcon({ index }: { index: number }) { return index % 3 === 0 ? <BriefcaseBusiness size={17} /> : index % 3 === 1 ? <Sun size={17} /> : <Leaf size={17} /> }

function AllDecisions({ savedProcesses, templates, onOpen, onStart, onUseTemplate, onShare }: { savedProcesses: SavedProcess[]; templates: DecisionTemplate[]; onOpen: (saved: SavedProcess) => void; onStart: () => void; onUseTemplate: (template: DecisionTemplate) => void; onShare: (title: string, summary: string) => void }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [newestFirst, setNewestFirst] = useState(true)
  const availableTemplates = [...templates, ...demoScenarioTemplates]
  const savedRows = savedProcesses.map((saved) => ({ id: saved.id, name: saved.title, status: saved.selectedIndex >= 4 ? 'Ready to decide' : 'In progress', step: steps[saved.selectedIndex] || 'Situation', updated: new Date(saved.updatedAt).toLocaleDateString(), saved }))
  const rows = [...demoDecisionRows.map((row) => ({ ...row, saved: undefined })), ...savedRows]
    .filter((row) => statusFilter === 'All' || row.status === statusFilter)
    .filter((row) => row.name.toLowerCase().includes(query.toLowerCase()))
  if (!newestFirst) rows.reverse()
  return <div className="all-decisions"><div className="decision-library-toolbar"><div className="decision-filters">{['All', 'In progress', 'Ready to decide', 'Decided', 'Archived'].map((filter) => <button key={filter} className={statusFilter === filter ? 'active' : ''} onClick={() => setStatusFilter(filter)}>{filter}</button>)}</div><div className="decision-toolbar-actions"><button onClick={() => setStatusFilter(statusFilter === 'All' ? 'In progress' : 'All')}><Filter size={14} /> Filter</button><button onClick={() => setNewestFirst(!newestFirst)}><ArrowUpDown size={14} /> Sort</button></div></div><div className="decision-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search decisions..." aria-label="Search decisions" /></div><div className="decision-table" role="table" aria-label="All decisions"><div className="decision-table-head" role="row"><span>Decision</span><span>Status</span><span>Step</span><span>Updated</span><span>Owner</span><span>Share</span></div>{rows.length ? rows.map((row) => <div className="decision-table-row" key={row.id} role="button" tabIndex={0} onClick={() => row.saved ? (onOpen(row.saved), onStart()) : onUseTemplate(availableTemplates.find((template) => template.id === row.templateId) || availableTemplates[0])} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); row.saved ? (onOpen(row.saved), onStart()) : onUseTemplate(availableTemplates.find((template) => template.id === row.templateId) || availableTemplates[0]) } }}><strong>{row.name}</strong><span className={`status-pill ${row.status.toLowerCase().replace(/ /g, '-')}`}>{row.status}</span><span>{row.step}</span><span>{row.updated}</span><span className="owner-cell"><i>S</i> You</span><button className="decision-share" aria-label={`Share ${row.name}`} title={`Share ${row.name}`} onClick={(event) => { event.stopPropagation(); onShare(row.name, row.saved ? row.saved.analysis.decisions[0]?.situation || row.saved.context : availableTemplates.find((template) => template.id === row.templateId)?.context || '') }}><Share2 size={14} /></button></div>) : <div className="decision-empty"><FileText size={20} /><strong>No decisions match this view.</strong><small>Try another filter or start a new decision.</small></div>}</div><button className="new-decision-row" onClick={onStart}><Plus size={15} /> Make a new decision</button></div>
}

function TemplateLibrary({ templates, onUse, onSave }: { templates: DecisionTemplate[]; onUse: (template: DecisionTemplate) => void; onSave: (templates: DecisionTemplate[]) => void }) {
  const [editing, setEditing] = useState<DecisionTemplate | null>(null)
  const [form, setForm] = useState({ name: '', context: '', transcript: '' })
  const beginCreate = () => { setEditing({ id: crypto.randomUUID(), name: '', context: '', transcript: '', updatedAt: new Date().toISOString() }); setForm({ name: '', context: '', transcript: '' }) }
  const beginEdit = (template: DecisionTemplate) => { setEditing(template); setForm({ name: template.name, context: template.context, transcript: template.transcript }) }
  const save = () => {
    const current = editing
    if (!current || !form.name.trim() || !form.context.trim() || !form.transcript.trim()) return
    const next = { ...current, name: form.name.trim(), context: form.context.trim(), transcript: form.transcript.trim(), updatedAt: new Date().toISOString() }
    onSave(current.builtIn ? templates.map((template) => template.id === current.id ? next : template) : [next, ...templates.filter((template) => template.id !== current.id)])
    setEditing(null)
  }
  const remove = (template: DecisionTemplate) => { if (template.builtIn) return; onSave(templates.filter((item) => item.id !== template.id)) }
  return <>{<div className="template-toolbar"><div><strong>Your starting points</strong><small>Save the prompts you return to most.</small></div><button className="analyze-button" onClick={beginCreate}><Plus size={15} /> New template</button></div>}<div className="template-grid">{templates.map((template, index) => <article className="template-card" key={template.id}><button className="template-card-main" onClick={() => onUse(template)}><span>{String(index + 1).padStart(2, '0')} {template.builtIn ? 'BUILT IN' : 'YOUR TEMPLATE'}</span><strong>{template.name}</strong><small>{template.context}</small><b>Use template <ArrowRight size={14} /></b></button><div className="template-card-actions"><button onClick={() => beginEdit(template)} title={`Edit ${template.name}`} aria-label={`Edit ${template.name}`}><Pencil size={14} /></button>{!template.builtIn && <button onClick={() => remove(template)} title={`Delete ${template.name}`} aria-label={`Delete ${template.name}`}><Trash2 size={14} /></button>}</div></article>)}</div>{editing && <div className="template-editor-backdrop" onMouseDown={() => setEditing(null)}><div className="template-editor" role="dialog" aria-modal="true" aria-labelledby="template-editor-title" onMouseDown={(event) => event.stopPropagation()}><div className="template-editor-head"><div><span className="welcome-kicker">TEMPLATE EDITOR</span><h2 id="template-editor-title">{editing.name ? 'Edit template' : 'New template'}</h2></div><button onClick={() => setEditing(null)} aria-label="Close template editor"><X size={17} /></button></div><label>Template name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Difficult conversation" maxLength={60} /></label><label>Decision prompt<input value={form.context} onChange={(event) => setForm({ ...form, context: event.target.value })} placeholder="What decision are you trying to make?" maxLength={240} /></label><label>Starting situation<textarea value={form.transcript} onChange={(event) => setForm({ ...form, transcript: event.target.value })} placeholder="Paste a conversation or describe what is going on..." maxLength={12000} /></label><div className="template-editor-actions"><button className="outline-button" onClick={() => setEditing(null)}>Cancel</button><button className="analyze-button" onClick={save} disabled={!form.name.trim() || !form.context.trim() || !form.transcript.trim()}><Save size={15} /> Save template</button></div></div></div>}</>
}

function OptionCard({ option, index, expanded = false }: { option: ConflictAnalysis['decisions'][number]['options'][number]; index: number; expanded?: boolean }) {
  return <article className={`reference-option ${expanded ? 'expanded' : ''}`}><div className="option-top"><span>{String.fromCharCode(65 + index)}</span><div><h3>{option.title}</h3><p>{option.description}</p></div><b>{Math.max(40, 78 - index * 12)}</b></div><div className="option-tags"><span className="upside">↑ Upside</span><em>{option.benefits[0]}</em><span className="risk">↓ Risk</span><em>{option.drawbacks[0]}</em></div>{expanded && <div className="expanded-tradeoffs"><div><strong>Benefits</strong><ul>{option.benefits.map((item) => <li key={item}>{item}</li>)}</ul></div><div><strong>Drawbacks</strong><ul>{option.drawbacks.map((item) => <li key={item}>{item}</li>)}</ul></div></div>}</article>
}

export default App
