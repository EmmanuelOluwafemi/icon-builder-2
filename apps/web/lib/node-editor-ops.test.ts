import { describe, it, expect } from "vitest"
import {
  moveAnchor,
  moveHandle,
  removeAnchor,
  isPathClosed,
  parsePathSegments,
  serializeSegments,
  insertAnchorAt,
  type Segment,
} from "@/lib/node-editor-ops"

function seg(
  px: number,
  py: number,
  hix = 0,
  hiy = 0,
  hox = 0,
  hoy = 0
): Segment {
  return { point: { x: px, y: py }, handleIn: { x: hix, y: hiy }, handleOut: { x: hox, y: hoy } }
}

// ── moveAnchor ────────────────────────────────────────────────────────────────

describe("moveAnchor", () => {
  it("translates the point by dx/dy", () => {
    const segs = [seg(10, 20)]
    const result = moveAnchor(segs, 0, 5, -3)
    expect(result[0]!.point).toEqual({ x: 15, y: 17 })
  })

  it("preserves handle vectors unchanged", () => {
    const segs = [seg(10, 20, -5, 0, 5, 0)]
    const result = moveAnchor(segs, 0, 100, 100)
    expect(result[0]!.handleIn).toEqual({ x: -5, y: 0 })
    expect(result[0]!.handleOut).toEqual({ x: 5, y: 0 })
  })

  it("only moves the targeted index, leaves others unchanged", () => {
    const segs = [seg(0, 0), seg(50, 50), seg(100, 0)]
    const result = moveAnchor(segs, 1, 10, 10)
    expect(result[0]!.point).toEqual({ x: 0, y: 0 })
    expect(result[1]!.point).toEqual({ x: 60, y: 60 })
    expect(result[2]!.point).toEqual({ x: 100, y: 0 })
  })

  it("does not mutate the original array", () => {
    const segs = [seg(10, 20)]
    const original = segs[0]!.point.x
    moveAnchor(segs, 0, 99, 99)
    expect(segs[0]!.point.x).toBe(original)
  })
})

// ── moveHandle ────────────────────────────────────────────────────────────────

describe("moveHandle", () => {
  it("moves handleOut to new relative position", () => {
    const segs = [seg(0, 0, 0, 0, 10, 0)]
    const result = moveHandle(segs, 0, "out", 20, 5)
    expect(result[0]!.handleOut).toEqual({ x: 20, y: 5 })
  })

  it("moves handleIn to new relative position", () => {
    const segs = [seg(0, 0, -10, 0, 10, 0)]
    const result = moveHandle(segs, 0, "in", -20, -5)
    expect(result[0]!.handleIn).toEqual({ x: -20, y: -5 })
  })

  it("moving handleOut does not affect handleIn", () => {
    const segs = [seg(0, 0, -10, 0, 10, 0)]
    const result = moveHandle(segs, 0, "out", 30, 0)
    expect(result[0]!.handleIn).toEqual({ x: -10, y: 0 })
  })

  it("does not mutate the original array", () => {
    const segs = [seg(0, 0, 0, 0, 10, 0)]
    const original = segs[0]!.handleOut.x
    moveHandle(segs, 0, "out", 99, 99)
    expect(segs[0]!.handleOut.x).toBe(original)
  })
})

// ── removeAnchor ──────────────────────────────────────────────────────────────

describe("removeAnchor", () => {
  it("removes the segment at the given index", () => {
    const segs = [seg(0, 0), seg(50, 50), seg(100, 0)]
    const result = removeAnchor(segs, 1)
    expect(result).toHaveLength(2)
    expect(result[0]!.point).toEqual({ x: 0, y: 0 })
    expect(result[1]!.point).toEqual({ x: 100, y: 0 })
  })

  it("does not mutate the original array", () => {
    const segs = [seg(0, 0), seg(50, 50)]
    const original = segs.length
    removeAnchor(segs, 0)
    expect(segs).toHaveLength(original)
  })
})

// ── parsePathSegments ─────────────────────────────────────────────────────────

describe("parsePathSegments", () => {
  it("parses a simple M L path into corner segments", () => {
    const segs = parsePathSegments("M 10 20 L 50 60")
    expect(segs).toHaveLength(2)
    expect(segs[0]!.point).toEqual({ x: 10, y: 20 })
    expect(segs[0]!.handleIn).toEqual({ x: 0, y: 0 })
    expect(segs[0]!.handleOut).toEqual({ x: 0, y: 0 })
    expect(segs[1]!.point).toEqual({ x: 50, y: 60 })
  })

  it("parses a cubic bezier C command into handleOut on prev and handleIn on current", () => {
    // M 0 0 C 10 0 40 0 50 0
    // handleOut of seg[0] = (10-0, 0-0) = (10, 0)
    // handleIn  of seg[1] = (40-50, 0-0) = (-10, 0)
    const segs = parsePathSegments("M 0 0 C 10 0 40 0 50 0")
    expect(segs).toHaveLength(2)
    expect(segs[0]!.handleOut).toEqual({ x: 10, y: 0 })
    expect(segs[1]!.handleIn).toEqual({ x: -10, y: 0 })
  })

  it("strips the Z close command — closed is indicated by isPathClosed", () => {
    const segs = parsePathSegments("M 0 0 L 100 0 L 100 100 Z")
    expect(segs).toHaveLength(3)
  })

  it("round-trips: serializeSegments(parsePathSegments(d)) reproduces the same structure", () => {
    const d = "M 0 0 C 10 0 40 0 50 0"
    const segs = parsePathSegments(d)
    const closed = isPathClosed(d)
    const rebuilt = parsePathSegments(serializeSegments(segs, closed))
    expect(rebuilt).toHaveLength(segs.length)
    rebuilt.forEach((s: Segment, i: number) => {
      expect(s.point.x).toBeCloseTo(segs[i]!.point.x)
      expect(s.point.y).toBeCloseTo(segs[i]!.point.y)
      expect(s.handleOut.x).toBeCloseTo(segs[i]!.handleOut.x)
      expect(s.handleIn.x).toBeCloseTo(segs[i]!.handleIn.x)
    })
  })
})

// ── serializeSegments ─────────────────────────────────────────────────────────

describe("serializeSegments", () => {
  it("serializes corner segments as M + L commands", () => {
    const segs: Segment[] = [
      { point: { x: 0, y: 0 }, handleIn: { x: 0, y: 0 }, handleOut: { x: 0, y: 0 } },
      { point: { x: 100, y: 0 }, handleIn: { x: 0, y: 0 }, handleOut: { x: 0, y: 0 } },
    ]
    const d = serializeSegments(segs, false)
    // Should start with M and contain L
    expect(d).toMatch(/^M/)
    expect(d).toContain("L")
  })

  it("serializes smooth segments as M + C commands", () => {
    const segs: Segment[] = [
      { point: { x: 0, y: 0 }, handleIn: { x: 0, y: 0 }, handleOut: { x: 10, y: 0 } },
      { point: { x: 50, y: 0 }, handleIn: { x: -10, y: 0 }, handleOut: { x: 0, y: 0 } },
    ]
    const d = serializeSegments(segs, false)
    expect(d).toContain("C")
  })

  it("appends Z when closed=true", () => {
    const segs: Segment[] = [
      { point: { x: 0, y: 0 }, handleIn: { x: 0, y: 0 }, handleOut: { x: 0, y: 0 } },
      { point: { x: 50, y: 0 }, handleIn: { x: 0, y: 0 }, handleOut: { x: 0, y: 0 } },
    ]
    const d = serializeSegments(segs, true)
    expect(d.trimEnd()).toMatch(/[zZ]$/)
  })

  it("does not append Z when closed=false", () => {
    const segs: Segment[] = [
      { point: { x: 0, y: 0 }, handleIn: { x: 0, y: 0 }, handleOut: { x: 0, y: 0 } },
    ]
    const d = serializeSegments(segs, false)
    expect(d).not.toMatch(/[zZ]/)
  })
})

// ── insertAnchorAt ────────────────────────────────────────────────────────────

describe("insertAnchorAt", () => {
  it("inserts a new anchor between two segments, returning length + 1", () => {
    const segs: Segment[] = [
      seg(0, 0), seg(100, 0),
    ]
    const result = insertAnchorAt(segs, 0, 0.5)
    expect(result).toHaveLength(3)
  })

  it("new anchor at t=0.5 of a straight line lands at midpoint", () => {
    const segs: Segment[] = [seg(0, 0), seg(100, 0)]
    const result = insertAnchorAt(segs, 0, 0.5)
    expect(result[1]!.point.x).toBeCloseTo(50)
    expect(result[1]!.point.y).toBeCloseTo(0)
  })

  it("preserves endpoints: first and last segment points are unchanged", () => {
    const segs: Segment[] = [seg(0, 0), seg(100, 0)]
    const result = insertAnchorAt(segs, 0, 0.3)
    expect(result[0]!.point).toEqual({ x: 0, y: 0 })
    expect(result[2]!.point).toEqual({ x: 100, y: 0 })
  })

  it("does not mutate the original array", () => {
    const segs: Segment[] = [seg(0, 0), seg(100, 0)]
    const origLen = segs.length
    insertAnchorAt(segs, 0, 0.5)
    expect(segs).toHaveLength(origLen)
  })
})

// ── isPathClosed ──────────────────────────────────────────────────────────────

describe("isPathClosed", () => {
  it("returns true for path ending with Z", () => {
    expect(isPathClosed("M 0 0 L 50 50 Z")).toBe(true)
  })

  it("returns true for lowercase z", () => {
    expect(isPathClosed("M 0 0 L 50 50 z")).toBe(true)
  })

  it("returns false for open path", () => {
    expect(isPathClosed("M 0 0 L 50 50")).toBe(false)
  })

  it("returns false for empty string", () => {
    expect(isPathClosed("")).toBe(false)
  })
})
