import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BottomToolbar } from "@/components/bottom-toolbar"
import { useEditorStore } from "@/store/editor"

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

describe("BottomToolbar", () => {
  it("renders all six tool buttons", () => {
    render(<BottomToolbar />)
    expect(screen.getByRole("button", { name: /select/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /pen/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /rectangle/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /ellipse/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /line/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /zoom/i })).toBeInTheDocument()
  })

  it("clicking a tool button sets activeTool in the store", async () => {
    render(<BottomToolbar />)
    await userEvent.click(screen.getByRole("button", { name: /pen/i }))
    expect(useEditorStore.getState().activeTool).toBe("pen")
  })

  it("clicking each tool button selects the correct tool", async () => {
    render(<BottomToolbar />)
    const cases: [RegExp, string][] = [
      [/rectangle/i, "rect"],
      [/ellipse/i, "circle"],
      [/line/i, "line"],
      [/zoom/i, "zoom"],
      [/select/i, "select"],
    ]
    for (const [label, expected] of cases) {
      await userEvent.click(screen.getByRole("button", { name: label }))
      expect(useEditorStore.getState().activeTool).toBe(expected)
    }
  })

  it("active tool button has aria-pressed=true", () => {
    useEditorStore.setState({ activeTool: "pen" })
    render(<BottomToolbar />)
    expect(screen.getByRole("button", { name: /pen/i })).toHaveAttribute("aria-pressed", "true")
  })

  it("inactive tool buttons have aria-pressed=false", () => {
    useEditorStore.setState({ activeTool: "pen" })
    render(<BottomToolbar />)
    const inactiveButtons = ["select", "rectangle", "ellipse", "line", "zoom"]
    inactiveButtons.forEach((name) => {
      expect(screen.getByRole("button", { name: new RegExp(name, "i") })).toHaveAttribute(
        "aria-pressed",
        "false"
      )
    })
  })

  it("aria-pressed updates when the store activeTool changes", async () => {
    render(<BottomToolbar />)
    expect(screen.getByRole("button", { name: /select/i })).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(screen.getByRole("button", { name: /rectangle/i }))
    expect(screen.getByRole("button", { name: /select/i })).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByRole("button", { name: /rectangle/i })).toHaveAttribute("aria-pressed", "true")
  })
})
