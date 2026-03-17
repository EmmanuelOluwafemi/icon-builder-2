"use client"

import { CanvasStage } from "@/components/canvas/canvas-stage"
import { BottomToolbar } from "@/components/bottom-toolbar"
import { TopBar } from "@/components/top-bar"
import { PropertiesPanel } from "@/components/properties-panel"
import { LayersPanel } from "@/components/layers-panel"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"

export function EditorShell() {
  useKeyboardShortcuts()

  return (
    <div className="flex h-svh w-full flex-col overflow-hidden bg-background">
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        <aside
          aria-label="Layers"
          className="w-52 shrink-0 overflow-y-auto border-r border-border bg-card"
        >
          <LayersPanel />
        </aside>

        <main className="flex-1 overflow-hidden">
          <CanvasStage />
        </main>

        <aside
          aria-label="Properties"
          className="w-60 shrink-0 overflow-y-auto border-l border-border bg-card"
        >
          <PropertiesPanel />
        </aside>
      </div>

      <BottomToolbar />
    </div>
  )
}
