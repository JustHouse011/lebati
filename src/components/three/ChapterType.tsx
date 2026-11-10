import { useEffect, useMemo } from 'react'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import fontData from '../../assets/inter-display-outlines.json'

const font = new FontLoader().parse(fontData)

export function ChapterType({ text, position, size, opacity = .44 }: {
  text: '02' | '04' | 'LEBATI'; position: [number, number, number]; size: number; opacity?: number;
}) {
  const geometry = useMemo(() => {
    const body = new TextGeometry(text, {
      font, size, depth: size * .11, bevelEnabled: true, bevelThickness: size * .015, bevelSize: size * .013, bevelSegments: 2, curveSegments: 6,
    })
    return body.center()
  }, [text, size])
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh position={position} name="extruded-chapter-type">
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial color="#3a6ac0" metalness={.72} roughness={.29} emissive="#162d67" emissiveIntensity={.38} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}
