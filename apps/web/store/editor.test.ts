import { describe, it, expect, beforeEach } from "vitest"
import {
  useEditorStore,
  canUndo,
  canRedo,
  type RectElement,
  type CircleElement,
  type Frame,
} from "@/store/editor"

// ── Helpers ───────────────────────────────────────────────────────────────

const INITIAL_STATE = {
  elements: [],
  frames: [],
  activeTool: "select" as const,
  selection: [],
  viewport: { x: 0, y: 0, scale: 1 },
  history: [[]],
  historyIndex: 0,
  nodeEditTarget: null,
}

function makeRect(id: string, overrides?: Partial<RectElement>): RectElement {
  return {
    id,
    type: "rect",
    frameId: null,
    name: `rect-${id}`,
    x: 0,
    y: 0,
    rotation: 0,
    fill: "#000",
    stroke: "none",
    strokeWidth: 0,
    opacity: 1,
    width: 100,
    height: 100,
    ...overrides,
  }
}

function makeCircle(id: string): CircleElement {
  return {
    id,
    type: "circle",
    frameId: null,
    name: `circle-${id}`,
    x: 50,
    y: 50,
    rotation: 0,
    fill: "#f00",
    stroke: "none",
    strokeWidth: 0,
    opacity: 1,
    radiusX: 40,
    radiusY: 40,
  }
}

function makeFrame(id: string): Frame {
  return { id, name: `frame-${id}`, x: 0, y: 0, width: 24, height: 24 }
}

beforeEach(() => {
  // Merge-reset: keeps action functions intact while resetting all state fields
  useEditorStore.setState(INITIAL_STATE)
})

// ── Initial state ─────────────────────────────────────────────────────────

describe("initial state", () => {
  it("has the full schema required by the PRD", () => {
    const s = useEditorStore.getState()
    expect(s.elements).toEqual([])
    expect(s.frames).toEqual([])
    expect(s.activeTool).toBe("select")
    expect(s.selection).toEqual([])
    expect(s.viewport).toEqual({ x: 0, y: 0, scale: 1 })
    expect(Array.isArray(s.history)).toBe(true)
    expect(typeof s.historyIndex).toBe("number")
    expect(s.nodeEditTarget).toBeNull()
  })
})

// ── Tool & UI ─────────────────────────────────────────────────────────────

describe("setActiveTool", () => {
  it("switches to the requested tool", () => {
    useEditorStore.getState().setActiveTool("rect")
    expect(useEditorStore.getState().activeTool).toBe("rect")
  })

  it("clears selection when switching tools", () => {
    useEditorStore.setState({ selection: ["a", "b"] })
    useEditorStore.getState().setActiveTool("pen")
    expect(useEditorStore.getState().selection).toEqual([])
  })

  it("clears nodeEditTarget when switching tools", () => {
    useEditorStore.setState({ nodeEditTarget: "some-path-id" })
    useEditorStore.getState().setActiveTool("select")
    expect(useEditorStore.getState().nodeEditTarget).toBeNull()
  })
})

describe("setViewport", () => {
  it("merges partial viewport — updating only provided fields", () => {
    useEditorStore.setState({ viewport: { x: 10, y: 20, scale: 1.5 } })
    useEditorStore.getState().setViewport({ x: 99 })
    const vp = useEditorStore.getState().viewport
    expect(vp.x).toBe(99)
    expect(vp.y).toBe(20)
    expect(vp.scale).toBe(1.5)
  })

  it("applies a full viewport replacement", () => {
    useEditorStore.getState().setViewport({ x: 50, y: 100, scale: 2 })
    expect(useEditorStore.getState().viewport).toEqual({ x: 50, y: 100, scale: 2 })
  })
})

describe("setSelection", () => {
  it("updates the selection array", () => {
    useEditorStore.getState().setSelection(["id-1", "id-2"])
    expect(useEditorStore.getState().selection).toEqual(["id-1", "id-2"])
  })
})

describe("setNodeEditTarget", () => {
  it("sets a node edit target id", () => {
    useEditorStore.getState().setNodeEditTarget("path-abc")
    expect(useEditorStore.getState().nodeEditTarget).toBe("path-abc")
  })

  it("can clear the node edit target", () => {
    useEditorStore.setState({ nodeEditTarget: "path-abc" })
    useEditorStore.getState().setNodeEditTarget(null)
    expect(useEditorStore.getState().nodeEditTarget).toBeNull()
  })
})

// ── Elements ──────────────────────────────────────────────────────────────

describe("addElement", () => {
  it("appends the element to the list", () => {
    const el = makeRect("r1")
    useEditorStore.getState().addElement(el)
    expect(useEditorStore.getState().elements).toContainEqual(el)
  })

  it("pushes a history snapshot so undo becomes available", () => {
    expect(canUndo(useEditorStore.getState())).toBe(false)
    useEditorStore.getState().addElement(makeRect("r1"))
    expect(canUndo(useEditorStore.getState())).toBe(true)
  })

  it("multiple elements accumulate", () => {
    useEditorStore.getState().addElement(makeRect("r1"))
    useEditorStore.getState().addElement(makeRect("r2"))
    expect(useEditorStore.getState().elements).toHaveLength(2)
  })
})

describe("updateElement", () => {
  it("patches the matching element by id", () => {
    useEditorStore.getState().addElement(makeRect("r1"))
    useEditorStore.getState().updateElement("r1", { x: 42, y: 99 })
    const el = useEditorStore.getState().elements.find((e) => e.id === "r1")!
    expect(el.x).toBe(42)
    expect(el.y).toBe(99)
  })

  it("does not mutate other elements", () => {
    useEditorStore.getState().addElement(makeRect("r1"))
    useEditorStore.getState().addElement(makeRect("r2"))
    useEditorStore.getState().updateElement("r1", { x: 999 })
    const r2 = useEditorStore.getState().elements.find((e) => e.id === "r2")!
    expect(r2.x).toBe(0)
  })

  it("is a no-op for an unknown id", () => {
    useEditorStore.getState().addElement(makeRect("r1"))
    useEditorStore.getState().updateElement("nope", { x: 999 })
    expect(useEditorStore.getState().elements).toHaveLength(1)
  })
})

describe("removeElements", () => {
  it("removes elements whose ids are in the list", () => {
    useEditorStore.getState().addElement(makeRect("r1"))
    useEditorStore.getState().addElement(makeRect("r2"))
    useEditorStore.getState().removeElements(["r1"])
    expect(useEditorStore.getState().elements.map((e) => e.id)).toEqual(["r2"])
  })

  it("also removes the deleted ids from selection", () => {
    useEditorStore.getState().addElement(makeRect("r1"))
    useEditorStore.getState().addElement(makeRect("r2"))
    useEditorStore.setState({ selection: ["r1", "r2"] })
    useEditorStore.getState().removeElements(["r1"])
    expect(useEditorStore.getState().selection).toEqual(["r2"])
  })

  it("pushes a history snapshot", () => {
    useEditorStore.getState().addElement(makeRect("r1"))
    const indexBefore = useEditorStore.getState().historyIndex
    useEditorStore.getState().removeElements(["r1"])
    expect(useEditorStore.getState().historyIndex).toBeGreaterThan(indexBefore)
  })
})

describe("reorderElement", () => {
  it("moves an element to a new index", () => {
    useEditorStore.getState().addElement(makeRect("a"))
    useEditorStore.getState().addElement(makeRect("b"))
    useEditorStore.getState().addElement(makeRect("c"))
    useEditorStore.getState().reorderElement("a", 2)
    const ids = useEditorStore.getState().elements.map((e) => e.id)
    expect(ids).toEqual(["b", "c", "a"])
  })

  it("is a no-op for an unknown id", () => {
    useEditorStore.getState().addElement(makeRect("a"))
    useEditorStore.getState().reorderElement("nope", 0)
    expect(useEditorStore.getState().elements.map((e) => e.id)).toEqual(["a"])
  })

  it("pushes a history snapshot", () => {
    useEditorStore.getState().addElement(makeRect("a"))
    useEditorStore.getState().addElement(makeRect("b"))
    const indexBefore = useEditorStore.getState().historyIndex
    useEditorStore.getState().reorderElement("a", 1)
    expect(useEditorStore.getState().historyIndex).toBeGreaterThan(indexBefore)
  })
})

// ── Frames ────────────────────────────────────────────────────────────────

describe("addFrame", () => {
  it("appends the frame", () => {
    const f = makeFrame("f1")
    useEditorStore.getState().addFrame(f)
    expect(useEditorStore.getState().frames).toContainEqual(f)
  })
})

describe("updateFrame", () => {
  it("patches the matching frame by id", () => {
    useEditorStore.getState().addFrame(makeFrame("f1"))
    useEditorStore.getState().updateFrame("f1", { width: 48, height: 48 })
    const f = useEditorStore.getState().frames.find((f) => f.id === "f1")!
    expect(f.width).toBe(48)
    expect(f.height).toBe(48)
  })
})

describe("removeFrame", () => {
  it("removes the frame from the list", () => {
    useEditorStore.getState().addFrame(makeFrame("f1"))
    useEditorStore.getState().removeFrame("f1")
    expect(useEditorStore.getState().frames).toHaveLength(0)
  })

  it("cascades — also removes elements that belonged to the frame", () => {
    useEditorStore.getState().addFrame(makeFrame("f1"))
    useEditorStore.getState().addElement(makeRect("r1", { frameId: "f1" }))
    useEditorStore.getState().addElement(makeRect("r2", { frameId: null }))
    useEditorStore.getState().removeFrame("f1")
    const ids = useEditorStore.getState().elements.map((e) => e.id)
    expect(ids).toEqual(["r2"])
  })
})

// ── History ───────────────────────────────────────────────────────────────

describe("undo / redo", () => {
  it("undo restores the previous elements list", () => {
    const el = makeRect("r1")
    useEditorStore.getState().addElement(el)
    expect(useEditorStore.getState().elements).toHaveLength(1)
    useEditorStore.getState().undo()
    expect(useEditorStore.getState().elements).toHaveLength(0)
  })

  it("undo clears selection and nodeEditTarget", () => {
    useEditorStore.getState().addElement(makeRect("r1"))
    useEditorStore.setState({ selection: ["r1"], nodeEditTarget: "r1" })
    useEditorStore.getState().undo()
    expect(useEditorStore.getState().selection).toEqual([])
    expect(useEditorStore.getState().nodeEditTarget).toBeNull()
  })

  it("undo at historyIndex 0 is a no-op (does not throw)", () => {
    expect(() => useEditorStore.getState().undo()).not.toThrow()
    expect(useEditorStore.getState().historyIndex).toBe(0)
  })

  it("redo re-applies the next snapshot", () => {
    useEditorStore.getState().addElement(makeRect("r1"))
    useEditorStore.getState().undo()
    expect(useEditorStore.getState().elements).toHaveLength(0)
    useEditorStore.getState().redo()
    expect(useEditorStore.getState().elements).toHaveLength(1)
  })

  it("redo at the latest snapshot is a no-op (does not throw)", () => {
    useEditorStore.getState().addElement(makeRect("r1"))
    expect(() => useEditorStore.getState().redo()).not.toThrow()
  })

  it("adding an element after undo discards the redo branch", () => {
    useEditorStore.getState().addElement(makeRect("r1"))
    useEditorStore.getState().undo()
    useEditorStore.getState().addElement(makeRect("r2"))
    // redo branch is gone — historyIndex should be at latest
    expect(canRedo(useEditorStore.getState())).toBe(false)
  })
})

// ── canUndo / canRedo selectors ───────────────────────────────────────────

describe("canUndo selector", () => {
  it("is false at initial state (nothing to undo)", () => {
    expect(canUndo(useEditorStore.getState())).toBe(false)
  })

  it("is true after any committed mutation", () => {
    useEditorStore.getState().addElement(makeRect("r1"))
    expect(canUndo(useEditorStore.getState())).toBe(true)
  })
})

describe("canRedo selector", () => {
  it("is false when at the latest history entry", () => {
    expect(canRedo(useEditorStore.getState())).toBe(false)
  })

  it("is true after an undo", () => {
    useEditorStore.getState().addElement(makeRect("r1"))
    useEditorStore.getState().undo()
    expect(canRedo(useEditorStore.getState())).toBe(true)
  })

  it("is false again after redoing to the latest entry", () => {
    useEditorStore.getState().addElement(makeRect("r1"))
    useEditorStore.getState().undo()
    useEditorStore.getState().redo()
    expect(canRedo(useEditorStore.getState())).toBe(false)
  })
})
