import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Footer, Navbar, ScrollProgress } from './components/layout/Navigation'
import { About, Capabilities, Governance, Hero, Process } from './components/sections/Story'
import { Contact } from './components/sections/Contact'
import { useStory } from './animations/useStory'
import { EntryScreen, initialEntry, rememberEntry } from './components/layout/EntryScreen'
import type { AssetProgress } from './components/layout/EntryScreen'

const Experience = lazy(() => import('./components/three/Experience'))

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() { return this.state.failed ? null : this.props.children }
}

export default function App() {
  const [environment, setEnvironment] = useState<'checking' | 'webgl' | 'static'>('checking')
  const [gpu, setGpu] = useState<'pending' | 'ready' | 'failed'>('pending')
  const [painted, setPainted] = useState(false)
  const [progress, setProgress] = useState<AssetProgress>({ active: false, loaded: 0, total: 0 })
  const [entry, setEntry] = useState(initialEntry)
  const content = useRef<HTMLDivElement>(null)
  const activation = useRef(false)
  const entryActive = entry !== 'complete'
  const rendered = environment === 'webgl' && gpu === 'ready' && !progress.active
  const fallback = environment === 'static' || gpu === 'failed'
  const { root, scene, active, step, goToStep } = useStory(rendered)

  const finish = useCallback(() => {
    if (!activation.current) return
    activation.current = false
    rememberEntry()
    setEntry('complete')
    requestAnimationFrame(() => document.getElementById('main')?.focus({ preventScroll: true }))
  }, [])

  const onReady = useCallback((ready: boolean) => {
    setGpu(ready ? 'ready' : 'failed')
    if (!ready) finish()
  }, [finish])

  const onFailure = useCallback(() => onReady(false), [onReady])

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    let supported: boolean | undefined

    function update() {
      if (!preference.matches && supported === undefined) {
        try {
          const probe = document.createElement('canvas').getContext('webgl2')
          supported = !!probe
          probe?.getExtension('WEBGL_lose_context')?.loseContext()
        } catch {
          supported = false
        }
      }
      setEnvironment(supported && !preference.matches ? 'webgl' : 'static')
      if (preference.matches) {
        setGpu('pending')
        setPainted(false)
        finish()
      }
    }

    update()
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [finish])

  function enter() {
    if (activation.current || (!rendered && !fallback)) return
    activation.current = true
    if (fallback) finish()
    else setEntry('entering')
  }

  return (
    <>
      <div ref={root} className={`site${rendered ? ' has-webgl' : ''}${entryActive ? ' entry-active' : ''}`}>
        <div className="scene-grid" aria-hidden="true" />
        {environment === 'webgl' && (
          <SceneBoundary onFailure={onFailure}>
            <Suspense fallback={null}>
              <Experience story={scene} entry={entry} content={content} onReady={onReady} onPainted={setPainted} onProgress={setProgress} onEntered={finish} />
            </Suspense>
          </SceneBoundary>
        )}
        <div ref={content} className="site-content">
          <a href="#main" className="skip-link">Skip to content</a>
          <Navbar active={active} />
          <ScrollProgress active={active} />
          <main id="main" tabIndex={-1}>
            <Hero />
            <About />
            <Process active={step} onStep={goToStep} immersive={rendered} />
            <Capabilities />
            <Governance />
            <Contact />
          </main>
          <Footer />
        </div>
      </div>
      {entryActive && <EntryScreen webgl={painted && !fallback} ready={rendered} fallback={fallback} failed={gpu === 'failed'} entering={entry === 'entering'} progress={progress} onEnter={enter} />}
    </>
  )
}
