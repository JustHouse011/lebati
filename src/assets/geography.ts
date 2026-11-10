import boundary from './south-africa.json'

export function project([longitude, latitude]: number[]): [number, number] {
  return [(longitude - 24.9) * 0.34, (latitude + 28.8) * 0.395]
}

export const polygons = boundary.coordinates
  .filter(polygon => polygon[0].some(point => point[1] > -40))
  .map(polygon => polygon.map(ring => ring.map(project)))

export const stations = [
  [18.49, -33.77], [25.59, -33.8], [27.86, -32.88], [30.99, -29.8],
  [28.05, -26.19], [26.2, -29.11], [30.96, -25.48], [21.25, -28.46],
  [29.45, -23.92], [23.05, -31.1], [28.2, -25.75],
].map(project)
