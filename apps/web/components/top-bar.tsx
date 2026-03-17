"use client"

import { UndoIcon, RedoIcon, Share01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { NewFrameDialog } from "@/components/new-frame-dialog"
import { useEditorStore, canUndo, canRedo } from "@/store/editor"

export function TopBar() {
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const undoEnabled = useEditorStore(canUndo)
  const redoEnabled = useEditorStore(canRedo)

  return (
    <header className="flex h-11 items-center justify-between border-b border-border bg-card px-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">Icon Builder</span>
        <NewFrameDialog />
      </div>

      <div className="flex items-center gap-1">
        <button
          aria-label="Undo"
          disabled={!undoEnabled}
          onClick={undo}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-40"
        >
          <HugeiconsIcon icon={UndoIcon} size={15} />
        </button>
        <button
          aria-label="Redo"
          disabled={!redoEnabled}
          onClick={redo}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-40"
        >
          <HugeiconsIcon icon={RedoIcon} size={15} />
        </button>

        <div className="mx-1 h-4 w-px bg-border" />

        <button
          aria-label="Export"
          disabled
          className="flex h-7 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          <HugeiconsIcon icon={Share01Icon} size={13} />
          Export
        </button>
      </div>
    </header>
  )
}
