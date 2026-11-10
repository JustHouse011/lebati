import { CatmullRomCurve3, MathUtils, Vector3 } from 'three'
import type { Object3D } from 'three'
import { stops } from '../../animations/journey'
import type { JourneyState } from '../../animations/journey'

const shots = stops.map(shot => {
  const eye = new Vector3(...shot.eye)
  const aim = new Vector3(...shot.aim)
  const forward = aim.clone().sub(eye).normalize()
  const right = forward.clone().cross(new Vector3(0, 1, 0)).normalize()
  const up = right.clone().cross(forward)
  return { eye, aim, right, up, planeHeight: 2 * aim.distanceTo(eye) * Math.tan(MathUtils.degToRad(shot.fov / 2)) }
})

export const cameraPath = new CatmullRomCurve3(shots.map(shot => shot.eye), false, 'catmullrom', 0.26)
export const aimPath = new CatmullRomCurve3(shots.map(shot => shot.aim), false, 'catmullrom', 0.31)

export function placeInShot(object: Object3D, index: number, journey: JourneyState, width: number, height: number) {
  const shot = shots[index]
  const { viewport, anchors } = journey
  const area = anchors[stops[index].id]
  const planeWidth = shot.planeHeight * viewport.width / viewport.height
  object.position.copy(shot.aim)
  if (!area || !area.width || !area.height) {
    object.scale.setScalar(1)
    return
  }
  const x = (area.x / viewport.width - 0.5) * planeWidth
  const centerY = index === 0 ? Math.min(area.y, viewport.height * .9) : MathUtils.clamp(area.y, viewport.height * .31, viewport.height * .83)
  const y = (0.5 - centerY / viewport.height) * shot.planeHeight
  object.position.addScaledVector(shot.right, x).addScaledVector(shot.up, y)
  const scale = Math.min(planeWidth * area.width / viewport.width / width, shot.planeHeight * area.height / viewport.height / height)
  object.scale.setScalar(scale)
}
