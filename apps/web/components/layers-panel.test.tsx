import { describe, it, expect, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LayersPanel } from "@/components/layers-panel"
import { useEditorStore } from "@/store/editor"
import type { CanvasElement } from "@/store/editor"

const RECT: CanvasElement = {
  id: "r1", type: "rect", frameId: null, name: "Rectangle",
  x: 0, y: 0, rotation: 0, fill: "#000", stroke: "none",
  strokeWidth: 0, opacity: 1, width: 100, height: 100,
}

const ELLIPSE: CanvasElement = {
  id: "e1", type: "circle", frameId: null, name: "Ellipse",
  x: 50, y: 50, rotation: 0, fill: "#000", stroke: "none",
  strokeWidth: 0, opacity: 1, radiusX: 40, radiusY: 40,
}

const INITIAL_STATE = {
  elements: [RECT, ELLIPSE],
  frames: [],
  activeTool: "select" as const,
  selection: [],
  viewport: { x: 0, y: 0, scale: 1 },
  history: [[RECT, ELLIPSE]],
  historyIndex: 0,
  nodeEditTarget: null,
}

beforeEach(() => {
  useEditorStore.setState(INITIAL_STATE)
})

describe("LayersPanel", () => {
  // ── Rendering ──────────────────────────────────────────────────────────────

  it("renders all element names", () => {
    render(<LayersPanel />)
    expect(screen.getByText("Rectangle")).toBeInTheDocument()
    expect(screen.getByText("Ellipse")).toBeInTheDocument()
  })

  it("shows a placeholder when there are no elements", () => {
    useEditorStore.setState({ elements: [] })
    render(<LayersPanel />)
    expect(screen.getByText(/no layers/i)).toBeInTheDocument()
  })

  it("updates reactively when an element is added", async () => {
    render(<LayersPanel />)
    const path: CanvasElement = {
      id: "p1", type: "path", frameId: null, name: "My Path",
      x: 0, y: 0, rotation: 0, fill: "none", stroke: "#000",
      strokeWidth: 2, opacity: 1, d: "M 0 0 L 10 10",
    }
    useEditorStore.setState({ elements: [RECT, ELLIPSE, path] })
    expect(await screen.findByText("My Path")).toBeInTheDocument()
  })

  // ── Selection ──────────────────────────────────────────────────────────────

  it("clicking a layer entry selects the element in the store", async () => {
    render(<LayersPanel />)
    await userEvent.click(screen.getByText("Rectangle"))
    expect(useEditorStore.getState().selection).toEqual(["r1"])
  })

  it("clicking a second layer deselects the first and selects the new one", async () => {
    render(<LayersPanel />)
    await userEvent.click(screen.getByText("Rectangle"))
    await userEvent.click(screen.getByText("Ellipse"))
    expect(useEditorStore.getState().selection).toEqual(["e1"])
  })

  it("selected element row has aria-selected=true", () => {
    useEditorStore.setState({ selection: ["r1"] })
    render(<LayersPanel />)
    const row = screen.getByRole("option", { name: /rectangle/i })
    expect(row).toHaveAttribute("aria-selected", "true")
  })

  it("unselected element rows have aria-selected=false", () => {
    useEditorStore.setState({ selection: ["r1"] })
    render(<LayersPanel />)
    const row = screen.getByRole("option", { name: /ellipse/i })
    expect(row).toHaveAttribute("aria-selected", "false")
  })

  // ── Inline rename ──────────────────────────────────────────────────────────

  it("double-clicking a name shows a text input with the current name", async () => {
    render(<LayersPanel />)
    await userEvent.dblClick(screen.getByText("Rectangle"))
    const input = screen.getByRole("textbox")
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue("Rectangle")
  })

  it("pressing Enter commits the new name to the store", async () => {
    render(<LayersPanel />)
    await userEvent.dblClick(screen.getByText("Rectangle"))
    const input = screen.getByRole("textbox")
    await userEvent.clear(input)
    await userEvent.type(input, "My Icon{Enter}")
    expect(useEditorStore.getState().elements[0]).toMatchObject({ name: "My Icon" })
  })

  it("blurring the rename input commits the new name", async () => {
    render(<LayersPanel />)
    await userEvent.dblClick(screen.getByText("Rectangle"))
    const input = screen.getByRole("textbox")
    await userEvent.clear(input)
    await userEvent.type(input, "Renamed")
    await userEvent.tab()
    expect(useEditorStore.getState().elements[0]).toMatchObject({ name: "Renamed" })
  })

  it("pressing Escape cancels rename and restores the original name", async () => {
    render(<LayersPanel />)
    await userEvent.dblClick(screen.getByText("Rectangle"))
    const input = screen.getByRole("textbox")
    await userEvent.clear(input)
    await userEvent.type(input, "Oops{Escape}")
    expect(screen.getByText("Rectangle")).toBeInTheDocument()
    expect(useEditorStore.getState().elements[0]).toMatchObject({ name: "Rectangle" })
  })

  // ── Drag-to-reorder ────────────────────────────────────────────────────────

  it("dragging a layer above another reorders elements[] in the store", () => {
    render(<LayersPanel />)
    const rows = screen.getAllByRole("option")
    // Drag Ellipse (index 1) above Rectangle (index 0)
    fireEvent.dragStart(rows[1]!)
    fireEvent.dragOver(rows[0]!)
    fireEvent.drop(rows[0]!)
    const ids = useEditorStore.getState().elements.map((e) => e.id)
    expect(ids).toEqual(["e1", "r1"])
  })
})
