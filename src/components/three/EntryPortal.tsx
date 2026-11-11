import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { MathUtils, Vector2 } from 'three'
import type { Group, PointLight, ShaderMaterial } from 'three'
import type { PointerState } from './usePointer'

export const portalDepth = 19
export const entryCameraDepth = 28

const surfaceVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
  }
`
const backdropFragment = `
  varying vec2 vUv;
  uniform float uFade;
  uniform vec2 uCursor;
  void main() {
    vec2 point = (vUv - .5) * 8.5 - uCursor * .14;
    float radius = length(point);
    float halo = exp(-radius * radius * 6.0);
    float haze = exp(-radius * 2.8);
    vec3 color = mix(vec3(.002,.008,.042),vec3(.0,.023,.19),haze);
    color += vec3(.0,.045,.19) * halo;
    gl_FragColor = vec4(color,uFade);
    #include <colorspace_fragment>
  }
`
const portalFragment = `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uFade;
  uniform float uFlight;
  uniform vec2 uCursor;
  void main() {
    vec2 point = vUv * 2. - 1.;
    float radius = length(point);
    float angle = atan(point.y,point.x);
    float ripple = sin(radius * 29. - uTime * 2.7 + sin(angle * 3.) * .65);
    float filament = pow(.5 + .5 * sin(angle * 18. + radius * 11. + uTime * 1.4), 7.);
    float rimDistance = (radius - .72 - ripple * .009) * 23.;
    float auraDistance = (radius - .69) * 4.5;
    float rim = exp(-rimDistance * rimDistance);
    float aura = exp(-auraDistance * auraDistance);
    float core = exp(-radius * radius * 4.5);
    float cursor = exp(-length(point - uCursor * .7) * 5.);
    float edge = 1. - smoothstep(.83,1.,radius);
    vec3 color = vec3(.016,.16,.72) * (aura * .6 + core * .34);
    color += vec3(.28,.64,1.) * rim * (.63 + filament * .42 + cursor * .24);
    color += vec3(.06,.23,.8) * core * uFlight * .6;
    gl_FragColor = vec4(color, edge * (rim * .8 + aura * .36 + core * .24) * uFade);
    #include <colorspace_fragment>
  }
`
const particleVertex = `
  uniform vec2 uCursor;
  uniform float uTime;
  uniform float uFlight;
  uniform float uPresence;
  uniform float uPixelRatio;
  attribute float aSeed;
  varying float vGlow;
  void main() {
    vec3 point = position;
    float spin = uTime * (.07 + aSeed * .08) + uFlight * .8;
    point.xy = mat2(cos(spin), -sin(spin), sin(spin), cos(spin)) * point.xy;
    point.z += uFlight * (.8 + aSeed * 1.7);
    vec4 view = modelViewMatrix * vec4(point, 1.);
    vec4 clip = projectionMatrix * view;
    vec2 difference = clip.xy / max(.03,abs(clip.w)) - uCursor;
    float nearCursor = exp(-dot(difference,difference)*18.) * uPresence;
    clip.xy += difference * nearCursor * .31 * max(clip.w,0.);
    gl_Position = clip;
    gl_PointSize = clamp(23. / max(1.,-view.z),1.2,5.) * uPixelRatio * (.55 + aSeed * .75 + nearCursor * .44);
    vGlow = (.28 + aSeed * .48 + nearCursor * .32) * smoothstep(.35,2.,-view.z);
  }
`
const particleFragment = `
  varying float vGlow;
  uniform float uFade;
  void main() {
    float point = 1. - smoothstep(.06,.49,length(gl_PointCoord-.5));
    gl_FragColor = vec4(mix(vec3(.007,.13,.8),vec3(.24,.63,1.),vGlow),point*vGlow*uFade);
    #include <colorspace_fragment>
  }
`

function seeded(index: number) {
  const value = Math.sin(index * 127.1 + 311.7) * 43758.5453
  return value - Math.floor(value)
}

export function EntryPortal({ pointer, flight, compact }: {
  pointer: RefObject<PointerState>
  flight: RefObject<number>
  compact: boolean
}) {
  const rig = useRef<Group>(null)
  const rings = useRef<Group>(null)
  const light = useRef<PointLight>(null)
  const surface = useRef<ShaderMaterial>(null)
  const backdrop = useRef<ShaderMaterial>(null)
  const particles = useRef<ShaderMaterial>(null)
  const elapsed = useRef({ time: 0, spin: 0 })
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uFade: { value: 1 }, uFlight: { value: 0 },
    uCursor: { value: new Vector2() }, uPresence: { value: 0 }, uPixelRatio: { value: 1 },
  }), [])
  const cloud = useMemo(() => {
    const count = compact ? 240 : 560
    const points = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    for (let index = 0; index < count; index++) {
      const angle = seeded(index * 4) * Math.PI * 2
      const radius = 1.5 + Math.pow(seeded(index * 4 + 1), 1.45) * 6.5
      points.set([Math.cos(angle) * radius, Math.sin(angle) * radius, (seeded(index * 4 + 2) - .5) * 5.8], index * 3)
      seeds[index] = seeded(index * 4 + 3)
    }
    return { points, seeds }
  }, [compact])

  useFrame(({ size, viewport }, frameDelta) => {
    if (!rig.current || !rings.current || !light.current) return
    const delta = Math.min(.1, frameDelta)
    const t = flight.current
    const mouse = pointer.current
    elapsed.current.time += delta
    elapsed.current.spin += delta * (.27 + t * t * 3.8)
    const fade = 1 - MathUtils.smoothstep(t, .5, .83)
    const portalScale = Math.min(.89, size.width / size.height * 1.24)
    rig.current.scale.setScalar(portalScale * (1 + t * t * .71))
    rig.current.rotation.set(mouse.slow.y * .22, mouse.slow.x * -.26, 0)
    rig.current.visible = t < .81
    rings.current.children.forEach((ring, index) => {
      const direction = index === 1 ? -1 : 1
      ring.rotation.set(
        .22 + index * .31 + Math.sin(elapsed.current.spin * direction + index) * (.12 + index * .06) + mouse.position.y * .18,
        mouse.slow.x * (.22 + index * .12) + Math.sin(elapsed.current.spin * .76 + index * 2) * .24,
        elapsed.current.spin * direction * (1 + index * .34),
      )
    })
    light.current.position.set(mouse.slow.x * 3, mouse.slow.y * 2.8, portalDepth + 3)
    light.current.intensity = (24 + mouse.present * 12 + t * 24) * fade
    for (const material of [surface.current, backdrop.current, particles.current]) {
      if (!material) continue
      material.visible = fade > .001
      const values = material.uniforms
      values.uTime.value = elapsed.current.time
      values.uFade.value = fade
      values.uFlight.value = t
      values.uCursor.value.copy(mouse.position)
      values.uPresence.value = mouse.present
      values.uPixelRatio.value = viewport.dpr
    }
  }, -1)

  return (
    <group name="lebati-entry-portal">
      <mesh position={[0, 0, portalDepth - 2]} renderOrder={1}>
        <planeGeometry args={[42, 42]} />
        <shaderMaterial ref={backdrop} uniforms={uniforms} vertexShader={surfaceVertex} fragmentShader={backdropFragment} transparent depthWrite={false} />
      </mesh>
      <pointLight ref={light} color="#1677ff" distance={13} />
      <group ref={rig} position={[0, 0, portalDepth]}>
        <mesh renderOrder={2}>
          <planeGeometry args={[4.85, 4.85]} />
          <shaderMaterial ref={surface} uniforms={uniforms} vertexShader={surfaceVertex} fragmentShader={portalFragment} transparent depthWrite={false} />
        </mesh>
        <group ref={rings} name="entry-gold-rings">
          {[2.03, 2.34, 2.65].map((radius, index) => (
            <group key={radius} position={[0, 0, index * -.16]}>
              <mesh>
                <torusGeometry args={[radius, .036 + index * .007, 10, compact ? 72 : 112, Math.PI * (index === 1 ? 1.67 : 1.92)]} />
                <meshPhysicalMaterial color="#d4af37" metalness={.83} roughness={.24} clearcoat={.8} emissive="#8d591b" emissiveIntensity={.43} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
      <points position={[0, 0, portalDepth - .6]} renderOrder={3} frustumCulled={false} name="entry-particles">
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[cloud.points, 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[cloud.seeds, 1]} />
        </bufferGeometry>
        <shaderMaterial ref={particles} uniforms={uniforms} vertexShader={particleVertex} fragmentShader={particleFragment} transparent depthWrite={false} />
      </points>
    </group>
  )
}
