import { Environment, Lightformer } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { Group, MathUtils, PerspectiveCamera, PointLight, Raycaster, Vector2, Vector3 } from 'three'
import { lastStop, stops } from '../../animations/journey'
import type { JourneyState } from '../../animations/journey'
import { SouthAfricaMap } from './SouthAfricaMap'
import { ComplianceShield } from './ComplianceShield'
import { integratePointer, usePointer } from './usePointer'
import { aimPath, cameraPath, placeInShot } from './world'
import { MorphNetwork } from './MorphNetwork'
import { PanelSequence } from './PanelSequence'
import { SpatialLabel } from './SpatialLabel'
import { AdaptiveQuality, Atmosphere } from './Atmosphere'
import { ChapterType } from './ChapterType'

type Story = RefObject<JourneyState>

export function Orbit({ radius, gold = false, arc = Math.PI * 2, angle = 0 }: { radius: number; gold?: boolean; arc?: number; angle?: number }) {
  return (
    <mesh rotation={[0, 0, angle]}>
      <torusGeometry args={[radius, gold ? 0.012 : 0.006, 5, 90, arc]} />
      <meshBasicMaterial color={gold ? '#d5af60' : '#4485dd'} transparent opacity={gold ? 0.73 : 0.31} depthWrite={false} />
    </mesh>
  )
}

function Scene({ story, onReady }: { story: Story; onReady: (ready: boolean) => void }) {
  const { gl, size } = useThree()
  const compact = size.width < 800
  const map = useRef<Group>(null)
  const mapArt = useRef<Group>(null)
  const seal = useRef<Group>(null)
  const orbit = useRef<Group>(null)
  const lock = useRef<Group>(null)
  const lockRings = useRef<Group>(null)
  const network = useRef<Group>(null)
  const networkRings = useRef<Group>(null)
  const capabilityRings = useRef<Group>(null)
  const light = useRef<PointLight>(null)
  const pointer = usePointer()
  const travel = useRef({ progress: -1, speed: 0, hover: 0, time: 0 })
  const contextLost = useRef(false)
  const scratch = useRef({ eye: new Vector3(), aim: new Vector3() })
  const ray = useRef(new Raycaster())
  const surface = useRef({
    uDissolve: { value: 0 }, uGlow: { value: 0 }, uCharge: { value: 0 },
    uFocus: { value: 0 }, uContact: { value: new Vector2() },
  })
  const networkReveal = useRef(0)

  useEffect(() => {
    const canvas = gl.domElement
    const lost = (event: Event) => { event.preventDefault(); contextLost.current = true; onReady(false) }
    const restored = () => { contextLost.current = false; onReady(true) }
    canvas.addEventListener('webglcontextlost', lost)
    canvas.addEventListener('webglcontextrestored', restored)
    const painted = requestAnimationFrame(() => { if (!contextLost.current) onReady(true) })
    return () => {
      cancelAnimationFrame(painted)
      canvas.removeEventListener('webglcontextlost', lost)
      canvas.removeEventListener('webglcontextrestored', restored)
    }
  }, [gl, onReady])

  useFrame(({ camera }, frameDelta) => {
    if (contextLost.current) return
    const delta = Math.min(0.1, frameDelta)
    const motion = travel.current
    const mouse = pointer.current
    integratePointer(mouse, delta)
    motion.time += delta
    const goal = story.current.progress
    const previous = motion.progress < 0 ? goal : motion.progress
    motion.progress = MathUtils.damp(previous, goal, compact ? 12 : 9, delta)
    motion.speed = MathUtils.damp(motion.speed, (motion.progress - previous) / Math.max(0.001, delta), 6, delta)
    const position = motion.progress
    const view = camera as PerspectiveCamera
    const index = Math.min(lastStop - 1, Math.floor(position))
    const fraction = position - index
    const { eye, aim } = scratch.current

    cameraPath.getPoint(position / lastStop, eye)
    aimPath.getPoint(position / lastStop, aim)
    view.position.copy(eye)
    view.position.x += mouse.slow.x * 0.39
    view.position.y += mouse.slow.y * 0.28
    aim.x += mouse.position.x * 0.16
    aim.y += mouse.position.y * 0.12
    view.lookAt(aim)
    view.rotateZ(MathUtils.lerp(stops[index].roll, stops[index + 1].roll, fraction) + mouse.velocity.x * 0.009)
    view.fov = MathUtils.lerp(stops[index].fov, stops[index + 1].fov, fraction) + Math.min(2.5, Math.abs(motion.speed) * 0.4)
    view.updateProjectionMatrix()
    view.updateMatrixWorld()
    ray.current.setFromCamera(mouse.position, view)

    const takeoff = MathUtils.smoothstep(position, 0.02, 0.85)
    if (map.current && mapArt.current && seal.current && orbit.current) {
      map.current.visible = position < 1.12
      placeInShot(map.current, 0, story.current, 6.65, 5.55)
      map.current.position.y += Math.sin(motion.time * 0.78) * 0.075 + takeoff * (compact ? .37 : -1.1)
      map.current.rotation.z = -takeoff * 0.37
      mapArt.current.rotation.x = -0.13 + mouse.position.y * 0.19 - takeoff * 0.67
      mapArt.current.rotation.y = -0.26 + mouse.position.x * 0.28 + takeoff * 0.48
      seal.current.rotation.y = -0.22 + mouse.slow.x * 0.33 - takeoff * 0.55
      seal.current.position.z = 1.1 + takeoff * 2.6 + Math.sin(motion.time * 1.2) * 0.075
      orbit.current.rotation.z = motion.time * 0.11 + takeoff * 0.91
      orbit.current.scale.setScalar(1 + takeoff * 0.51)
      const terrain = mapArt.current.getObjectByName('terrain')
      mapArt.current.updateWorldMatrix(true, false)
      const canHit = terrain && position < 0.56 && mouse.inside
      if (canHit) terrain.updateWorldMatrix(false, false)
      const hit = canHit ? ray.current.intersectObject(terrain, false)[0] : undefined
      motion.hover = MathUtils.damp(motion.hover, hit ? 1 : 0, 7, delta)
      if (hit && terrain) {
        const local = terrain.worldToLocal(hit.point)
        surface.current.uContact.value.set(local.x, local.y)
      }
      surface.current.uFocus.value = motion.hover
      surface.current.uCharge.value = MathUtils.smoothstep(position, .02, .41)
      surface.current.uGlow.value = motion.hover + takeoff * 0.6
      surface.current.uDissolve.value = MathUtils.smoothstep(position, 0.27, 0.67)
    }
    if (network.current) {
      placeInShot(network.current, 1, story.current, 5.48, 4.4)
      network.current.rotation.y = -0.14 + mouse.slow.x * 0.32 + (position - 1) * 0.18
      network.current.rotation.x = mouse.slow.y * 0.17
      network.current.position.y += Math.sin(motion.time * 0.64) * 0.12
      network.current.visible = position > .44 && position < 1.72
      networkReveal.current = 1.13 * MathUtils.smoothstep(position, .62, .98) * (1 - MathUtils.smoothstep(position, 1.26, 1.7))
      if (networkRings.current) {
        const expansion = MathUtils.smoothstep(position, .58, 1)
        networkRings.current.scale.setScalar(.66 + expansion * .38)
        networkRings.current.rotation.z = .16 + motion.time * .075 + expansion * .72
      }
    }
    if (capabilityRings.current) {
      const assembly = MathUtils.smoothstep(position, 5.34, 6)
      const handoff = MathUtils.smoothstep(position, 6.28, 7.05)
      placeInShot(capabilityRings.current, 6, story.current, 7.35, 5.2)
      capabilityRings.current.visible = position > 5.39 && position < 7.07
      capabilityRings.current.scale.multiplyScalar(.66 + assembly * .34 + handoff * .67)
      capabilityRings.current.position.z -= handoff * 7.8
      capabilityRings.current.rotation.set(.24 + handoff * .67, -.28 + mouse.slow.x * .18, position * .28 - .75)
    }

    if (lock.current && lockRings.current) {
      placeInShot(lock.current, 7, story.current, 5.25, 4.45)
      lock.current.visible = position > 6.08 && position < 8
      const closing = MathUtils.smoothstep(position, 6, 7)
      lock.current.scale.multiplyScalar(.55 + closing * .45)
      lock.current.rotation.y = -0.65 + closing * 0.58 + mouse.slow.x * 0.24
      lock.current.position.y += Math.sin(motion.time * 0.8) * 0.095
      lockRings.current.scale.setScalar(0.68 + closing * 0.57)
      lockRings.current.rotation.z = motion.time * 0.12 + closing * 1.3
    }
    if (light.current) {
      light.current.position.set(view.position.x + 3 + mouse.slow.x * 4, view.position.y + 2 + mouse.slow.y * 4, view.position.z - 3)
      const staging = MathUtils.smoothstep(position, 1.45, 2.8)
      const release = MathUtils.smoothstep(position, 7.02, 8)
      light.current.intensity = 37 + motion.hover * 34 + takeoff * 18 + staging * 13 - release * 34
    }
  }, -2)

  return (
    <>
      <AdaptiveQuality />
      <Atmosphere journey={story} motion={travel} pointer={pointer} compact={compact} />
      <ambientLight intensity={1.2} color="#a6c5ff" />
      <directionalLight position={[-3, 6, 8]} color="#ffdfad" intensity={2.5} />
      <pointLight ref={light} color="#297dff" intensity={39} distance={28} />
      <Environment resolution={64} frames={1}>
        <Lightformer position={[-2, 4, 5]} target={[0, 0, 0]} scale={[6, 2, 1]} intensity={3} color="#ffe6bc" />
        <Lightformer position={[5, -1, 2]} target={[0, 0, 0]} scale={[3, 6, 1]} intensity={4} color="#487eff" />
        <Lightformer position={[-5, -2, 0]} target={[0, 0, 0]} scale={[2, 5, 1]} intensity={1.3} color="#cbdcff" />
      </Environment>
      <group ref={map} name="south-africa-rig">
        <group ref={orbit} rotation={[0.65, -0.26, 0.28]} position={[0.04, 0, -0.36]}>
          <Orbit radius={3.18} /><Orbit radius={3.48} /><Orbit radius={2.96} />
          <Orbit radius={3.19} gold arc={1.4} /><Orbit radius={3.49} gold arc={0.44} angle={3.25} />
        </group>
        <group ref={mapArt} name="map-body" rotation={[-0.15, -0.27, -0.075]} position={[-0.18, -0.1, 0]}>
          <SouthAfricaMap compact={compact} surface={surface} />
        </group>
        <group ref={seal} name="floating-compliance-shield" position={[1.02, 0.46, 1.03]} rotation={[0.1, -0.25, -0.065]} scale={0.98}><ComplianceShield /></group>
      </group>
      <group ref={network} name="network-destination">
        <group ref={networkRings} position={[0, 0, -.9]} rotation={[.3, -.21, 0]}>
          <Orbit radius={2.14} arc={4.5} /><Orbit radius={2.45} arc={5.1} angle={1.3} />
          <Orbit radius={2.45} arc={.48} angle={.65} gold />
        </group>
        <ChapterType text="02" position={[.16, .36, -1.06]} size={2.3} opacity={.25} />
        <SpatialLabel title="Connected systems" kicker="ACCESS  /  POLICY  /  OVERSIGHT" width={4} position={[0, -1.85, .55]} reveal={networkReveal} pointer={pointer} />
      </group>
      <MorphNetwork map={mapArt} destination={network} motion={travel} pointer={pointer} compact={compact} />
      <PanelSequence journey={story} motion={travel} pointer={pointer} ray={ray} compact={compact} />
      <group ref={capabilityRings} name="capability-orbits" visible={false}>
        <Orbit radius={2.06} arc={5.1} angle={.48} /><Orbit radius={2.49} arc={5.37} angle={.07} />
        <Orbit radius={2.49} arc={.89} angle={3.14} gold />
      </group>
      <group ref={lock} name="governance-rig" visible={false}>
        <group ref={lockRings} rotation={[0.7, -0.36, 0.2]} position={[0, 0, -0.45]}>
          <Orbit radius={1.87} /><Orbit radius={2.22} /><Orbit radius={2.42} />
          <Orbit radius={2.22} gold arc={1.6} /><Orbit radius={2.42} gold arc={0.6} angle={3.3} />
        </group>
        <ChapterType text="04" position={[-1.18, .48, -.46]} size={.83} opacity={.32} />
        <group scale={1.27}><ComplianceShield lock /></group>
      </group>
    </>
  )
}

export default function Experience({ story, onReady }: { story: Story; onReady: (ready: boolean) => void }) {
  return (
    <div className="experience" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 14], fov: 42, near: 0.08, far: 160 }} dpr={[0.75, 1.4]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}>
        <Scene story={story} onReady={onReady} />
      </Canvas>
    </div>
  )
}
