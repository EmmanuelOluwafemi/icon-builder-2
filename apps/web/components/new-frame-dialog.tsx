"use client"

import { useState } from "react"
import { useEditorStore } from "@/store/editor"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { cn } from "@workspace/ui/lib/utils"

const PRESETS = [
  { label: "16×16", width: 16, height: 16 },
  { label: "24×24", width: 24, height: 24 },
  { label: "32×32", width: 32, height: 32 },
  { label: "48×48", width: 48, height: 48 },
]

export function NewFrameDialog() {
  const [open, setOpen] = useState(false)

  const addFrame = useEditorStore((s) => s.addFrame)
  const frames = useEditorStore((s) => s.frames)

  function createFrame(width: number, height: number) {
    const n = frames.length + 1
    addFrame({
      id: crypto.randomUUID(),
      name: `Frame ${n}`,
      x: 120 + frames.length * 48,
      y: 120,
      width,
      height,
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-accent"
        aria-label="New Frame"
      >
        New Frame
      </DialogTrigger>

      <DialogContent className="max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>New Frame</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map(({ label, width, height }) => (
            <button
              key={label}
              aria-label={label}
              onClick={() => createFrame(width, height)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border border-border p-3 text-xs hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
