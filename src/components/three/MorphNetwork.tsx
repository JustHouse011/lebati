import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { Color, Matrix4, ShaderMaterial, Vector2 } from 'three'
import type { Group } from 'three'
import { polygons, stations } from '../../assets/geography'
import type { PointerState } from './usePointer'

export type SceneMotion = { progress: number; speed: number; hover: number; time: number }
export const random = (i: number) => {
  const value = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return value - Math.floor(value)
}

const nodes = [
  [-2.25, 0.46, 0.48], [-1.82, -1.05, -0.12], [-1.22, 1.57, -0.52],
  [-0.66, -0.25, 0.92], [-0.25, -1.43, 0.38], [0.03, 0.94, 0.15],
  [0.59, 1.57, -0.82], [1.25, 0.56, 0.76], [1.79, -0.91, -0.46],
  [2.34, 0.35, -0.42], [0.66, -0.56, -0.87],
]

const edges = [[0, 1], [0, 2], [0, 3], [1, 3], [1, 4], [2, 3], [2, 5], [2, 6], [3, 4], [3, 5], [3, 7], [3, 10], [4, 8], [4, 10], [5, 6], [5, 7], [5, 10], [6, 7], [6, 9], [7, 8], [7, 9], [7, 10], [8, 9], [8, 10], [9, 10]]
const routes = [[0, 9], [0, 1], [1, 2], [2, 3], [3, 4], [4, 6], [4, 8], [4, 5], [4, 10], [5, 2], [5, 7], [7, 9], [9, 5], [8, 6], [1, 9]]

function inside(x: number, y: number, ring: [number, number][]) {
  let contained = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [ax, ay] = ring[index]
    const [bx, by] = ring[previous]
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) contained = !contained
  }
  return contained
}

const sharedVertex = `
  uniform mat4 uMap;
  uniform mat4 uNetwork;
  uniform vec2 uCursor;
  uniform vec2 uVelocity;
  uniform float uPresence;
  uniform float uMorph;
  uniform float uTime;
  uniform float uHover;
  attribute vec3 aNetwork;
  attribute float aSeed;
  varying float vSeed;
  varying float vNear;
  varying float vDepth;
  void main() {
    vec4 start = uMap * vec4(position, 1.);
    vec4 end = uNetwork * vec4(aNetwork, 1.);
    float amount = smoothstep(.0,1.,uMorph * 1.25 - min(aSeed,1.) * .24);
    vec4 world = mix(start,end,amount);
    world.y += sin(uTime * .85 + aSeed * 18.) * amount * .047;
    world.z += sin(amount * 3.14159) * (aSeed - .5) * 2.4;
    vec4 view = viewMatrix * world;
    vec4 clip = projectionMatrix * view;
    vec2 offset = clip.xy / max(abs(clip.w), .01) - uCursor;
    vNear = exp(-dot(offset,offset) * 15.) * uPresence;
    clip.xy += (offset * .18 + uVelocity * .011) * vNear * max(clip.w,0.);
    gl_Position = clip;
    gl_PointSize = clamp(37. / max(1., -view.z), 1.5, 7.) * (0.65 + aSeed * .43 + vNear * .42);
    vSeed = aSeed;
    vDepth = -view.z;
  }
`

const colorCommon = `
  uniform float uTime;
  uniform float uHover;
  uniform float uExit;
  uniform float uMorph;
  uniform vec3 uBlue;
  uniform vec3 uGold;
  varying float vSeed;
  varying float vNear;
  varying float vDepth;
  float presence() {
    return smoothstep(.25,2.5,vDepth) * (1. - smoothstep(12.,29.,vDepth)) * (1. - uExit);
  }
`

const pointFragment = `
  ${colorCommon}
  void main() {
    float d = length(gl_PointCoord - .5);
    float core = 1. - smoothstep(.05,.48,d);
    float pulse = smoothstep(.1,.92,sin(uTime * 2. + vSeed * 26.) * .5 + .5);
    vec3 color = mix(uBlue,uGold,smoothstep(.72,.97,vSeed + vNear * .16));
    float intensity = .26 + pulse * .38 + vNear * .48 + uHover * .2;
    gl_FragColor = vec4(color, core * presence() * intensity);
    #include <colorspace_fragment>
  }
`

const lineFragment = `
  ${colorCommon}
  void main() {
    float pulse = pow(.5 + .5 * cos(vSeed * 6.283 - uTime * 2.2 - uMorph * 4.), 8.);
    vec3 color = mix(uBlue,uGold,.24 + pulse * .63);
    gl_FragColor = vec4(color, presence() * (.18 + pulse * .62 + uHover * .27 + vNear * .2));
    #include <colorspace_fragment>
  }
`

export function MorphNetwork({ map, destination, pointer, motion, compact }: {
  map: RefObject<Group | null>
  destination: RefObject<Group | null>
  pointer: RefObject<PointerState>
  motion: RefObject<SceneMotion>
  compact: boolean
}) {
  const points = useRef<ShaderMaterial>(null)
  const lines = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(() => ({
    uMap: { value: new Matrix4() }, uNetwork: { value: new Matrix4() },
    uCursor: { value: new Vector2() }, uVelocity: { value: new Vector2() },
    uTime: { value: 0 }, uHover: { value: 0 }, uPresence: { value: 0 }, uMorph: { value: 0 }, uExit: { value: 0 },
    uBlue: { value: new Color('#5eacff') }, uGold: { value: new Color('#ffd893') },
  }), [])
  const { cloud, wires } = useMemo(() => {
    const from = [], to = [], seeds = []
    for (let i = 1; from.length < (compact ? 600 : 1350) * 3; i++) {
      const x = (random(i * 5) - 0.5) * 6.2
      const y = (random(i * 5 + 1) - 0.5) * 5.9
      if (!polygons.some(([coast, ...holes]) => inside(x, y, coast) && !holes.some(ring => inside(x, y, ring)))) continue
      const [a, b] = edges[i % edges.length].map(index => nodes[index])
      const t = random(i * 5 + 2)
      const spread = random(i * 5 + 3) < 0.23 ? 0.84 : 0.16
      from.push(x, y, 0.337)
      to.push(...a.map((value, axis) => value + (b[axis] - value) * t + (random(i * 17 + axis) - 0.5) * spread))
      seeds.push(random(i * 5 + 4))
    }
    const lineFrom: number[] = [], lineTo: number[] = [], lineSeeds: number[] = []
    edges.forEach(([left, right], index) => {
      const [a, b] = routes[index % routes.length].map(i => [...stations[i], 0.321])
      const start = nodes[left], end = nodes[right]
      for (let segment = 0; segment < 12; segment++) {
        for (const t of [segment / 12, (segment + 1) / 12]) {
          lineFrom.push(...a.map((value, axis) => value + (b[axis] - value) * t))
          lineTo.push(...start.map((value, axis) => value + (end[axis] - value) * t))
          lineSeeds.push(random(index * 8) + t)
        }
      }
    })
    return {
      cloud: [from, to, seeds].map(values => new Float32Array(values)),
      wires: [lineFrom, lineTo, lineSeeds].map(values => new Float32Array(values)),
    }
  }, [compact])

  useFrame(() => {
    if (!map.current || !destination.current) return
    const { progress, time, hover } = motion.current
    destination.current.updateWorldMatrix(true, false)
    for (const material of [points.current, lines.current]) {
      if (!material) continue
      material.visible = progress < 1.81
      if (!material.visible) continue
      const values = material.uniforms
      values.uMap.value.copy(map.current.matrixWorld)
      values.uNetwork.value.copy(destination.current.matrixWorld)
      values.uCursor.value.copy(pointer.current.position)
      values.uVelocity.value.copy(pointer.current.velocity)
      values.uPresence.value = pointer.current.present
      values.uHover.value = hover
      values.uTime.value = time
      values.uMorph.value = Math.max(0, Math.min(1, (progress - .13) / .84))
      values.uExit.value = Math.max(0, Math.min(1, (progress - 1.33) / .47))
    }
  }, -1)

  return (
    <>
      <points frustumCulled={false} name="morph-network">
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[cloud[0], 3]} />
          <bufferAttribute attach="attributes-aNetwork" args={[cloud[1], 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[cloud[2], 1]} />
        </bufferGeometry>
        <shaderMaterial ref={points} uniforms={uniforms} vertexShader={sharedVertex} fragmentShader={pointFragment} transparent depthWrite={false} />
      </points>
      <lineSegments frustumCulled={false} name="network-energy">
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[wires[0], 3]} />
          <bufferAttribute attach="attributes-aNetwork" args={[wires[1], 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[wires[2], 1]} />
        </bufferGeometry>
        <shaderMaterial ref={lines} uniforms={uniforms} vertexShader={sharedVertex} fragmentShader={lineFragment} transparent depthWrite={false} />
      </lineSegments>
    </>
  )
}
