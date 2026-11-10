export const stops = [
  { id: 'top', eye: [0, 0, 14], aim: [0, 0, 0], fov: 42, roll: 0 },
  { id: 'about', eye: [1.6, 0.6, -3.5], aim: [0.7, 0.3, -14], fov: 47, roll: -0.036 },
  { id: 'process', eye: [0.6, -0.5, -20], aim: [0.9, -0.25, -28.5], fov: 49, roll: 0.028 },
  { id: 'process', eye: [-1.1, 0.6, -29.5], aim: [-0.4, 0.55, -38], fov: 47, roll: -0.03 },
  { id: 'process', eye: [0.8, 0.05, -39], aim: [0.6, 0.1, -47.5], fov: 46, roll: 0.02 },
  { id: 'process', eye: [-0.45, 0.4, -48.5], aim: [0.3, 0.25, -57], fov: 48, roll: -0.026 },
  { id: 'capabilities', eye: [1.5, 0.85, -60], aim: [0.55, 0.45, -70], fov: 47, roll: -0.04 },
  { id: 'governance', eye: [-0.2, 0.25, -73], aim: [0.4, 0.3, -83], fov: 43, roll: 0.018 },
  { id: 'contact', eye: [-0.7, 1.05, -93], aim: [0.6, 0.6, -111], fov: 53, roll: 0 },
] as const

export const lastStop = stops.length - 1
export const processStops = [2, 3, 4, 5] as const

export type JourneyState = {
  progress: number
  viewport: { width: number; height: number }
  anchors: Partial<Record<string, { x: number; y: number; width: number; height: number }>>
}
