"use client"

import { CanvasStage } from "@/components/canvas/canvas-stage"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"

export function EditorShell() {
  useKeyboardShortcuts()

  return (
    <div className="flex h-svh w-full flex-col overflow-hidden bg-background">
      {/* Canvas fills the full viewport for now — shell panels added in issue #3 */}
      <main className="flex-1 overflow-hidden">
        <CanvasStage />
      </main>
    </div>
  )
}
