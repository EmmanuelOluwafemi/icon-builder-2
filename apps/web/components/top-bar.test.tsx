import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { TopBar } from "@/components/top-bar"

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
})
