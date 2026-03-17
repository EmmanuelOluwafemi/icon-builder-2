import { describe, it, expect } from "vitest"
import { findContainingFrame } from "@/lib/find-containing-frame"
import type { Frame } from "@/store/editor"

const frame = (overrides?: Partial<Frame>): Frame => ({
  id: "f1",
  name: "frame",
  x: 100,
  y: 100,
  width: 200,
  height: 200,
  ...overrides,
})

describe("findContainingFrame", () => {
  it("returns the frame when the point is inside it", () => {
    const result = findContainingFrame(150, 150, [frame()])
    expect(result?.id).toBe("f1")
  })

  it("returns undefined when the point is outside all frames", () => {
    const result = findContainingFrame(50, 50, [frame()])
    expect(result).toBeUndefined()
  })

  it("returns undefined when point is exactly on the right/bottom edge (exclusive)", () => {
    // frame spans x: 100–300, y: 100–300
    expect(findContainingFrame(300, 150, [frame()])).toBeUndefined()
    expect(findContainingFrame(150, 300, [frame()])).toBeUndefined()
  })

  it("returns the frame when point is exactly on the left/top edge (inclusive)", () => {
    expect(findContainingFrame(100, 150, [frame()])?.id).toBe("f1")
    expect(findContainingFrame(150, 100, [frame()])?.id).toBe("f1")
  })

  it("returns the first matching frame when multiple overlap at the point", () => {
    const f1 = frame({ id: "f1" })
    const f2 = frame({ id: "f2" })
    const result = findContainingFrame(150, 150, [f1, f2])
    expect(result?.id).toBe("f1")
  })

  it("returns undefined for an empty frame list", () => {
    expect(findContainingFrame(0, 0, [])).toBeUndefined()
  })
})
