import { useEffect, useMemo } from 'react'
import { ExtrudeGeometry, Shape, TubeGeometry, Vector3, CatmullRomCurve3 } from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

const gold = '#d4af55'

function shieldShape() {
  const shape = new Shape()
  shape.moveTo(0, 1)
  shape.bezierCurveTo(0.23, 0.88, 0.54, 0.76, 0.79, 0.72)
  shape.lineTo(0.75, 0.17)
  shape.bezierCurveTo(0.7, -0.44, 0.37, -0.77, 0, -0.96)
  shape.bezierCurveTo(-0.37, -0.77, -0.7, -0.44, -0.75, 0.17)
  shape.lineTo(-0.79, 0.72)
  shape.bezierCurveTo(-0.54, 0.76, -0.23, 0.88, 0, 1)
  return shape
}

function GoldMaterial() {
  return <meshStandardMaterial color={gold} metalness={0.79} roughness={0.25} emissive="#7c4b17" emissiveIntensity={0.31} />
}

function Rod({ points, radius = 0.022 }: { points: [number, number, number][]; radius?: number }) {
  const curve = new CatmullRomCurve3(points.map(point => new Vector3(...point)))
  return <mesh><tubeGeometry args={[curve, 18, radius, 8, false]} /><GoldMaterial /></mesh>
}

function Scales() {
  return (
    <group position={[0, 0.1, 0.35]}>
      <Rod points={[[0, -0.38, 0], [0, 0, 0], [0, 0.36, 0]]} radius={0.026} />
      <Rod points={[[-0.46, 0.18, 0], [0, 0.25, 0], [0.46, 0.18, 0]]} />
      <Rod points={[[-0.24, -0.39, 0], [0, -0.39, 0], [0.24, -0.39, 0]]} />
      <mesh position={[0, 0.37, 0]}><sphereGeometry args={[0.042, 16, 12]} /><GoldMaterial /></mesh>
      {[-1, 1].map(side => (
        <group key={side} position={[side * 0.34, 0.2, 0]}>
          <Rod points={[[-0.135, -0.31, 0], [0, 0, 0], [0.135, -0.31, 0]]} radius={0.013} />
          <mesh position={[0, -0.319, 0]} scale={[1, 0.27, 0.65]}><sphereGeometry args={[0.154, 24, 12]} /><GoldMaterial /></mesh>
        </group>
      ))}
    </group>
  )
}

export function ComplianceShield({ lock = false }: { lock?: boolean }) {
  const geometry = useMemo(() => new ExtrudeGeometry(shieldShape(), {
    depth: 0.105, bevelEnabled: true, bevelSize: 0.055, bevelThickness: 0.047, bevelSegments: 3, curveSegments: 20,
  }), [])
  const shackle = useMemo(() => {
    const points = Array.from({ length: 25 }, (_, index) => {
      const angle = Math.PI * index / 24
      return new Vector3(Math.cos(angle) * 0.23, 0.13 + Math.sin(angle) * 0.23, 0.34)
    })
    return new TubeGeometry(new CatmullRomCurve3(points), 28, 0.047, 10)
  }, [])
  const lockBody = useMemo(() => new RoundedBoxGeometry(.65, .44, .15, 3, .055), [])
  useEffect(() => () => { geometry.dispose(); shackle.dispose(); lockBody.dispose() }, [geometry, shackle, lockBody])

  return (
    <group>
      <mesh><primitive object={geometry} attach="geometry" /><GoldMaterial /></mesh>
      <mesh position={[0, 0.016, 0.09]} scale={[0.922, 0.93, 0.82]}><primitive object={geometry} attach="geometry" /><meshStandardMaterial color="#092b72" metalness={0.74} roughness={0.27} emissive="#051748" emissiveIntensity={0.5} /></mesh>
      <mesh position={[0, 0.02, 0.143]} scale={[0.856, 0.872, 0.76]}><primitive object={geometry} attach="geometry" /><GoldMaterial /></mesh>
      <mesh position={[0, 0.022, 0.181]} scale={[0.827, 0.841, 0.72]}><primitive object={geometry} attach="geometry" /><meshPhysicalMaterial color={lock ? '#1758b2' : '#10377f'} metalness={0.54} roughness={0.29} clearcoat={0.95} emissive="#071e56" emissiveIntensity={0.67} /></mesh>
      {lock ? (
        <group>
          <mesh><primitive object={shackle} attach="geometry" /><GoldMaterial /></mesh>
          <mesh position={[0, -0.096, 0.36]}><primitive object={lockBody} attach="geometry" /><GoldMaterial /></mesh>
          <mesh position={[0, -0.065, 0.44]}><sphereGeometry args={[0.056, 14, 10]} /><meshBasicMaterial color="#122442" /></mesh>
          <mesh position={[0, -0.117, 0.441]}><boxGeometry args={[0.055, 0.084, 0.01]} /><meshBasicMaterial color="#122442" /></mesh>
        </group>
      ) : <Scales />}
    </group>
  )
}
