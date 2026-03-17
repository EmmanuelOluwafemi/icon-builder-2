import type { Viewport } from "@/store/editor"

interface Point {
  x: number
  y: number
}

/** Canvas coordinates → screen (pixel) coordinates */
export function canvasToScreen(point: Point, viewport: Viewport): Point {
  return {
    x: point.x * viewport.scale + viewport.x,
    y: point.y * viewport.scale + viewport.y,
  }
}

/** Screen (pixel) coordinates → canvas coordinates */
export function screenToCanvas(point: Point, viewport: Viewport): Point {
  return {
    x: (point.x - viewport.x) / viewport.scale,
    y: (point.y - viewport.y) / viewport.scale,
  }
}
