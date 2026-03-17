interface Point {
  x: number
  y: number
}

interface NormalizedCircle {
  x: number
  y: number
  radiusX: number
  radiusY: number
}

export function normalizeCircle(start: Point, end: Point): NormalizedCircle {
  const radiusX = Math.abs(end.x - start.x) / 2
  const radiusY = Math.abs(end.y - start.y) / 2
  return {
    x: Math.min(start.x, end.x) + radiusX,
    y: Math.min(start.y, end.y) + radiusY,
    radiusX,
    radiusY,
  }
}
