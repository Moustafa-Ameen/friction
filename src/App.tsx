import { useState } from 'react'
import { ArrowRight, ChevronDown, CircleHelp, FileText, Lightbulb, LockKeyhole, Play, RotateCcw, Sparkles, TriangleAlert } from 'lucide-react'

type Side = { name: string; accent: string; summary: string; points: string[] }

const example = {
  topic: 'Should we launch the beta this Friday?',
  sideA: `We need to launch this Friday. We have already slipped twice, our competitors are moving quickly, and real user feedback is more valuable than another week of internal debate. The bugs we have left are visible but manageable.`,
  sideB: `We should wait. The onboarding flow still breaks for new users and a public launch will create a first impression we cannot undo. We do not have enough support coverage this weekend to respond properly.`,
}

const analysis = {
  sides: [
    { name: 'Launch now', accent: 'coral', summary: 'Speed creates learning before the window closes.', points: ['Competitors are moving quickly', 'Feedback is more valuable than debate', 'Remaining bugs are manageable'] },
    { name: 'Wait one week', accent: 'teal', summary: 'Trust is harder to rebuild than a deadline.', points: ['Onboarding still breaks for new users', 'A poor first impression is sticky', 'Weekend support coverage is thin'] },
  ] as Side[],
  shared: ['The team needs real user feedback', 'The opportunity window is moving', 'A completely open-ended delay is unacceptable'],
  faultlines: [
    { label: 'FACT', title: 'How harmful are the remaining bugs?', detail: 'The disagreement is about severity, not whether bugs exist.', color: 'gold' },
    { label: 'VALUE', title: 'Speed vs. first impression', detail: 'Both sides are protecting the product, but optimizing for different risks.', color: 'coral' },
    { label: 'UNKNOWN', title: 'Can support absorb a small launch?', detail: 'No one has tested the weekend coverage assumption.', color: 'teal' },
  ],
  resolution: {
    title: 'Run a controlled beta, not a public launch',
    body: 'Invite 25 existing users on Friday, gate the broken onboarding path, and monitor support volume for 48 hours. You get evidence without spending your reputation.',
    steps: ['Cap the beta at 25 users', 'Disable the unstable onboarding path', 'Review support volume Monday morning'],
  },
}

function App() {
  const [topic, setTopic] = useState(example.topic)
  const [sideA, setSideA] = useState(example.sideA)
  const [sideB, setSideB] = useState(example.sideB)
  const [analyzed, setAnalyzed] = useState(true)

  const loadExample = () => {
    setTopic(example.topic); setSideA(example.sideA); setSideB(example.sideB); setAnalyzed(true)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top"><span className="brand-mark">F</span><span>friction</span></a>
        <div className="topbar-right"><span className="status-dot" /> local analysis mode <button className="icon-button" title="Privacy information"><LockKeyhole size={16} /></button></div>
      </header>

      <main id="top">
        <section className="hero container">
          <div className="eyebrow"><span className="eyebrow-line" /> CONFLICT, MADE LEGIBLE</div>
          <h1>Find the disagreement<br /><em>underneath</em> the argument.</h1>
          <p className="hero-copy">Friction separates facts from assumptions, reveals what people still share, and finds the next move that can get a decision unstuck.</p>
        </section>

        <section className="workspace container">
          <div className="input-panel panel">
            <div className="panel-heading"><div><span className="step">01</span><h2>Bring us the friction</h2></div><button className="text-button" onClick={loadExample}><RotateCcw size={14} /> Load example</button></div>
            <label>What is the decision?</label>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} />
            <div className="sides-grid">
              <div className="side-input"><div className="field-label"><span className="side-dot coral-dot" /> Side A</div><textarea value={sideA} onChange={(e) => setSideA(e.target.value)} /></div>
              <div className="side-input"><div className="field-label"><span className="side-dot teal-dot" /> Side B</div><textarea value={sideB} onChange={(e) => setSideB(e.target.value)} /></div>
            </div>
            <button className="analyze-button" onClick={() => setAnalyzed(true)}><Sparkles size={17} /> Compile the conflict <ArrowRight size={17} /></button>
            <div className="privacy-note"><LockKeyhole size={13} /> Your text stays in this browser in local mode.</div>
          </div>

          {analyzed && <section className="results" aria-live="polite">
            <div className="results-heading"><div><span className="step">02</span><h2>The conflict, compiled</h2></div><span className="confidence"><span /> Analysis confidence 87%</span></div>
            <div className="decision-banner"><div><span className="mini-label">DECISION UNDER REVIEW</span><h3>{topic}</h3></div><div className="decision-icon"><TriangleAlert size={19} /></div></div>

            <div className="sides-grid result-sides">{analysis.sides.map((side) => <article className="side-card" key={side.name}><div className={`card-top ${side.accent}`}><span className="side-dot" /><span>{side.name}</span><span className="perspective">PERSPECTIVE</span></div><p>{side.summary}</p><ul>{side.points.map((point) => <li key={point}>{point}</li>)}</ul></article>)}</div>

            <div className="shared-strip"><div className="shared-title"><span className="shared-icon">∩</span><div><span className="mini-label">WHAT BOTH SIDES SHARE</span><strong>There is more common ground than it feels like.</strong></div></div><div className="shared-items">{analysis.shared.map((item) => <span key={item}>{item}</span>)}</div></div>

            <div className="section-heading"><div><span className="step">03</span><h2>Where the friction lives</h2></div><button className="icon-button" title="What do these labels mean?"><CircleHelp size={17} /></button></div>
            <div className="faultline-grid">{analysis.faultlines.map((line) => <article className={`faultline ${line.color}`} key={line.title}><span className="fault-label">{line.label}</span><h3>{line.title}</h3><p>{line.detail}</p></article>)}</div>

            <div className="resolution-panel"><div className="resolution-intro"><div className="resolution-icon"><Lightbulb size={21} /></div><div><span className="mini-label">A WAY THROUGH</span><h2>{analysis.resolution.title}</h2><p>{analysis.resolution.body}</p></div></div><div className="resolution-steps">{analysis.resolution.steps.map((step, index) => <div className="resolution-step" key={step}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step}</strong></div>)}</div><button className="outline-button"><Play size={15} /> Practice this resolution</button></div>

            <div className="footer-note"><FileText size={15} /> Generated from the two perspectives you provided <span>•</span> Nothing here decides who is right.</div>
          </section>}
        </section>
      </main>
      <footer className="footer container"><span>FRICTION / 01</span><span>Make the disagreement legible.</span></footer>
    </div>
  )
}

export default App
