"use client"

import {
  Cursor01Icon,
  PenTool01Icon,
  Square01Icon,
  OvalIcon,
  LineIcon,
  ZoomInAreaIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@workspace/ui/lib/utils"
import { useEditorStore, type Tool } from "@/store/editor"

const TOOLS: { tool: Tool; label: string; icon: React.ComponentProps<typeof HugeiconsIcon>["icon"] }[] = [
  { tool: "select", label: "Select", icon: Cursor01Icon },
  { tool: "pen", label: "Pen", icon: PenTool01Icon },
  { tool: "rect", label: "Rect", icon: Square01Icon },
  { tool: "circle", label: "Circle", icon: OvalIcon },
  { tool: "line", label: "Line", icon: LineIcon },
  { tool: "zoom", label: "Zoom", icon: ZoomInAreaIcon },
]

export function BottomToolbar() {
  const activeTool = useEditorStore((s) => s.activeTool)
  const setActiveTool = useEditorStore((s) => s.setActiveTool)

  return (
    <nav
      aria-label="Tools"
      className="flex h-12 items-center justify-center gap-1 border-t border-border bg-card px-2"
    >
      {TOOLS.map(({ tool, label, icon }) => (
        <button
          key={tool}
          aria-label={label}
          aria-pressed={activeTool === tool}
          onClick={() => setActiveTool(tool)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
            activeTool === tool && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
          )}
        >
          <HugeiconsIcon icon={icon} size={16} />
        </button>
      ))}
    </nav>
  )
}
