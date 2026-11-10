import { extend, useFrame } from '@react-three/fiber'
import { useMemo, useRef, useEffect } from 'react'
import type { RefObject } from 'react'
import { BufferAttribute, Group, Line, MathUtils, Object3D, Vector2, Vector3 } from 'three'
import type { Mesh, MeshPhysicalMaterial, Raycaster, ShaderMaterial } from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { JourneyState } from '../../animations/journey'
import { placeInShot } from './world'
import type { PointerState } from './usePointer'
import { random } from './MorphNetwork'
import type { SceneMotion } from './MorphNetwork'
import { SpatialLabel } from './SpatialLabel'

const labels = ['Verify Identity', 'Evaluate Policy', 'Return a Decision', 'Maintain Compliance']
const EnergyLine = extend(Line)
const capabilities = ['Registry Management', 'Operator Verification', 'Compliance Reporting', 'Appeals and Reviews']
const contours = [
  [
    [[-.85,-.19],[-.83,.37],[-.55,.79],[0,.96],[.56,.78],[.83,.37],[.85,-.26]],
    [[-.64,-.47],[-.61,.23],[-.40,.57],[0,.70],[.4,.55],[.61,.21],[.62,-.58]],
    [[-.43,-.74],[-.39,-.23],[-.41,.23],[-.21,.44],[.08,.45],[.35,.22],[.37,-.72]],
    [[-.20,-.84],[-.13,-.35],[-.16,.15],[.01,.23],[.15,.11],[.16,-.44],[.12,-.92]],
  ],
  [
    [[-.7,-.74],[-.7,.76],[.72,.76],[.72,-.74],[-.7,-.74]],
    [[-.49,.32],[-.33,.15],[-.07,.45]], [[.13,.32],[.49,.32]],
    [[-.49,-.27],[-.33,-.45],[-.07,-.14]], [[.13,-.29],[.49,-.29]],
  ],
  [
    [[-.88,.33],[-.88,.66],[-.5,.66]], [[.5,.66],[.88,.66],[.88,.33]],
    [[-.88,-.33],[-.88,-.66],[-.5,-.66]], [[.5,-.66],[.88,-.66],[.88,-.33]],
    [[-.6,0],[.6,0]], [[-.47,.27],[-.47,-.27]], [[-.21,.25],[-.21,-.25]], [[.1,.25],[.1,-.25]], [[.38,.25],[.38,-.25]],
  ],
  [
    [[-.23,.72],[-.66,.72],[-.66,-.78],[.66,-.78],[.66,.72],[.23,.72]],
    [[-.23,.50],[-.23,.84],[.23,.84],[.23,.50],[-.23,.50]],
    [[-.32,-.11],[-.08,-.38],[.38,.24]],
  ],
  [
    [[-.70,.39],[0,.77],[.7,.39],[0,.02],[-.70,.39]],
    [[-.70,-.05],[0,-.43],[.7,-.05]], [[-.70,-.47],[0,-.85],[.7,-.47]],
  ],
  [
    [[0,.88],[.69,.56],[.62,-.17],[.39,-.55],[0,-.8],[-.39,-.55],[-.62,-.17],[-.69,.56],[0,.88]],
    [[-.27,.06],[-.07,-.17],[.30,.23]],
  ],
  [
    [[-.69,-.71],[.69,-.71]], [[-.5,-.49],[-.5,.08]], [[-.15,-.49],[-.15,.58]], [[.2,-.49],[.2,.26]], [[.55,-.49],[.55,.84]],
  ],
  [
    [[0,.77],[0,-.63]], [[-.67,.47],[.67,.47]], [[-.35,-.73],[.35,-.73]],
    [[-.48,.47],[-.81,-.13],[-.15,-.13],[-.48,.47]], [[.48,.47],[.81,-.13],[.15,-.13],[.48,.47]],
  ],
]

const surfaceVertex = `
  varying vec2 vUv;
  void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }
`
const surfaceFragment = `
  uniform vec2 uContact;
  uniform float uHover;
  uniform float uTime;
  varying vec2 vUv;
  void main(){
    vec2 p = abs(vUv-.5)-vec2(.466,.45);
    float d = length(max(p,0.))+min(max(p.x,p.y),0.)-.027;
    if(d>0.) discard;
    float border = exp(-abs(d)*415.);
    vec2 difference = (vUv-uContact)*vec2(1.42,1.);
    float shine = exp(-dot(difference,difference)*14.)*uHover;
    float sweep = exp(-abs(vUv.x+vUv.y*.24-.37-.24*sin(uTime*.52))*21.);
    float detail = .5 + .5*cos((vUv.y+vUv.x*.04)*440.);
    vec3 tint = mix(vec3(.014,.081,.31),vec3(.19,.48,1.),shine*.68 + sweep*.13);
    vec3 edge = mix(vec3(.095,.31,.76),vec3(1.,.69,.23),.39+shine*.61);
    gl_FragColor = vec4(mix(tint,edge,border), .16 + detail*.024 + shine*.25 + sweep*.069 + border*.58);
    #include <colorspace_fragment>
  }
`
const iconVertex = `
  attribute vec3 aCapability;
  attribute float aSeed;
  uniform float uAssemble;
  uniform float uRing;
  uniform float uTime;
  uniform float uHover;
  uniform vec2 uContact;
  varying float vSeed;
  varying float vBuilt;
  void main(){
    vec3 goal = mix(position,aCapability,uRing);
    float a = smoothstep(.0,1.,uAssemble*1.3-aSeed*.28);
    vec3 spread = goal + vec3(cos(aSeed*43.)*1.35,sin(aSeed*59.)*.73,sin(aSeed*35.)*1.5);
    vec3 point = mix(spread,goal,a);
    point.xy += (uContact-.5)*.16*uHover;
    point.z += sin(uTime*1.45+aSeed*13.)*.08*(1.-a)+uHover*.065;
    vec4 view = modelViewMatrix*vec4(point,1.);
    gl_Position = projectionMatrix*view;
    gl_PointSize = clamp(30./max(1.,-view.z),1.5,5.)*(.75+.32*aSeed);
    vSeed=aSeed;
    vBuilt=a;
  }
`
const iconFragment = `
  varying float vSeed;
  varying float vBuilt;
  void main(){
    float radius=length(gl_PointCoord-.5);
    float alpha=(1.-smoothstep(.10,.49,radius))*(.28+.72*vBuilt);
    vec3 gold=mix(vec3(.5,.69,1.),vec3(1.,.68,.23),smoothstep(.1,.83,vSeed));
    gl_FragColor=vec4(gold,alpha);
    #include <colorspace_fragment>
  }
`

function sampleContour(index: number, count: number) {
  const shape = contours[index]
  const segments = shape.flatMap(line => line.slice(1).map((point, i) => {
    const origin = line[i]
    return { origin, point, length: Math.hypot(point[0] - origin[0], point[1] - origin[1]) }
  }))
  const total = segments.reduce((sum, segment) => sum + segment.length, 0)
  const points = []
  for (let i = 0; i < count; i++) {
    let distance = i / count * total
    const segment = segments.find(segment => {
      if (distance <= segment.length) return true
      distance -= segment.length
      return false
    })!
    const fraction = distance / segment.length
    points.push(
      MathUtils.lerp(segment.origin[0], segment.point[0], fraction) * 0.98,
      MathUtils.lerp(segment.origin[1], segment.point[1], fraction) * 0.84 + 0.27,
      0.27 + random(i + index * 31) * 0.05,
    )
  }
  return new Float32Array(points)
}

type Rig = {
  journey: RefObject<JourneyState>
  motion: RefObject<SceneMotion>
  pointer: RefObject<PointerState>
  ray: RefObject<Raycaster>
  compact: boolean
}

function Panel({ index, geometry, centers, journey, motion, pointer, ray, compact }: Rig & {
  index: number; geometry: RoundedBoxGeometry; centers: Vector3[];
}) {
  const group = useRef<Group>(null)
  const inner = useRef<Group>(null)
  const glass = useRef<Mesh>(null)
  const material = useRef<MeshPhysicalMaterial>(null)
  const edgeShader = useRef<ShaderMaterial>(null)
  const iconShader = useRef<ShaderMaterial>(null)
  const pose = useRef({ ringTarget: new Object3D(), scratch: new Vector3() })
  const reveal = useRef(0)
  const capabilityReveal = useRef(0)
  const uniforms = useMemo(() => ({
    uContact: { value: new Vector2(.5, .5) }, uHover: { value: 0 }, uTime: { value: 0 },
  }), [])
  const iconUniforms = useMemo(() => ({
    uContact: { value: new Vector2(.5, .5) }, uHover: { value: 0 }, uTime: { value: 0 },
    uRing: { value: 0 }, uAssemble: { value: 0 },
  }), [])
  const icon = useMemo(() => {
    const count = compact ? 180 : 340
    return {
      from: sampleContour(index, count), to: sampleContour(index + 4, count),
      seeds: new Float32Array(Array.from({ length: count }, (_, i) => random(i * 3 + index * 42))),
    }
  }, [compact, index])

  useFrame((_, frameDelta) => {
    const body = group.current, front = inner.current, surface = glass.current
    if (!body || !front || !surface || !material.current || !edgeShader.current || !iconShader.current) return
    const { ringTarget, scratch } = pose.current
    const edge = edgeShader.current.uniforms
    const icon = iconShader.current.uniforms
    const { progress, time } = motion.current
    const delta = Math.min(frameDelta, .1)
    const stage = index + 2
    const distance = Math.abs(stage - progress)
    const rotation = MathUtils.smoothstep(progress, 5.03, 5.98)
    const closing = MathUtils.smoothstep(progress, 6.25, 7.14)
    const proximity = 1 - MathUtils.smoothstep(distance, .06, 1.05)
    body.visible = progress > 1.24 && progress < 7.28 && (distance < 1.85 || rotation > 0)
    placeInShot(body, stage, journey.current, 4.95, 3.32)
    placeInShot(ringTarget, 6, journey.current, 7.35, 5.2)
    const angle = index * Math.PI / 2 + .58 + (progress - 6) * .42 + pointer.current.slow.x * .17
    const radius = 2.28 + closing * 1.62
    scratch.copy(ringTarget.position)
    scratch.x += Math.cos(angle) * radius * ringTarget.scale.x
    scratch.y += Math.sin(angle) * radius * .82 * ringTarget.scale.x
    scratch.z += Math.sin(angle + .8) * 1.25 * ringTarget.scale.x - closing * 3.7
    body.position.lerp(scratch, rotation)
    body.position.x += Math.sin(rotation * Math.PI) * (index === 3 ? .7 : 3.4)
    body.scale.setScalar(MathUtils.lerp(body.scale.x, ringTarget.scale.x * (.41 - closing * .18), rotation))
    centers[index].copy(body.position)

    if (!body.visible) return
    const mouse = pointer.current
    surface.updateWorldMatrix(true, false)
    const hit = mouse.inside && (distance < .85 || rotation > .84) ? ray.current.intersectObject(surface, false)[0] : undefined
    const hover = MathUtils.damp(edge.uHover.value, hit ? 1 : 0, 8, delta)
    const contact = edge.uContact.value
    if (hit) {
      surface.worldToLocal(scratch.copy(hit.point))
      contact.set(MathUtils.lerp(contact.x, scratch.x / 4.2 + .5, .32), MathUtils.lerp(contact.y, scratch.y / 2.78 + .5, .32))
    } else {
      contact.set(MathUtils.damp(contact.x, .5, 5, delta), MathUtils.damp(contact.y, .5, 5, delta))
    }

    const turn = (stage > progress ? -.49 : .56) * (1 - proximity)
    front.rotation.y = MathUtils.damp(front.rotation.y, (turn + mouse.slow.x * (.09 + hover * .24)) * (1 - rotation) + rotation * Math.cos(angle) * .44, 6, delta)
    front.rotation.x = MathUtils.damp(front.rotation.x, -.095 + mouse.slow.y * (.13 + hover * .18), 7, delta)
    front.rotation.z = rotation * (Math.sin(angle) * .17 - .04)
    edge.uTime.value = time
    edge.uHover.value = hover
    material.current.roughness = .23 - hover * .13
    material.current.emissiveIntensity = .24 + .44 * proximity + .57 * hover
    icon.uAssemble.value = Math.max(proximity, rotation * .94)
    icon.uRing.value = rotation
    icon.uContact.value.copy(contact)
    icon.uHover.value = hover
    icon.uTime.value = time
    reveal.current = (1 - MathUtils.smoothstep(rotation, .34, .71)) * MathUtils.smoothstep(proximity, .24, .87) * 1.13
    capabilityReveal.current = MathUtils.smoothstep(rotation, .72, .98) * (1 - closing) * 1.13
  }, -1)

  return (
    <group ref={group} name={`verification-panel-${index + 1}`} visible={false}>
      <group ref={inner}>
        <mesh ref={glass} name="bevel">
          <primitive object={geometry} attach="geometry" />
          <meshPhysicalMaterial ref={material} color="#17458d" metalness={.25} roughness={.23} clearcoat={.9} transparent opacity={.71} depthWrite={false} emissive="#0c3079" emissiveIntensity={.3} />
        </mesh>
        <mesh position={[0, 0, .15]}>
          <planeGeometry args={[4.17, 2.75]} />
          <shaderMaterial ref={edgeShader} uniforms={uniforms} vertexShader={surfaceVertex} fragmentShader={surfaceFragment} transparent depthWrite={false} />
        </mesh>
        <points frustumCulled={false} name="panel-icon">
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[icon.from, 3]} />
            <bufferAttribute attach="attributes-aCapability" args={[icon.to, 3]} />
            <bufferAttribute attach="attributes-aSeed" args={[icon.seeds, 1]} />
          </bufferGeometry>
          <shaderMaterial ref={iconShader} uniforms={iconUniforms} vertexShader={iconVertex} fragmentShader={iconFragment} transparent depthWrite={false} />
        </points>
        <SpatialLabel title={labels[index]} kicker={`LEBATI  /  STAGE 0${index + 1}`} width={3.22} position={[0, -.87, .18]} reveal={reveal} pointer={pointer} />
        <SpatialLabel title={capabilities[index]} kicker={`COMPLIANCE  /  0${index + 1}`} width={3.65} position={[0, -.89, .19]} reveal={capabilityReveal} pointer={pointer} />
      </group>
    </group>
  )
}

const linkVertex = `
  attribute float aAlong;
  varying float vAlong;
  varying float vDepth;
  void main() {
    vec4 view=modelViewMatrix*vec4(position,1.);
    gl_Position=projectionMatrix*view;
    vAlong=aAlong;
    vDepth=-view.z;
  }
`
const linkFragment = `
  uniform float uEnergy;
  uniform float uFade;
  varying float vAlong;
  varying float vDepth;
  void main(){
    float pulse = pow(.5+.5*cos((vAlong-uEnergy)*11.),8.);
    vec3 color=mix(vec3(.20,.40,.9),vec3(1.,.72,.30),.45+pulse*.54);
    float alpha=smoothstep(.35,2.,vDepth)*(1.-smoothstep(12.,25.,vDepth))*(.19+pulse*.68)*uFade;
    gl_FragColor=vec4(color,alpha);
    #include <colorspace_fragment>
  }
`

function PanelLink({ index, centers, motion }: { index: number; centers: Vector3[]; motion: Rig['motion'] }) {
  const position = useRef<BufferAttribute>(null)
  const shader = useRef<ShaderMaterial>(null)
  const segments = 58
  const geometry = useMemo(() => ({
    coordinates: new Float32Array((segments + 1) * 3),
    length: Float32Array.from({ length: segments + 1 }, (_, i) => i / segments),
  }), [])
  const uniforms = useMemo(() => ({ uEnergy: { value: 0 }, uFade: { value: 0 } }), [])
  useFrame(() => {
    const attribute = position.current
    if (!attribute || !shader.current) return
    const uniforms = shader.current.uniforms
    const { progress, time } = motion.current
    const a = centers[index], b = centers[index + 1]
    uniforms.uEnergy.value = progress * .65 + time * .22
    uniforms.uFade.value = MathUtils.smoothstep(progress, 1.5, 2.12) * (1 - MathUtils.smoothstep(progress, 6.55, 7.12))
    if (uniforms.uFade.value < .001) return
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      attribute.setXYZ(i, MathUtils.lerp(a.x, b.x, t) + Math.sin(t * Math.PI) * 1.16, MathUtils.lerp(a.y, b.y, t) + Math.sin(t * Math.PI) * .55, MathUtils.lerp(a.z, b.z, t) - .22)
    }
    attribute.needsUpdate = true
  }, -.5)
  return (
    <EnergyLine frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute ref={position} attach="attributes-position" args={[geometry.coordinates, 3]} />
        <bufferAttribute attach="attributes-aAlong" args={[geometry.length, 1]} />
      </bufferGeometry>
      <shaderMaterial ref={shader} uniforms={uniforms} vertexShader={linkVertex} fragmentShader={linkFragment} transparent depthWrite={false} />
    </EnergyLine>
  )
}

export function PanelSequence(rig: Rig) {
  const geometry = useMemo(() => new RoundedBoxGeometry(4.23, 2.81, .23, 3, .12), [])
  const centers = useMemo(() => Array.from({ length: 4 }, () => new Vector3()), [])
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <>
      {labels.map((label, index) => <Panel key={label} {...rig} index={index} geometry={geometry} centers={centers} />)}
      {[0, 1, 2].map(index => <PanelLink key={index} index={index} centers={centers} motion={rig.motion} />)}
    </>
  )
}
