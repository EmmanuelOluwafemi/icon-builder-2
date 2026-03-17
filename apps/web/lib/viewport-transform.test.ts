import { describe, it, expect } from "vitest"
import { canvasToScreen, screenToCanvas } from "@/lib/viewport-transform"

const identity = { x: 0, y: 0, scale: 1 }

describe("canvasToScreen", () => {
  it("identity viewport — point is unchanged", () => {
    expect(canvasToScreen({ x: 50, y: 80 }, identity)).toEqual({ x: 50, y: 80 })
  })

  it("viewport translation is added to the point", () => {
    expect(canvasToScreen({ x: 50, y: 80 }, { x: 100, y: 200, scale: 1 })).toEqual({
      x: 150,
      y: 280,
    })
  })

  it("scale multiplies the point then adds translation", () => {
    // screenX = canvasX * scale + viewportX
    expect(canvasToScreen({ x: 10, y: 20 }, { x: 5, y: 5, scale: 2 })).toEqual({
      x: 25,
      y: 45,
    })
  })
})

describe("screenToCanvas", () => {
  it("identity viewport — point is unchanged", () => {
    expect(screenToCanvas({ x: 50, y: 80 }, identity)).toEqual({ x: 50, y: 80 })
  })

  it("viewport translation is subtracted", () => {
    expect(screenToCanvas({ x: 150, y: 280 }, { x: 100, y: 200, scale: 1 })).toEqual({
      x: 50,
      y: 80,
    })
  })

  it("scale is divided out after subtracting translation", () => {
    expect(screenToCanvas({ x: 25, y: 45 }, { x: 5, y: 5, scale: 2 })).toEqual({
      x: 10,
      y: 20,
    })
  })

  it("round-trip: screenToCanvas(canvasToScreen(p)) === p", () => {
    const viewport = { x: 120, y: -30, scale: 1.5 }
    const original = { x: 77, y: 42 }
    const result = screenToCanvas(canvasToScreen(original, viewport), viewport)
    expect(result.x).toBeCloseTo(original.x)
    expect(result.y).toBeCloseTo(original.y)
  })
})
