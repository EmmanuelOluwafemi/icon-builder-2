"use client"

import {
  Cursor01Icon,
  PenTool02Icon,
  Square01Icon,
  OvalIcon,
  LineIcon,
  ZoomInAreaIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"
import { useEditorStore, type Tool } from "@/store/editor"

const TOOLS: {
  tool: Tool
  label: string
  shortcut: string
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"]
}[] = [
  { tool: "select", label: "Select", shortcut: "V", icon: Cursor01Icon },
  { tool: "pen", label: "Pen", shortcut: "P", icon: PenTool02Icon },
  { tool: "rect", label: "Rectangle", shortcut: "R", icon: Square01Icon },
  { tool: "circle", label: "Ellipse", shortcut: "O", icon: OvalIcon },
  { tool: "line", label: "Line", shortcut: "L", icon: LineIcon },
  { tool: "zoom", label: "Zoom", shortcut: "Z", icon: ZoomInAreaIcon },
]

export function BottomToolbar() {
  const activeTool = useEditorStore((s) => s.activeTool)
  const setActiveTool = useEditorStore((s) => s.setActiveTool)

  return (
    <nav
      aria-label="Tools"
      className="flex h-12 items-center justify-center gap-1 border-t border-border bg-card px-2"
    >
      {TOOLS.map(({ tool, label, shortcut, icon }) => (
        <Tooltip key={tool}>
          <TooltipTrigger
            aria-label={label}
            aria-pressed={activeTool === tool}
            onClick={() => setActiveTool(tool)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              activeTool === tool &&
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            )}
          >
            <HugeiconsIcon icon={icon} size={16} />
          </TooltipTrigger>
          <TooltipContent side="top">
            <span>{label}</span>
            <kbd
              data-slot="kbd"
              className="ml-1.5 rounded bg-white/15 px-1.5 py-0.5 font-mono text-[10px]"
            >
              {shortcut}
            </kbd>
          </TooltipContent>
        </Tooltip>
      ))}
    </nav>
  )
}
