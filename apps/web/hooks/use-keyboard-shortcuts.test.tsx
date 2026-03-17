import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { useEditorStore, type RectElement } from "@/store/editor"

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

function makeRect(id: string, x = 0, y = 0): RectElement {
  return {
    id,
    type: "rect",
    frameId: null,
    name: `rect-${id}`,
    x,
    y,
    rotation: 0,
    fill: "#000",
    stroke: "none",
    strokeWidth: 0,
    opacity: 1,
    width: 100,
    height: 100,
  }
}

function fireKey(
  key: string,
  options?: { metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean; repeat?: boolean }
) {
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...options,
      })
    )
  })
}

let unmount: () => void

beforeEach(() => {
  useEditorStore.setState(INITIAL_STATE)
  const result = renderHook(() => useKeyboardShortcuts())
  unmount = result.unmount
})

afterEach(() => {
  unmount()
})

// ── Tool shortcuts ─────────────────────────────────────────────────────────

describe("tool shortcuts (no modifier key)", () => {
  it("V → select tool", () => {
    useEditorStore.setState({ activeTool: "pen" })
    fireKey("v")
    expect(useEditorStore.getState().activeTool).toBe("select")
  })

  it("P → pen tool", () => {
    fireKey("p")
    expect(useEditorStore.getState().activeTool).toBe("pen")
  })

  it("R → rect tool", () => {
    fireKey("r")
    expect(useEditorStore.getState().activeTool).toBe("rect")
  })

  it("O → circle tool", () => {
    fireKey("o")
    expect(useEditorStore.getState().activeTool).toBe("circle")
  })

  it("L → line tool", () => {
    fireKey("l")
    expect(useEditorStore.getState().activeTool).toBe("line")
  })

  it("Z → zoom tool", () => {
    fireKey("z")
    expect(useEditorStore.getState().activeTool).toBe("zoom")
  })

  it("tool shortcut with metaKey does NOT switch tool", () => {
    fireKey("r", { metaKey: true })
    expect(useEditorStore.getState().activeTool).toBe("select")
  })

  it("tool shortcut with ctrlKey does NOT switch tool", () => {
    fireKey("r", { ctrlKey: true })
    expect(useEditorStore.getState().activeTool).toBe("select")
  })

  it("tool shortcut with altKey does NOT switch tool", () => {
    fireKey("r", { altKey: true })
    expect(useEditorStore.getState().activeTool).toBe("select")
  })

  it("repeated keydown (key held down) does NOT fire shortcut", () => {
    fireKey("p") // switch to pen
    fireKey("r", { repeat: true }) // held key — should be ignored
    expect(useEditorStore.getState().activeTool).toBe("pen")
  })
})

// ── Undo / Redo ────────────────────────────────────────────────────────────

describe("undo / redo shortcuts", () => {
  it("Cmd+Z triggers undo", () => {
    useEditorStore.getState().addElement(makeRect("r1"))
    expect(useEditorStore.getState().elements).toHaveLength(1)
    fireKey("z", { metaKey: true })
    expect(useEditorStore.getState().elements).toHaveLength(0)
  })

  it("Ctrl+Z also triggers undo (Windows/Linux)", () => {
    useEditorStore.getState().addElement(makeRect("r1"))
    fireKey("z", { ctrlKey: true })
    expect(useEditorStore.getState().elements).toHaveLength(0)
  })

  it("Cmd+Shift+Z triggers redo", () => {
    useEditorStore.getState().addElement(makeRect("r1"))
    useEditorStore.getState().undo()
    fireKey("z", { metaKey: true, shiftKey: true })
    expect(useEditorStore.getState().elements).toHaveLength(1)
  })
})

// ── Delete / Backspace ─────────────────────────────────────────────────────

describe("delete shortcuts", () => {
  it("Delete removes selected elements", () => {
    // State mutations must be in act() so React flushes re-renders
    // before the hook effect re-runs with the new selection closure
    act(() => {
      useEditorStore.getState().addElement(makeRect("r1"))
      useEditorStore.getState().addElement(makeRect("r2"))
      useEditorStore.setState({ selection: ["r1"] })
    })
    fireKey("Delete")
    expect(useEditorStore.getState().elements.map((e) => e.id)).toEqual(["r2"])
  })

  it("Backspace removes selected elements", () => {
    act(() => {
      useEditorStore.getState().addElement(makeRect("r1"))
      useEditorStore.setState({ selection: ["r1"] })
    })
    fireKey("Backspace")
    expect(useEditorStore.getState().elements).toHaveLength(0)
  })

  it("Delete with no selection is a no-op", () => {
    act(() => {
      useEditorStore.getState().addElement(makeRect("r1"))
    })
    // selection is empty
    fireKey("Delete")
    expect(useEditorStore.getState().elements).toHaveLength(1)
  })
})

// ── Duplicate ──────────────────────────────────────────────────────────────

describe("duplicate shortcut (Cmd+D)", () => {
  it("duplicates selected elements with a 10px offset", () => {
    act(() => {
      useEditorStore.getState().addElement(makeRect("r1", 20, 30))
      useEditorStore.setState({ selection: ["r1"] })
    })
    fireKey("d", { metaKey: true })
    const elements = useEditorStore.getState().elements
    expect(elements).toHaveLength(2)
    const clone = elements[1]!
    expect(clone.x).toBe(30)
    expect(clone.y).toBe(40)
  })

  it("clone gets a unique id different from the original", () => {
    act(() => {
      useEditorStore.getState().addElement(makeRect("r1"))
      useEditorStore.setState({ selection: ["r1"] })
    })
    fireKey("d", { metaKey: true })
    const ids = useEditorStore.getState().elements.map((e) => e.id)
    expect(ids[0]).not.toBe(ids[1])
  })

  it("clone name includes 'copy'", () => {
    act(() => {
      useEditorStore.getState().addElement(makeRect("r1"))
      useEditorStore.setState({ selection: ["r1"] })
    })
    fireKey("d", { metaKey: true })
    expect(useEditorStore.getState().elements[1]!.name).toContain("copy")
  })

  it("Cmd+D with no selection is a no-op", () => {
    act(() => {
      useEditorStore.getState().addElement(makeRect("r1"))
    })
    // selection is empty
    fireKey("d", { metaKey: true })
    expect(useEditorStore.getState().elements).toHaveLength(1)
  })
})

// ── Typing guard ───────────────────────────────────────────────────────────

describe("shortcuts are suppressed when typing", () => {
  it("does not switch tool when an <input> is focused", () => {
    const input = document.createElement("input")
    document.body.appendChild(input)
    input.focus()

    act(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "p", bubbles: true, cancelable: true })
      )
    })

    expect(useEditorStore.getState().activeTool).toBe("select")
    document.body.removeChild(input)
  })

  it("does not switch tool when a <textarea> is focused", () => {
    const textarea = document.createElement("textarea")
    document.body.appendChild(textarea)
    textarea.focus()

    act(() => {
      textarea.dispatchEvent(
        new KeyboardEvent("keydown", { key: "r", bubbles: true, cancelable: true })
      )
    })

    expect(useEditorStore.getState().activeTool).toBe("select")
    document.body.removeChild(textarea)
  })

  it("does not switch tool when a <select> element is focused", () => {
    const select = document.createElement("select")
    document.body.appendChild(select)
    select.focus()

    act(() => {
      select.dispatchEvent(
        new KeyboardEvent("keydown", { key: "l", bubbles: true, cancelable: true })
      )
    })

    expect(useEditorStore.getState().activeTool).toBe("select")
    document.body.removeChild(select)
  })

  // Note: isContentEditable is partially implemented in jsdom — this behaviour
  // is verified in browser E2E tests. The production isTypingTarget() function
  // does check target.isContentEditable correctly in real browsers.
  it.todo("does not switch tool when a contentEditable element is focused")
})
