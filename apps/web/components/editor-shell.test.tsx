import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { vi } from "vitest"

// Konva doesn't render in jsdom — mock the canvas component
vi.mock("@/components/canvas/canvas-stage", () => ({
  CanvasStage: () => <div data-testid="canvas-stage" />,
}))

vi.mock("@/hooks/use-keyboard-shortcuts", () => ({
  useKeyboardShortcuts: () => {},
}))

import { EditorShell } from "@/components/editor-shell"

describe("EditorShell layout", () => {
  it("renders the top bar region", () => {
    render(<EditorShell />)
    expect(screen.getByRole("banner")).toBeInTheDocument()
  })

  it("renders the bottom toolbar region", () => {
    render(<EditorShell />)
    expect(screen.getByRole("navigation", { name: /tools/i })).toBeInTheDocument()
  })

  it("renders the canvas area", () => {
    render(<EditorShell />)
    expect(screen.getByTestId("canvas-stage")).toBeInTheDocument()
  })

  it("renders the left sidebar region", () => {
    render(<EditorShell />)
    expect(screen.getByRole("complementary", { name: /layers/i })).toBeInTheDocument()
  })

  it("renders the right properties panel region", () => {
    render(<EditorShell />)
    expect(screen.getByRole("complementary", { name: /properties/i })).toBeInTheDocument()
  })
})
