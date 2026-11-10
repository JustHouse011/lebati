import { ArrowDownRight, ArrowRight, Globe2, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const navLinks = [
  { id: 'about', label: 'About' },
  { id: 'process', label: 'How it works' },
  { id: 'capabilities', label: 'Capabilities' },
  { id: 'governance', label: 'Governance' },
]
const sceneLinks = [
  { id: 'top', label: 'Introduction', rail: 'Intro' },
  { id: 'about', label: 'About' },
  { id: 'process', label: 'Verification' },
  { id: 'capabilities', label: 'Capabilities & governance', rail: 'Systems' },
  { id: 'contact', label: 'Contact' },
]

export function Navbar({ active }: { active: string }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        document.getElementById('nav-toggle')?.focus()
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open])

  return (
    <header className="site-header">
      <div className="header-inner">
        <a href="#top" className="wordmark" aria-label="Lebati home" onClick={() => setOpen(false)}>lebati<span>.</span></a>
        <button id="nav-toggle" className="nav-toggle" type="button" aria-controls="site-nav" aria-expanded={open} onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'}>
          {open ? <X /> : <Menu />}
        </button>
        <nav id="site-nav" className={open ? 'site-nav is-open' : 'site-nav'} aria-label="Main navigation">
          {navLinks.map(({ id, label }) => <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined} onClick={() => setOpen(false)}>{label}</a>)}
          <a className="nav-contact" href="#contact" aria-current={active === 'contact' ? 'location' : undefined} onClick={() => setOpen(false)}>Get in touch <ArrowDownRight size={15} /></a>
        </nav>
      </div>
    </header>
  )
}

export function ScrollProgress({ active }: { active: string }) {
  const scene = active === 'governance' ? 'capabilities' : active
  return (
    <nav className="scroll-progress" aria-label="Page chapters">
      {sceneLinks.map(({ id, label, rail }, index) => (
        <a key={id} href={`#${id}`} aria-current={scene === id ? 'location' : undefined} aria-label={label}>
          <span className="progress-label">0{index + 1} / {rail ?? label}</span><span className="progress-dot" />
        </a>
      ))}
    </nav>
  )
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <a href="#top" className="wordmark" aria-label="Lebati home">lebati<span>.</span></a>
        <p>Responsible gambling technology for South Africa.</p>
        <span className="footer-location"><Globe2 size={15} /> South Africa</span>
        <a href="#top" className="back-top">Back to top <ArrowRight size={15} /></a>
      </div>
    </footer>
  )
}
