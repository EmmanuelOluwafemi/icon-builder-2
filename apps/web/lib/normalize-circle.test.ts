import { describe, it, expect } from "vitest"
import { normalizeCircle } from "@/lib/normalize-circle"

describe("normalizeCircle", () => {
  it("standard drag (top-left → bottom-right) computes center and positive radii", () => {
    const result = normalizeCircle({ x: 10, y: 20 }, { x: 110, y: 120 })
    expect(result).toEqual({ x: 60, y: 70, radiusX: 50, radiusY: 50 })
  })

  it("horizontal inversion (right → left) still gives correct center and positive radii", () => {
    const result = normalizeCircle({ x: 110, y: 20 }, { x: 10, y: 120 })
    expect(result).toEqual({ x: 60, y: 70, radiusX: 50, radiusY: 50 })
  })

  it("vertical inversion (bottom → top) still gives correct center and positive radii", () => {
    const result = normalizeCircle({ x: 10, y: 120 }, { x: 110, y: 20 })
    expect(result).toEqual({ x: 60, y: 70, radiusX: 50, radiusY: 50 })
  })

  it("full inversion (both axes) still gives correct center and positive radii", () => {
    const result = normalizeCircle({ x: 110, y: 120 }, { x: 10, y: 20 })
    expect(result).toEqual({ x: 60, y: 70, radiusX: 50, radiusY: 50 })
  })

  it("non-square drag produces different radiusX and radiusY", () => {
    const result = normalizeCircle({ x: 0, y: 0 }, { x: 80, y: 40 })
    expect(result).toEqual({ x: 40, y: 20, radiusX: 40, radiusY: 20 })
  })
})
