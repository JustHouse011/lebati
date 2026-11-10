import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { Color, Group, MathUtils, Vector2, Vector3 } from 'three'
import type { ShaderMaterial } from 'three'
import type { JourneyState } from '../../animations/journey'
import { random } from './MorphNetwork'
import type { SceneMotion } from './MorphNetwork'
import type { PointerState } from './usePointer'
import { placeInShot } from './world'
import { ChapterType } from './ChapterType'

const skyVertex = `
  varying vec2 vUv;
  void main() {
    vUv=uv;
    gl_Position=vec4(position.xy,.999,1.);
  }
`
const skyFragment = `
  uniform float uPassage;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uAspect;
  uniform float uDetail;
  uniform vec2 uPointer;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float haze(vec2 p) {
    vec2 i=floor(p), f=fract(p);
    f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
  }
  void main(){
    vec2 p=(vUv-.5)*vec2(uAspect,1.);
    vec2 light=vec2(.31,.05) + uPointer*.08;
    light += vec2(sin(uPassage*.94)*.17,cos(uPassage*.81)*.1);
    vec2 r=p-light;
    float distance=length(r);
    float core=exp(-distance*distance*4.5);
    float slant=r.y-r.x*(.38+.12*sin(uPassage*.68));
    float mist=exp(-abs(slant)*7.2)*exp(-distance*1.2);
    float texture=0.;
    if (uDetail>.5) {
      vec2 flow=p*2.8 + vec2(uPassage*.09, uTime*.027);
      texture=haze(flow)*.55+haze(flow*2.07+2.1)*.45;
    }
    float glow=core*(.45+texture*.15)+mist*(.15+min(uSpeed,.5)*.17);
    float floorLight=exp(-abs(p.y+.49)*9.)*exp(-abs(p.x-.25)*.8)*.18;
    vec3 dark=vec3(.0012,.004,.016);
    vec3 blue=vec3(.009,.038,.145)*glow+vec3(.004,.018,.07)*floorLight;
    gl_FragColor=vec4(dark+blue,.8);
    #include <colorspace_fragment>
  }
`
const dustVertex = `
  attribute vec4 aArrival;
  attribute float aSeed;
  uniform float uTime;
  uniform float uForm;
  uniform float uPresence;
  uniform float uPixelRatio;
  uniform vec2 uPointer;
  uniform vec2 uVelocity;
  uniform vec3 uArrival;
  uniform float uScale;
  varying float vDepth;
  varying float vSeed;
  varying float vNear;
  varying float vForm;
  void main(){
    float travel=smoothstep(.0,1.,uForm*1.18-aSeed*.16)*aArrival.w;
    vec3 point=mix(position,uArrival + aArrival.xyz*uScale,travel);
    point.xy+=vec2(sin(uTime*.47+aSeed*35.),cos(uTime*.39+aSeed*24.))*.12;
    vec4 view=viewMatrix*vec4(point,1.);
    vec4 clip=projectionMatrix*view;
    vec2 difference=clip.xy/max(.03,abs(clip.w))-uPointer;
    float nearPointer=exp(-dot(difference,difference)*22.)*uPresence;
    clip.xy+=(difference*.22+uVelocity*.022)*nearPointer*max(clip.w,0.);
    gl_Position=clip;
    gl_PointSize=clamp(35./max(1.,-view.z),1.15,5.5)*(.65+aSeed*.65+nearPointer*.5)*uPixelRatio;
    vDepth=-view.z;
    vSeed=aSeed;
    vNear=nearPointer;
    vForm=travel;
  }
`
const dustFragment = `
  uniform vec3 uCold;
  uniform vec3 uWarm;
  varying float vDepth;
  varying float vSeed;
  varying float vNear;
  varying float vForm;
  void main(){
    float spot=1.-smoothstep(.09,.5,length(gl_PointCoord-.5));
    float attenuation=smoothstep(.5,4.,vDepth)*(1.-smoothstep(21.,44.,vDepth));
    vec3 color=mix(uCold,uWarm,smoothstep(.6,1.,vSeed+vForm*.2));
    gl_FragColor=vec4(color,spot*attenuation*(.11+vSeed*.4+vNear*.24+vForm*.14));
    #include <colorspace_fragment>
  }
`
const trailVertex = `
  attribute float aProgress;
  varying float vProgress;
  varying float vDepth;
  void main(){
    vProgress=aProgress;
    vec4 view=modelViewMatrix*vec4(position,1.);
    vDepth=-view.z;
    gl_Position=projectionMatrix*view;
  }
`
const trailFragment = `
  uniform float uTime;
  uniform float uForm;
  varying float vProgress;
  varying float vDepth;
  void main(){
    float pulse=pow(.5+.5*cos(vProgress*6.283-uTime*1.35-uForm*5.),10.);
    float ends=smoothstep(.0,.08,fract(vProgress))*(1.-smoothstep(.9,1.,fract(vProgress)));
    vec3 color=mix(vec3(.07,.27,.78),vec3(1.,.63,.24),pulse*.74);
    float alpha=smoothstep(.5,4.,vDepth)*(1.-smoothstep(20.,48.,vDepth))*(.12+.61*pulse)*ends*uForm;
    gl_FragColor=vec4(color,alpha);
    #include <colorspace_fragment>
  }
`

export function Atmosphere({ pointer, motion, journey, compact }: {
  pointer: RefObject<PointerState>; motion: RefObject<SceneMotion>; journey: RefObject<JourneyState>; compact: boolean;
}) {
  const trails = useRef<Group>(null)
  const skyShader = useRef<ShaderMaterial>(null)
  const dustShader = useRef<ShaderMaterial>(null)
  const trailShader = useRef<ShaderMaterial>(null)
  const sky = useMemo(() => ({
    uPassage: { value: 0 }, uTime: { value: 0 }, uSpeed: { value: 0 }, uAspect: { value: 1 },
    uPointer: { value: new Vector2() }, uDetail: { value: Number(!compact) },
  }), [compact])
  const dust = useMemo(() => ({
    uTime: sky.uTime, uForm: { value: 0 }, uPresence: { value: 0 }, uPixelRatio: { value: 1 },
    uPointer: { value: new Vector2() }, uVelocity: { value: new Vector2() }, uArrival: { value: new Vector3() }, uScale: { value: 1 },
    uCold: { value: new Color('#518ce5') }, uWarm: { value: new Color('#f1bd6a') },
  }), [sky])

  const field = useMemo(() => {
    const count = compact ? 370 : 1020
    const coordinates = new Float32Array(count * 3)
    const final = new Float32Array(count * 4)
    const seeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const z = 5 - random(i * 13 + 4) * 136
      coordinates.set([(random(i * 13) - .5) * 31, (random(i * 13 + 2) - .5) * 18, z], i * 3)
      const angle = random(i * 13 + 5) * Math.PI * 2
      const radius = 1.7 + Math.floor(random(i * 13 + 9) * 4) * 1.12 + random(i * 13 + 8) * .21
      final.set([Math.cos(angle) * radius, Math.sin(angle) * radius * .44 + Math.cos(angle) * .22, Math.sin(angle) * radius * .32, Number(z < -79)], i * 4)
      seeds[i] = random(i * 13 + 10)
    }
    const curve = [], path = []
    for (let ring = 0; ring < 4; ring++) {
      for (let index = 0; index < 90; index++) {
        for (const t of [index / 90, (index + 1) / 90]) {
          const angle = t * (Math.PI * 1.36 + ring * .08) + ring * 1.1
          const radius = 2.05 + ring * 1.16
          curve.push(Math.cos(angle) * radius, Math.sin(angle) * radius * .43 + Math.cos(angle) * .22, Math.sin(angle) * radius * .32)
          path.push(ring + t * .999)
        }
      }
    }
    return { coordinates, final, seeds, curve: new Float32Array(curve), path: new Float32Array(path) }
  }, [compact])

  useFrame(state => {
    if (!skyShader.current || !dustShader.current || !trailShader.current || !trails.current) return
    const sky = skyShader.current.uniforms
    const dust = dustShader.current.uniforms
    const trail = trailShader.current.uniforms
    const { progress, speed, time } = motion.current
    sky.uPassage.value = progress
    sky.uTime.value = time
    sky.uSpeed.value = Math.abs(speed)
    sky.uAspect.value = state.size.width / state.size.height
    sky.uPointer.value.copy(pointer.current.slow)
    dust.uPointer.value.copy(pointer.current.position)
    dust.uVelocity.value.copy(pointer.current.velocity)
    dust.uPresence.value = pointer.current.present
    dust.uTime.value = time
    dust.uPixelRatio.value = state.viewport.dpr
    const formation = MathUtils.smoothstep(progress, 7.18, 8)
    dust.uForm.value = formation
    trail.uTime.value = time
    trail.uForm.value = formation
    placeInShot(trails.current, 8, journey.current, 10.7, 5.5)
    trails.current.rotation.y = pointer.current.slow.x * .12 - .12
    trails.current.rotation.z = MathUtils.lerp(-.28, .13, formation)
    trails.current.visible = formation > .01
    dust.uArrival.value.copy(trails.current.position)
    dust.uScale.value = trails.current.scale.x
  }, -.7)

  return (
    <>
      <mesh renderOrder={-100} frustumCulled={false} name="atmosphere">
        <planeGeometry args={[2, 2]} />
        <shaderMaterial ref={skyShader} uniforms={sky} vertexShader={skyVertex} fragmentShader={skyFragment} depthTest={false} depthWrite={false} />
      </mesh>
      <points frustumCulled={false} name="corridor-particles">
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[field.coordinates, 3]} />
          <bufferAttribute attach="attributes-aArrival" args={[field.final, 4]} />
          <bufferAttribute attach="attributes-aSeed" args={[field.seeds, 1]} />
        </bufferGeometry>
        <shaderMaterial ref={dustShader} uniforms={dust} vertexShader={dustVertex} fragmentShader={dustFragment} depthWrite={false} transparent />
      </points>
      <group ref={trails} name="contact-constellation" visible={false}>
        <ChapterType text="LEBATI" position={[0, -.36, -.85]} size={1.06} opacity={.19} />
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[field.curve, 3]} />
            <bufferAttribute attach="attributes-aProgress" args={[field.path, 1]} />
          </bufferGeometry>
          <shaderMaterial ref={trailShader} uniforms={dust} vertexShader={trailVertex} fragmentShader={trailFragment} depthWrite={false} transparent />
        </lineSegments>
      </group>
    </>
  )
}

export function AdaptiveQuality() {
  const setDpr = useThree(state => state.setDpr)
  const quality = useRef({ elapsed: 0, frames: 0, recovery: 0 })
  useFrame((state, delta) => {
    if (document.hidden || state.frameloop === 'never') return
    const measure = quality.current
    measure.frames++
    measure.elapsed += Math.min(delta, .16)
    if (measure.elapsed < 1.8) return
    const fps = measure.frames / measure.elapsed
    const current = state.viewport.dpr
    const limit = Math.min(window.devicePixelRatio, state.size.width < 800 ? 1.2 : 1.4)
    if (fps < 44) {
      if (current > .69) setDpr(Math.max(.68, current * .83))
      measure.recovery = 0
    } else if (fps >= 57 && current < limit) {
      measure.recovery++
      if (measure.recovery >= 3) { setDpr(Math.min(limit, current + .1)); measure.recovery = 0 }
    }
    measure.elapsed = 0
    measure.frames = 0
  })
  return null
}
