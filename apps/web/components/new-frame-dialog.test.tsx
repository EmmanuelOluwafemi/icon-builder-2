import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NewFrameDialog } from "@/components/new-frame-dialog"
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

describe("NewFrameDialog", () => {
  it("renders a trigger button", () => {
    render(<NewFrameDialog />)
    expect(screen.getByRole("button", { name: /new frame/i })).toBeInTheDocument()
  })

  it("shows all four size presets after opening", async () => {
    render(<NewFrameDialog />)
    await userEvent.click(screen.getByRole("button", { name: /new frame/i }))
    expect(screen.getByRole("button", { name: "16×16" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "24×24" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "32×32" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "48×48" })).toBeInTheDocument()
  })

  it("clicking a preset adds a frame with the correct dimensions", async () => {
    render(<NewFrameDialog />)
    await userEvent.click(screen.getByRole("button", { name: /new frame/i }))
    await userEvent.click(screen.getByRole("button", { name: "24×24" }))
    const frames = useEditorStore.getState().frames
    expect(frames).toHaveLength(1)
    expect(frames[0]!.width).toBe(24)
    expect(frames[0]!.height).toBe(24)
  })

  it("the 48×48 preset creates a frame with width and height of 48", async () => {
    render(<NewFrameDialog />)
    await userEvent.click(screen.getByRole("button", { name: /new frame/i }))
    await userEvent.click(screen.getByRole("button", { name: "48×48" }))
    const frame = useEditorStore.getState().frames[0]!
    expect(frame.width).toBe(48)
    expect(frame.height).toBe(48)
  })

  it("dialog closes after a preset is selected", async () => {
    render(<NewFrameDialog />)
    await userEvent.click(screen.getByRole("button", { name: /new frame/i }))
    expect(screen.getByRole("button", { name: "24×24" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "24×24" }))
    expect(screen.queryByRole("button", { name: "24×24" })).not.toBeInTheDocument()
  })

  it("frames get sequential names: Frame 1, Frame 2, …", async () => {
    render(<NewFrameDialog />)

    await userEvent.click(screen.getByRole("button", { name: /new frame/i }))
    await userEvent.click(screen.getByRole("button", { name: "16×16" }))

    await userEvent.click(screen.getByRole("button", { name: /new frame/i }))
    await userEvent.click(screen.getByRole("button", { name: "24×24" }))

    const frames = useEditorStore.getState().frames
    expect(frames[0]!.name).toBe("Frame 1")
    expect(frames[1]!.name).toBe("Frame 2")
  })

  it("each frame gets a unique id", async () => {
    render(<NewFrameDialog />)

    await userEvent.click(screen.getByRole("button", { name: /new frame/i }))
    await userEvent.click(screen.getByRole("button", { name: "16×16" }))

    await userEvent.click(screen.getByRole("button", { name: /new frame/i }))
    await userEvent.click(screen.getByRole("button", { name: "24×24" }))

    const frames = useEditorStore.getState().frames
    expect(frames[0]!.id).not.toBe(frames[1]!.id)
  })
})
