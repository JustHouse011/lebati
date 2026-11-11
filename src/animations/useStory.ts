import { useLayoutEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { lastStop, processStops, stops } from './journey'
import type { JourneyState } from './journey'

const anchorSelectors = {
  top: '.hero-instrument',
  about: '.about-art',
  process: '.process-art',
  capabilities: '.capabilities-art',
  governance: '.governance-art',
  contact: '.contact-art',
}

export function useStory(immersive: boolean) {
  const root = useRef<HTMLDivElement>(null)
  const scene = useRef<JourneyState>({ progress: 0, viewport: { width: 1, height: 1 }, anchors: {} })
  const controller = useRef<(index: number) => void>(() => {})
  const entered = useRef(false)
  const [active, setActive] = useState('top')
  const [step, setStep] = useState(0)

  useLayoutEffect(() => {
    const host = root.current
    if (!host) return
    const sections = stops.map(({ id }) => document.getElementById(id)!)
    const header = host.querySelector<HTMLElement>('.site-header')!
    const stage = host.querySelector<HTMLElement>('.process-pin')!
    const art = Object.entries(anchorSelectors).map(([key, selector]) => [key, host.querySelector<HTMLElement>(selector)] as const)
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    const pointer = matchMedia('(hover: hover) and (pointer: fine)')
    let lenis: Lenis | undefined
    let frame = 0
    let measureFrame = 0
    let targets: number[] = []
    let currentChapter = ''
    let currentStep = -1
    let keyTarget: number | undefined

    function sample(y: number) {
      if (!targets.length) return
      if (keyTarget !== undefined && Math.abs(y - targets[keyTarget]) < 2) keyTarget = undefined
      let segment = 0
      while (segment < lastStop - 1 && y >= targets[segment + 1]) segment++
      const fraction = Math.max(0, Math.min(1, (y - targets[segment]) / Math.max(1, targets[segment + 1] - targets[segment])))
      const progress = segment + fraction
      scene.current.progress = progress
      const chapter = stops[Math.round(progress)].id
      const nextStep = Math.max(0, Math.min(3, Math.round(progress) - processStops[0]))
      if (chapter !== currentChapter) { currentChapter = chapter; setActive(chapter) }
      if (nextStep !== currentStep) { currentStep = nextStep; setStep(nextStep) }
    }

    function measure() {
      const y = window.scrollY
      const viewport = { width: window.innerWidth, height: window.innerHeight }
      const max = document.documentElement.scrollHeight - viewport.height
      const headerHeight = header.offsetHeight
      const rects = sections.map(section => section.getBoundingClientRect())
      const stageRect = stage.getBoundingClientRect()
      const processStart = rects[2].top + y
      const travel = Math.max(0, rects[2].height - stageRect.height)
      targets = stops.map(({ id }, index) => {
        if (index === 0) return 0
        if (id === 'process' && immersive) return processStart + (index - processStops[0]) * travel / 3
        return Math.min(max, y + rects[index].top - headerHeight)
      })
      scene.current.viewport = viewport
      for (const [id, element] of art) {
        if (!element) continue
        const rect = element.getBoundingClientRect()
        const index = stops.findIndex(stop => stop.id === id)
        const left = rect.left + rect.width / 2
        const centerY = id === 'process' && immersive
          ? rect.top - stageRect.top + rect.height / 2
          : rect.top + y - targets[index] + rect.height / 2
        scene.current.anchors[id] = { x: left, y: centerY, width: rect.width, height: rect.height }
      }
      sample(y)
    }

    function configure() {
      cancelAnimationFrame(frame)
      lenis?.destroy()
      lenis = undefined
      if (immersive && pointer.matches && !motion.matches) {
        lenis = new Lenis({
          duration: 0.78,
          virtualScroll: data => {
            const target = data.event.target
            if (target instanceof Element && target.closest('.enquiry-form')) return false
            const limit = window.innerHeight * 0.68
            data.deltaY = Math.max(-limit, Math.min(limit, data.deltaY))
            keyTarget = undefined
            return true
          },
        })
        lenis.on('scroll', ({ scroll }) => sample(scroll))
        frame = requestAnimationFrame(tick)
      }
    }

    function tick(time: number) {
      lenis?.raf(time)
      frame = requestAnimationFrame(tick)
    }

    function move(top: number) {
      if (!Number.isFinite(top)) return
      if (lenis) lenis.scrollTo(top)
      else window.scrollTo({ top, behavior: motion.matches ? 'instant' : 'smooth' })
    }

    controller.current = index => {
      if (immersive) move(targets[processStops[index]])
    }

    function anchors(event: MouseEvent) {
      if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]')
      const id = link?.hash.slice(1)
      if (!link || !id || id === 'main' || !immersive) return
      const stop = stops.findIndex(candidate => candidate.id === id)
      if (stop < 0) return
      event.preventDefault()
      keyTarget = undefined
      if (location.hash !== link.hash) history.pushState(null, '', link.hash)
      move(targets[stop])
      if (event.detail === 0) {
        sections[stop].tabIndex = -1
        sections[stop].focus({ preventScroll: true })
      }
    }

    function keys(event: KeyboardEvent) {
      if (document.documentElement.classList.contains('entry-locked')) return
      if (!immersive || event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      const target = event.target as Element | null
      if (target?.closest('button, a, input, textarea, select, [contenteditable], #contact')) return
      if (window.scrollY >= targets[lastStop] - 5 && event.key === 'ArrowDown') return
      const current = keyTarget ?? Math.round(scene.current.progress)
      const next = Math.max(0, Math.min(lastStop, current + (event.key === 'ArrowDown' ? 1 : -1)))
      event.preventDefault()
      keyTarget = next
      move(targets[next])
    }

    const onScroll = () => sample(window.scrollY)
    const onHistory = () => {
      keyTarget = undefined
      const index = stops.findIndex(({ id }) => location.hash === `#${id}`)
      if (index >= 0 && immersive) move(targets[index])
      else if (!location.hash && immersive) move(0)
    }
    const onLayout = () => {
      cancelAnimationFrame(measureFrame)
      measureFrame = requestAnimationFrame(measure)
    }
    const onPreference = () => { configure(); onLayout() }
    const observer = new ResizeObserver(onLayout)
    observer.observe(host)
    observer.observe(stage)
    window.addEventListener('resize', onLayout)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('keydown', keys)
    window.addEventListener('popstate', onHistory)
    host.addEventListener('click', anchors)
    motion.addEventListener('change', onPreference)
    pointer.addEventListener('change', onPreference)
    configure()
    measure()
    if (immersive && !entered.current) {
      entered.current = true
      const index = stops.findIndex(({ id }) => location.hash === `#${id}`)
      if (index >= 0) {
        if (lenis) lenis.scrollTo(targets[index], { immediate: true })
        else window.scrollTo({ top: targets[index], behavior: 'instant' })
        sample(window.scrollY)
      }
    }
    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(measureFrame)
      observer.disconnect()
      lenis?.destroy()
      window.removeEventListener('resize', onLayout)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('keydown', keys)
      window.removeEventListener('popstate', onHistory)
      host.removeEventListener('click', anchors)
      motion.removeEventListener('change', onPreference)
      pointer.removeEventListener('change', onPreference)
      controller.current = () => {}
    }
  }, [immersive])

  return { root, scene, active, step, goToStep: (index: number) => controller.current(index) }
}
