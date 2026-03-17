import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PropertiesPanel } from "@/components/properties-panel"
import { useEditorStore } from "@/store/editor"
import type { CanvasElement } from "@/store/editor"

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

const RECT: CanvasElement = {
  id: "r1",
  type: "rect",
  frameId: null,
  name: "Rectangle",
  x: 10,
  y: 20,
  rotation: 0,
  fill: "#ff0000",
  stroke: "#000000",
  strokeWidth: 2,
  opacity: 0.8,
  width: 100,
  height: 50,
}

beforeEach(() => {
  useEditorStore.setState({ ...INITIAL_STATE, elements: [RECT] })
})

describe("PropertiesPanel", () => {
  // ── Empty state ─────────────────────────────────────────────────────────────

  it("shows placeholder when nothing is selected", () => {
    render(<PropertiesPanel />)
    expect(screen.getByText(/no selection/i)).toBeInTheDocument()
  })

  // ── Field rendering ──────────────────────────────────────────────────────────

  it("shows fill, stroke, strokeWidth, opacity, x, y inputs when rect is selected", () => {
    useEditorStore.setState({ selection: ["r1"] })
    render(<PropertiesPanel />)
    expect(screen.getByLabelText(/fill/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/stroke color/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/stroke width/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/opacity/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^x$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^y$/i)).toBeInTheDocument()
  })

  it("shows width and height inputs for rect elements", () => {
    useEditorStore.setState({ selection: ["r1"] })
    render(<PropertiesPanel />)
    expect(screen.getByLabelText(/^width$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^height$/i)).toBeInTheDocument()
  })

  it("does not show width/height for path elements", () => {
    const path: CanvasElement = {
      id: "p1", type: "path", frameId: null, name: "Path",
      x: 0, y: 0, rotation: 0, fill: "none", stroke: "#000", strokeWidth: 2, opacity: 1,
      d: "M 0 0 L 10 10",
    }
    useEditorStore.setState({ elements: [path], selection: ["p1"] })
    render(<PropertiesPanel />)
    expect(screen.queryByLabelText(/^width$/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^height$/i)).not.toBeInTheDocument()
  })

  it("displays current values from the selected element", () => {
    useEditorStore.setState({ selection: ["r1"] })
    render(<PropertiesPanel />)
    expect(screen.getByLabelText(/^x$/i)).toHaveValue(10)
    expect(screen.getByLabelText(/^y$/i)).toHaveValue(20)
    expect(screen.getByLabelText(/^width$/i)).toHaveValue(100)
    expect(screen.getByLabelText(/^height$/i)).toHaveValue(50)
    expect(screen.getByLabelText(/stroke width/i)).toHaveValue(2)
  })

  // ── Property mutations ───────────────────────────────────────────────────────

  it("changing x updates the element in the store on blur", async () => {
    useEditorStore.setState({ selection: ["r1"] })
    render(<PropertiesPanel />)
    const xInput = screen.getByLabelText(/^x$/i)
    await userEvent.clear(xInput)
    await userEvent.type(xInput, "99")
    await userEvent.tab() // blur
    expect(useEditorStore.getState().elements[0]).toMatchObject({ x: 99 })
  })

  it("changing fill updates the element fill in the store", async () => {
    useEditorStore.setState({ selection: ["r1"] })
    render(<PropertiesPanel />)
    const fillInput = screen.getByLabelText(/fill/i)
    await userEvent.clear(fillInput)
    await userEvent.type(fillInput, "#00ff00")
    await userEvent.tab()
    expect(useEditorStore.getState().elements[0]).toMatchObject({ fill: "#00ff00" })
  })

  it("typing 'none' into fill and blurring sets fill to none", async () => {
    useEditorStore.setState({ selection: ["r1"] })
    render(<PropertiesPanel />)
    const fillInput = screen.getByLabelText(/fill/i)
    await userEvent.clear(fillInput)
    await userEvent.type(fillInput, "none")
    await userEvent.tab()
    expect(useEditorStore.getState().elements[0]).toMatchObject({ fill: "none" })
  })

  it("clicking the ✕ button on fill sets it to none", async () => {
    useEditorStore.setState({ selection: ["r1"] })
    render(<PropertiesPanel />)
    // The ✕ button is adjacent to the fill text input — query by title
    const clearButtons = screen.getAllByTitle(/set to none/i)
    await userEvent.click(clearButtons[0]!)
    expect(useEditorStore.getState().elements[0]).toMatchObject({ fill: "none" })
  })

  it("changing stroke width updates the element in the store on blur", async () => {
    useEditorStore.setState({ selection: ["r1"] })
    render(<PropertiesPanel />)
    const swInput = screen.getByLabelText(/stroke width/i)
    await userEvent.clear(swInput)
    await userEvent.type(swInput, "5")
    await userEvent.tab()
    expect(useEditorStore.getState().elements[0]).toMatchObject({ strokeWidth: 5 })
  })

  it("each property change pushes a history entry", async () => {
    useEditorStore.setState({ selection: ["r1"] })
    const before = useEditorStore.getState().historyIndex
    render(<PropertiesPanel />)
    const xInput = screen.getByLabelText(/^x$/i)
    await userEvent.clear(xInput)
    await userEvent.type(xInput, "55")
    await userEvent.tab()
    expect(useEditorStore.getState().historyIndex).toBeGreaterThan(before)
  })
})
