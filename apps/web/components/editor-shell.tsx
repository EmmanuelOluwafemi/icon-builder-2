"use client"

import { CanvasStage } from "@/components/canvas/canvas-stage"
import { BottomToolbar } from "@/components/bottom-toolbar"
import { TopBar } from "@/components/top-bar"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"

export function EditorShell() {
  useKeyboardShortcuts()

  return (
    <div className="flex h-svh w-full flex-col overflow-hidden bg-background">
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — layers panel (populated in a later issue) */}
        <aside
          aria-label="Layers"
          className="w-52 shrink-0 border-r border-border bg-card"
        />

        <main className="flex-1 overflow-hidden">
          <CanvasStage />
        </main>

        {/* Right panel — properties (populated in a later issue) */}
        <aside
          aria-label="Properties"
          className="w-60 shrink-0 border-l border-border bg-card"
        />
      </div>

      <BottomToolbar />
    </div>
  )
}
