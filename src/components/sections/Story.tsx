import { ArrowDown, ArrowDownRight, ArrowRight, ClipboardCheck, Fingerprint, Globe2, Landmark, ListChecks, ScanLine, Scale, ShieldCheck, UsersRound, LockKeyhole, FileSearch, Network } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'

export function Eyebrow({ children, index }: { children: string; index?: string }) {
  return <p className="eyebrow">{index ? <span className="chapter-number">{index}</span> : <span className="signal" aria-hidden="true" />}{children}</p>
}

export function Hero() {
  const reduced = useReducedMotion()
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="shell hero-shell">
        <motion.div className="hero-copy" initial={reduced ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <div className="hero-scroll-copy">
            <Eyebrow>Responsible gambling platform</Eyebrow>
            <h1 id="hero-title">Responsible<br />Gambling.<br />Stronger Compliance.<br /><em>Safer Communities.</em></h1>
            <p className="hero-description">A secure, policy-driven platform supporting responsible gambling, operator verification and regulatory accountability across South Africa.</p>
            <div className="actions">
              <a className="button primary" href="#about">About Lebati <ArrowDownRight size={17} /></a>
              <a className="button secondary" href="#process">How It Works <ArrowRight size={17} /></a>
            </div>
          </div>
        </motion.div>
        <div className="hero-instrument" aria-hidden="true">
          <span className="instrument-top"><i /> FIELD VIEW <b>ZA / 01</b></span>
          <span className="instrument-bottom"><Globe2 size={14} /> SOUTH AFRICA <i /> RESPONSIBLE ACCESS NETWORK</span>
        </div>
        <div className="hero-footer">
          <a href="#about"><span className="down-icon"><ArrowDown size={15} /></span> SCROLL TO EXPLORE</a>
          <span className="hero-footer-note">TECHNOLOGY <i /> POLICY <i /> GOVERNANCE</span>
        </div>
      </div>
    </section>
  )
}

const trust = [
  { icon: ShieldCheck, title: 'Responsible Gambling Access' },
  { icon: Landmark, title: 'Regulatory Compliance' },
  { icon: UsersRound, title: 'Safer Communities' },
]

export function About() {
  return (
    <section id="about" className="about section" aria-labelledby="about-title">
      <div className="shell about-shell">
        <div className="section-copy about-copy">
          <Eyebrow index="02">About Lebati</Eyebrow>
          <h2 id="about-title">A trusted platform for responsible gambling regulation in <em>South Africa.</em></h2>
          <p>Lebati brings together technology, policy and governance to help manage gambling access, support responsible play and enable authorised operators to meet their regulatory and compliance obligations.</p>
        </div>
        <ul className="trust-grid">
          {trust.map(({ icon: Icon, title }) => <li key={title} className="glass trust-card"><Icon size={23} strokeWidth={1.5} /><span>{title}</span></li>)}
        </ul>
        <div className="about-art world-frame" aria-hidden="true"><span className="instrument-top"><i /> NETWORK TOPOLOGY <b>ZA / 02</b></span></div>
      </div>
    </section>
  )
}

const steps = [
  { icon: Fingerprint, title: 'Verify Identity', text: 'Confirm identity using secure OTP and supported identity verification services.' },
  { icon: ListChecks, title: 'Evaluate Policy', text: 'Evaluate approved responsible gambling policies and applicable restrictions.' },
  { icon: ScanLine, title: 'Return a Decision', text: 'Provide a policy-driven outcome.', outcomes: ['PROCEED', 'RESTRICT', 'REVIEW_REQUIRED', 'UNAVAILABLE'] },
  { icon: ClipboardCheck, title: 'Maintain Compliance', text: 'Maintain audit trails, evidence and review history for accountability.' },
]

export function Process({ active, onStep, immersive }: { active: number; onStep: (step: number) => void; immersive: boolean }) {
  const [selected, setSelected] = useState(0)
  const current = immersive ? active : selected
  return (
    <section id="process" className="process section" aria-labelledby="process-title">
      <div className="process-pin">
        <div className="shell process-stage">
          <div className="section-copy">
            <Eyebrow index="03">How it works</Eyebrow>
            <h2 id="process-title">A simple, secure and <em>policy-driven</em> process.</h2>
            <p>An illustrative workflow for authorised operators.</p>
          </div>
          {immersive && (
            <>
              <div className="process-art world-frame" aria-hidden="true"><span className="instrument-top"><i /> VERIFICATION SEQUENCE <b>0{active + 1} / 04</b></span></div>
              <div className="process-detail" id="process-detail">
                <p className="process-count">Stage 0{active + 1} / 04</p>
                <h3>{steps[active].title}</h3><p>{steps[active].text}</p>
                {steps[active].outcomes && <ul className="outcomes">{steps[active].outcomes.map(outcome => <li key={outcome}>{outcome}</li>)}</ul>}
              </div>
            </>
          )}
          <ol className="steps">
            {steps.map(({ icon: Icon, title, text, outcomes }, index) => (
              <li key={title} className={`glass step ${index === current ? 'step-active' : ''}`}>
                <div className="step-meta"><span className="icon-box"><Icon size={24} strokeWidth={1.5} /></span><span>0{index + 1}</span></div>
                <h3><button type="button" aria-controls={immersive ? 'process-detail' : undefined} aria-pressed={index === current} onClick={() => {
                  if (immersive) onStep(index)
                  else setSelected(index)
                }}>{title}</button></h3>
                {!immersive && <p>{text}</p>}
                {!immersive && outcomes && <ul className="outcomes">{outcomes.map(outcome => <li key={outcome}>{outcome}</li>)}</ul>}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

const capabilities = [
  { icon: Network, title: 'Registry Management', text: 'Maintain records of restrictions and their review status in one place.' },
  { icon: ShieldCheck, title: 'Operator Verification', text: 'Support identity checks and consistent access decisions for authorised operators.' },
  { icon: ClipboardCheck, title: 'Compliance Reporting', text: 'Document decisions and supporting evidence for audits and regulatory oversight.' },
  { icon: Scale, title: 'Appeals and Reviews', text: 'Route cases for human review and keep a record of the outcome.' },
]

export function Capabilities() {
  return (
    <section id="capabilities" className="capabilities section" aria-labelledby="capabilities-title">
      <div className="shell capabilities-shell">
        <div className="section-copy">
          <Eyebrow index="04">Core capabilities</Eyebrow>
          <h2 id="capabilities-title">A complete responsible gambling <em>compliance solution.</em></h2>
          <p>Four capabilities designed to support the work of authorised operators and oversight teams.</p>
        </div>
        <div className="capabilities-art world-frame" aria-hidden="true"><span className="instrument-top"><i /> COMPLIANCE SYSTEMS <b>ZA / 04</b></span></div>
        <div className="capability-grid">
          {capabilities.map(({ icon: Icon, title, text }, index) => (
            <article key={title} className="capability">
              <div className="capability-meta"><span className="icon-box"><Icon size={25} strokeWidth={1.5} /></span><span>0{index + 1}</span></div>
              <h3>{title}</h3><p>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

const principles = [
  { icon: LockKeyhole, title: 'Data Protection', text: 'Limit personal information to what each workflow requires.' },
  { icon: ShieldCheck, title: 'Controlled Access', text: 'Restrict sensitive workflows to authorised roles.' },
  { icon: FileSearch, title: 'Human Oversight', text: 'Refer cases that require judgement to a human reviewer.' },
]

export function Governance() {
  return (
    <section id="governance" className="governance section" aria-labelledby="governance-title">
      <div className="shell governance-shell">
        <div className="section-copy">
          <Eyebrow index="04">Security & governance</Eyebrow>
          <h2 id="governance-title">Built on trust, privacy and <em>oversight.</em></h2>
          <ul className="principles">
            {principles.map(({ icon: Icon, title, text }) => <li key={title}><span className="icon-box"><Icon size={21} strokeWidth={1.5} /></span><div><h3>{title}</h3><p>{text}</p></div></li>)}
          </ul>
        </div>
        <div className="governance-art" aria-hidden="true"><span className="instrument-top"><i /> PROTECTIVE SYSTEM <b>ZA / 04</b></span></div>
      </div>
    </section>
  )
}
