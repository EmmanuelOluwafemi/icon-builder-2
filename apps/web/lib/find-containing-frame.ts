import type { Frame } from "@/store/editor"

/**
 * Returns the first frame whose bounds contain the point (x, y).
 * Left and top edges are inclusive; right and bottom edges are exclusive.
 */
export function findContainingFrame(x: number, y: number, frames: Frame[]): Frame | undefined {
  return frames.find(
    (f) => x >= f.x && x < f.x + f.width && y >= f.y && y < f.y + f.height
  )
}
