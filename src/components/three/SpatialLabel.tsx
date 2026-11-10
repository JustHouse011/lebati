import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, Color, LinearFilter, Vector2 } from 'three'
import type { ShaderMaterial } from 'three'
import type { PointerState } from './usePointer'

const vertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);
  }
`
const fragment = `
  uniform sampler2D uLabel;
  uniform float uReveal;
  uniform vec2 uPointer;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    vec2 uv = vUv + vec2((vUv.y-.5) * uPointer.x * .019, 0.);
    float edge = smoothstep(uv.x-.02,uv.x+.10,uReveal);
    float alpha = texture2D(uLabel,uv).a * edge;
    if(alpha < .015) discard;
    gl_FragColor = vec4(uColor,alpha);
    #include <colorspace_fragment>
  }
`

export function SpatialLabel({ title, kicker, width, position, reveal, pointer }: {
  title: string; kicker: string; width: number; position: [number, number, number];
  reveal: RefObject<number>; pointer: RefObject<PointerState>;
}) {
  const material = useRef<ShaderMaterial>(null)
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 768
    canvas.height = 192
    const context = canvas.getContext('2d')!
    context.fillStyle = 'white'
    context.textAlign = 'center'
    context.font = '25px monospace'
    context.fillText(kicker, 384, 54)
    context.font = '500 59px "Inter Variable", Arial, sans-serif'
    context.fillText(title, 384, 132, 735)
    const texture = new CanvasTexture(canvas)
    texture.generateMipmaps = false
    texture.minFilter = LinearFilter
    return texture
  }, [title, kicker])
  const uniforms = useMemo(() => ({
    uLabel: { value: texture }, uReveal: { value: 0 }, uColor: { value: new Color('#e3edff') }, uPointer: { value: new Vector2() },
  }), [texture])
  useFrame(() => {
    if (!material.current) return
    material.current.visible = reveal.current > .001
    if (!material.current.visible) return
    material.current.uniforms.uReveal.value = reveal.current
    material.current.uniforms.uPointer.value.copy(pointer.current.position)
  }, -.6)
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <mesh position={position}>
      <planeGeometry args={[width, width / 4]} />
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false} />
    </mesh>
  )
}
