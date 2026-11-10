import { useEffect, useRef } from 'react'
import { MathUtils, Vector2 } from 'three'

export function usePointer() {
  const pointer = useRef({
    target: new Vector2(), position: new Vector2(), slow: new Vector2(),
    velocity: new Vector2(), impulse: new Vector2(), present: 0, inside: false,
  })

  useEffect(() => {
    const state = pointer.current
    let lastTime = 0
    const update = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      const x = event.clientX / innerWidth * 2 - 1
      const y = 1 - event.clientY / innerHeight * 2
      const duration = Math.max(12, event.timeStamp - lastTime)
      if (state.inside) {
        state.impulse.set(
          MathUtils.clamp((x - state.target.x) * 1000 / duration, -3, 3),
          MathUtils.clamp((y - state.target.y) * 1000 / duration, -3, 3),
        )
      }
      state.target.set(x, y)
      state.inside = true
      lastTime = event.timeStamp
    }
    const reset = () => { state.inside = false; state.target.set(0, 0); state.impulse.set(0, 0) }
    window.addEventListener('pointermove', update, { passive: true })
    document.documentElement.addEventListener('pointerleave', reset)
    window.addEventListener('blur', reset)
    return () => {
      window.removeEventListener('pointermove', update)
      document.documentElement.removeEventListener('pointerleave', reset)
      window.removeEventListener('blur', reset)
    }
  }, [])

  return pointer
}

export type PointerState = ReturnType<typeof usePointer>['current']

export function integratePointer(state: PointerState, delta: number) {
  state.position.lerp(state.target, 1 - Math.exp(-9 * delta))
  state.slow.lerp(state.target, 1 - Math.exp(-3.8 * delta))
  state.impulse.multiplyScalar(Math.exp(-10 * delta))
  state.velocity.lerp(state.impulse, 1 - Math.exp(-7 * delta))
  state.present = MathUtils.damp(state.present, Number(state.inside), 8, delta)
}
