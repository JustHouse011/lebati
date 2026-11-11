import { ArrowRight } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef } from 'react'

export type EntryPhase = 'waiting' | 'entering' | 'complete'
export type AssetProgress = { active: boolean; loaded: number; total: number }

const entryKey = 'lebati:entered'

export function initialEntry(): EntryPhase {
  if (new URLSearchParams(location.search).get('entry') === 'replay') return 'waiting'
  try {
    return sessionStorage.getItem(entryKey) === '1' ? 'complete' : 'waiting'
  } catch {
    return 'waiting'
  }
}

export function rememberEntry() {
  try { sessionStorage.setItem(entryKey, '1') } catch { /* Storage can be disabled. */ }
  const url = new URL(location.href)
  if (url.searchParams.get('entry') === 'replay') {
    url.searchParams.delete('entry')
    history.replaceState(history.state, '', url)
  }
}

export function EntryScreen({ webgl, ready, fallback, failed, entering, progress, onEnter }: {
  webgl: boolean
  ready: boolean
  fallback: boolean
  failed: boolean
  entering: boolean
  progress: AssetProgress
  onEnter: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const canEnter = ready || fallback
  const determinate = progress.active && progress.total > 0
  const status = failed ? 'The 3D scene could not load. You can continue below.'
    : entering ? 'Entering Lebati'
      : canEnter ? '' : determinate ? 'Loading scene assets' : 'Preparing the experience'

  useLayoutEffect(() => {
    const element = dialog.current!
    const root = document.documentElement
    root.classList.add('entry-locked')
    element.showModal()
    const preventClose = (event: Event) => event.preventDefault()
    element.addEventListener('cancel', preventClose)
    return () => {
      element.removeEventListener('cancel', preventClose)
      element.close()
      root.classList.remove('entry-locked')
    }
  }, [])

  useEffect(() => {
    if (canEnter && !entering) button.current?.focus({ preventScroll: true })
  }, [canEnter, entering])

  return (
    <dialog ref={dialog} className={`entry-dialog${webgl ? ' entry-webgl' : ''}${entering ? ' entry-in-flight' : ''}`} aria-labelledby="entry-title" data-lenis-prevent>
      <div className="entry-layout">
        <div className="entry-identity">
          <h1 className="wordmark" id="entry-title" aria-label="Lebati">lebati<span>.</span></h1>
          <p>Responsible gambling technology</p>
        </div>
        {!webgl && <div className="entry-static-portal" aria-hidden="true" />}
        <div className="entry-actions">
          <p className="entry-status" role="status">{status}</p>
          {!canEnter && <progress aria-label={status} max={100} value={determinate ? Math.min(99, progress.loaded / progress.total * 100) : undefined} />}
          {canEnter && <button ref={button} className="button primary entry-button" type="button" disabled={entering} onClick={onEnter}>
            {fallback ? 'Continue' : 'Enter Experience'} <ArrowRight size={18} aria-hidden="true" />
          </button>}
        </div>
      </div>
    </dialog>
  )
}
