import { describe, it, expect, beforeEach } from "vitest"
import { PenPathBuilder } from "@/lib/pen-path-builder"

let builder: PenPathBuilder

beforeEach(() => {
  builder = new PenPathBuilder()
})

// ── Anchor tracking ───────────────────────────────────────────────────────

describe("addAnchor", () => {
  it("after one anchor — segmentCount is 1 and firstPoint matches", () => {
    builder.addAnchor({ x: 10, y: 20 })
    expect(builder.segmentCount).toBe(1)
    expect(builder.firstPoint).toEqual({ x: 10, y: 20 })
  })

  it("isEmpty becomes false after adding an anchor", () => {
    builder.addAnchor({ x: 0, y: 0 })
    expect(builder.isEmpty).toBe(false)
  })

  it("segmentCount increments with each anchor", () => {
    builder.addAnchor({ x: 0, y: 0 })
    builder.addAnchor({ x: 50, y: 50 })
    builder.addAnchor({ x: 100, y: 0 })
    expect(builder.segmentCount).toBe(3)
  })
})

// ── Corner anchor serialization ───────────────────────────────────────────

describe("serialize — corner anchors", () => {
  it("single point serializes to M only", () => {
    builder.addAnchor({ x: 10, y: 20 })
    expect(builder.serialize()).toBe("M 10 20")
  })

  it("two corner anchors produce M … L …", () => {
    builder.addAnchor({ x: 0, y: 0 })
    builder.addAnchor({ x: 100, y: 0 })
    expect(builder.serialize()).toBe("M 0 0 L 100 0")
  })

  it("three corner anchors + serializeClosed ends with Z", () => {
    builder.addAnchor({ x: 0, y: 0 })
    builder.addAnchor({ x: 100, y: 0 })
    builder.addAnchor({ x: 50, y: 100 })
    expect(builder.serializeClosed()).toMatch(/Z$/)
  })

  it("serializeClosed includes all three L commands before Z", () => {
    builder.addAnchor({ x: 0, y: 0 })
    builder.addAnchor({ x: 100, y: 0 })
    builder.addAnchor({ x: 50, y: 100 })
    const d = builder.serializeClosed()
    expect(d).toBe("M 0 0 L 100 0 L 50 100 Z")
  })
})

// ── Smooth anchor serialization ───────────────────────────────────────────

describe("serialize — smooth anchors", () => {
  it("smooth anchor produces a C command", () => {
    builder.addAnchor({ x: 0, y: 0 })
    builder.addAnchor({ x: 100, y: 0 }, { x: 30, y: 0 }) // handleOut = (30, 0)
    expect(builder.serialize()).toMatch(/^M 0 0 C /)
  })

  it("smooth anchor control points are derived from the drag handle", () => {
    // Anchor at (0,0), next corner at (100,0)
    // prev.handleOut = (30, 0) → cp1 = (30, 0)
    // next has no handleIn → cp2 = next.point = (100, 0)
    builder.addAnchor({ x: 0, y: 0 }, { x: 30, y: 0 })
    builder.addAnchor({ x: 100, y: 0 })
    expect(builder.serialize()).toBe("M 0 0 C 30 0 100 0 100 0")
  })

  it("smooth-to-smooth: both handles contribute to the C command", () => {
    // prev handleOut = (20, 0) → cp1 = (20, 0)
    // curr handleIn = mirror of handleOut (-10, 0) → cp2 = (100 + -10) = (90, 0)
    builder.addAnchor({ x: 0, y: 0 }, { x: 20, y: 0 })
    builder.addAnchor({ x: 100, y: 0 }, { x: 10, y: 0 })
    expect(builder.serialize()).toBe("M 0 0 C 20 0 90 0 100 0")
  })
})

// ── Initial state ──────────────────────────────────────────────────────────

describe("initial state", () => {
  it("is empty", () => {
    expect(builder.isEmpty).toBe(true)
  })

  it("has no first point", () => {
    expect(builder.firstPoint).toBeNull()
  })

  it("has zero segments", () => {
    expect(builder.segmentCount).toBe(0)
  })
})
