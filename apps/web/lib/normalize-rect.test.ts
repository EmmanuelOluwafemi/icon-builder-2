import { describe, it, expect } from "vitest"
import { normalizeRect } from "@/lib/normalize-rect"

describe("normalizeRect", () => {
  it("standard drag (top-left → bottom-right) keeps values as-is", () => {
    const result = normalizeRect({ x: 10, y: 20 }, { x: 110, y: 120 })
    expect(result).toEqual({ x: 10, y: 20, width: 100, height: 100 })
  })

  it("horizontal inversion (right → left) corrects x and keeps positive width", () => {
    const result = normalizeRect({ x: 110, y: 20 }, { x: 10, y: 120 })
    expect(result).toEqual({ x: 10, y: 20, width: 100, height: 100 })
  })

  it("vertical inversion (bottom → top) corrects y and keeps positive height", () => {
    const result = normalizeRect({ x: 10, y: 120 }, { x: 110, y: 20 })
    expect(result).toEqual({ x: 10, y: 20, width: 100, height: 100 })
  })

  it("full inversion (both axes) corrects both origin and keeps positive dimensions", () => {
    const result = normalizeRect({ x: 110, y: 120 }, { x: 10, y: 20 })
    expect(result).toEqual({ x: 10, y: 20, width: 100, height: 100 })
  })
})
