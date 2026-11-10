import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { Color, ExtrudeGeometry, Object3D, Path, Shape, Vector3 } from 'three'
import type { Group, InstancedMesh, Material, Vector2 } from 'three'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { polygons, stations } from '../../assets/geography'

type SurfaceUniforms = {
  uDissolve: { value: number };
  uGlow: { value: number };
  uCharge: { value: number };
  uFocus: { value: number };
  uContact: { value: Vector2 };
}

export function SouthAfricaMap({ compact, surface }: { compact: boolean; surface: RefObject<SurfaceUniforms> }) {
  const nodes = useRef<InstancedMesh>(null)
  const { terrain, outline } = useMemo(() => {
    const shapes = polygons.map(([coast, ...holes]) => {
      const shape = new Shape()
      coast.forEach(([x, y], i) => i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y))
      shape.holes = holes.map(ring => {
        const hole = new Path()
        ring.forEach(([x, y], i) => i === 0 ? hole.moveTo(x, y) : hole.lineTo(x, y))
        return hole
      })
      return shape
    })
    return {
      terrain: new ExtrudeGeometry(shapes, { depth: .27, bevelEnabled: true, bevelThickness: .041, bevelSize: .03, bevelSegments: compact ? 1 : 2, curveSegments: 1 }),
      outline: polygons.flatMap(polygon => polygon.map(ring => ring.map(([x, y]) => new Vector3(x, y, .314)))),
    }
  }, [compact])
  useEffect(() => () => terrain.dispose(), [terrain])

  useLayoutEffect(() => {
    const instance = nodes.current
    if (!instance) return
    const object = new Object3D()
    stations.forEach(([x, y], index) => {
      object.position.set(x, y, .324)
      object.scale.setScalar(index % 3 === 0 ? 1.3 : 1)
      object.updateMatrix()
      instance.setMatrixAt(index, object.matrix)
      instance.setColorAt(index, new Color(index % 3 === 0 ? '#ffdc9a' : '#8cc7ff'))
    })
    instance.instanceMatrix.needsUpdate = true
    if (instance.instanceColor) instance.instanceColor.needsUpdate = true
  }, [])

  const compile: Material['onBeforeCompile'] = shader => {
    Object.assign(shader.uniforms, surface.current)
    shader.vertexShader = 'varying vec3 vTerrain;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvTerrain=position;')
    shader.fragmentShader = 'varying vec3 vTerrain;\nuniform float uDissolve;\nuniform float uGlow;\n' + shader.fragmentShader
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        vec3 cell = floor(vTerrain * 32.);
        float grain = fract(sin(dot(cell,vec3(127.1,311.7,74.7))) * 43758.5453);
        float front = grain * .77 + (vTerrain.x + 3.) * .036;
        if(front < uDissolve) discard;
      `)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float rim = exp(-abs(front-uDissolve)*39.) * smoothstep(.02,.15,uDissolve);
        totalEmissiveRadiance += vec3(.025,.19,.64)*uGlow*.43 + vec3(.31,.45,.73)*rim;
      `)
  }
  const compileStations: Material['onBeforeCompile'] = shader => {
    Object.assign(shader.uniforms, surface.current)
    shader.vertexShader = 'varying vec2 vStation;\n' + shader.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvStation=instanceMatrix[3].xy;')
    shader.fragmentShader = `varying vec2 vStation;
      uniform vec2 uContact;
      uniform float uFocus;
      uniform float uCharge;
    ` + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      vec2 offset = vStation-uContact;
      float nearStation = exp(-dot(offset,offset)*1.35)*uFocus;
      float charge = 1.-smoothstep(.15,.65,abs(vStation.x-mix(-2.5,2.5,uCharge)));
      charge *= smoothstep(.0,.1,uCharge);
      diffuseColor.rgb += vec3(.29,.43,.66)*nearStation + vec3(.81,.46,.14)*charge;
      diffuseColor.a *= .78 + max(nearStation,charge)*.22;
    `)
  }
  const rims = useRef<Group>(null)
  useFrame(() => {
    if (nodes.current) nodes.current.visible = surface.current.uDissolve.value < .34
    if (rims.current) rims.current.visible = surface.current.uDissolve.value < .54
  }, -1)

  return (
    <group>
      <mesh name="terrain">
        <primitive object={terrain} attach="geometry" />
        <meshPhysicalMaterial attach="material-0" color="#0636a3" metalness={.53} roughness={.31} clearcoat={.6} emissive="#092d91" emissiveIntensity={.55} onBeforeCompile={compile} />
        <meshStandardMaterial attach="material-1" color="#0d2c70" metalness={.72} roughness={.36} emissive="#062a7c" emissiveIntensity={.46} onBeforeCompile={compile} />
      </mesh>
      <group ref={rims}>
        {outline.map((points, index) => <Line key={index} points={points} color="#78b9ff" lineWidth={compact ? 0.8 : 1.35} transparent opacity={0.69} depthWrite={false} />)}
      </group>
      <instancedMesh ref={nodes} args={[undefined, undefined, stations.length]} frustumCulled={false}>
        <ringGeometry args={[.048, .068, 22]} />
        <meshBasicMaterial transparent opacity={.87} onBeforeCompile={compileStations} />
      </instancedMesh>
    </group>
  )
}
