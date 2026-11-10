import { Component, lazy, Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Footer, Navbar, ScrollProgress } from './components/layout/Navigation'
import { About, Capabilities, Governance, Hero, Process } from './components/sections/Story'
import { Contact } from './components/sections/Contact'
import { useStory } from './animations/useStory'

const Experience = lazy(() => import('./components/three/Experience'))

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() { return this.state.failed ? null : this.props.children }
}

export default function App() {
  const [canAnimate, setCanAnimate] = useState(false)
  const [rendered, setRendered] = useState(false)
  const { root, scene, active, step, goToStep } = useStory(rendered)

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const probe = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: false })
    const supported = !!probe
    probe?.getExtension('WEBGL_lose_context')?.loseContext()

    function update() {
      setCanAnimate(supported && !preference.matches)
      if (preference.matches) setRendered(false)
    }

    update()
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])

  return (
    <div ref={root} className={rendered ? 'site has-webgl' : 'site'}>
      <a href="#main" className="skip-link">Skip to content</a>
      <div className="scene-grid" aria-hidden="true" />
      {canAnimate && <SceneBoundary onFailure={() => setRendered(false)}><Suspense fallback={null}><Experience story={scene} onReady={setRendered} /></Suspense></SceneBoundary>}
      <Navbar active={active} />
      <ScrollProgress active={active} />
      <main id="main">
        <Hero />
        <About />
        <Process active={step} onStep={goToStep} immersive={rendered} />
        <Capabilities />
        <Governance />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}
