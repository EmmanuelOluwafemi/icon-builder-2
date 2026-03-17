import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { TopBar } from "@/components/top-bar"
import { useEditorStore } from "@/store/editor"
import type { RectElement } from "@/store/editor"

const RECT: RectElement = {
  id: "r1", type: "rect", frameId: null, name: "Rectangle",
  x: 0, y: 0, rotation: 0, fill: "#000", stroke: "none",
  strokeWidth: 0, opacity: 1, width: 100, height: 100,
}

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

beforeEach(() => {
  useEditorStore.setState(INITIAL_STATE)
})

describe("TopBar", () => {
  it("renders the project name", () => {
    render(<TopBar />)
    expect(screen.getByText(/icon builder/i)).toBeInTheDocument()
  })

  it("renders an Undo button", () => {
    render(<TopBar />)
    expect(screen.getByRole("button", { name: /undo/i })).toBeInTheDocument()
  })

  it("renders a Redo button", () => {
    render(<TopBar />)
    expect(screen.getByRole("button", { name: /redo/i })).toBeInTheDocument()
  })

  it("renders an Export button", () => {
    render(<TopBar />)
    expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument()
  })

  it("has a New Frame trigger button", () => {
    render(<TopBar />)
    expect(screen.getByRole("button", { name: /new frame/i })).toBeInTheDocument()
  })

  // ── Undo button state ────────────────────────────────────────────────────

  it("Undo button is disabled at the start of history", () => {
    render(<TopBar />)
    expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled()
  })

  it("Undo button is enabled after a committed action", () => {
    useEditorStore.getState().addElement(RECT)
    render(<TopBar />)
    expect(screen.getByRole("button", { name: /undo/i })).toBeEnabled()
  })

  it("clicking Undo restores the previous elements", async () => {
    useEditorStore.getState().addElement(RECT)
    render(<TopBar />)
    await userEvent.click(screen.getByRole("button", { name: /undo/i }))
    expect(useEditorStore.getState().elements).toHaveLength(0)
  })

  // ── Redo button state ────────────────────────────────────────────────────

  it("Redo button is disabled when at the latest history entry", () => {
    render(<TopBar />)
    expect(screen.getByRole("button", { name: /redo/i })).toBeDisabled()
  })

  it("Redo button is enabled after an undo", () => {
    useEditorStore.getState().addElement(RECT)
    useEditorStore.getState().undo()
    render(<TopBar />)
    expect(screen.getByRole("button", { name: /redo/i })).toBeEnabled()
  })

  it("clicking Redo re-applies the undone action", async () => {
    useEditorStore.getState().addElement(RECT)
    useEditorStore.getState().undo()
    render(<TopBar />)
    await userEvent.click(screen.getByRole("button", { name: /redo/i }))
    expect(useEditorStore.getState().elements).toHaveLength(1)
  })

  it("Redo button becomes disabled again after redoing to latest", async () => {
    useEditorStore.getState().addElement(RECT)
    useEditorStore.getState().undo()
    render(<TopBar />)
    await userEvent.click(screen.getByRole("button", { name: /redo/i }))
    expect(screen.getByRole("button", { name: /redo/i })).toBeDisabled()
  })
})
