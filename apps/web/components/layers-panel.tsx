"use client"

import { useState } from "react"
import { useEditorStore, type CanvasElement } from "@/store/editor"

// Module-level drag state — shared between dragstart and drop handlers
let dragSourceId: string | null = null

const TYPE_LABEL: Record<CanvasElement["type"], string> = {
  rect: "rect",
  circle: "circle",
  line: "line",
  path: "path",
}

export function LayersPanel() {
  const elements = useEditorStore((s) => s.elements)
  const selection = useEditorStore((s) => s.selection)
  const setSelection = useEditorStore((s) => s.setSelection)
  const updateElement = useEditorStore((s) => s.updateElement)
  const reorderElement = useEditorStore((s) => s.reorderElement)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")

  const startRename = (el: CanvasElement) => {
    setEditingId(el.id)
    setEditingName(el.name)
  }

  const commitRename = (id: string) => {
    const name = editingName.trim()
    if (name) updateElement(id, { name })
    setEditingId(null)
  }

  const cancelRename = () => {
    setEditingId(null)
  }

  if (elements.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
        No layers
      </div>
    )
  }

  return (
    <ul role="listbox" aria-label="Layers" className="flex flex-col py-1">
      {elements.map((el, index) => {
        const isSelected = selection.includes(el.id)
        const isEditing = editingId === el.id

        return (
          <li
            key={el.id}
            role="option"
            aria-selected={isSelected}
            draggable
            className={[
              "flex cursor-pointer select-none items-center gap-2 px-3 py-1.5 text-sm",
              isSelected
                ? "bg-primary/10 text-foreground"
                : "hover:bg-accent text-foreground",
            ].join(" ")}
            onClick={() => setSelection([el.id])}
            onDragStart={() => { dragSourceId = el.id }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (!dragSourceId || dragSourceId === el.id) return
              reorderElement(dragSourceId, index)
              dragSourceId = null
            }}
          >
            <span className="w-10 shrink-0 text-xs text-muted-foreground">
              {TYPE_LABEL[el.type]}
            </span>

            {isEditing ? (
              <input
                autoFocus
                className="h-5 flex-1 rounded-sm border border-primary bg-background px-1 text-xs outline-none"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => commitRename(el.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename(el.id)
                  if (e.key === "Escape") cancelRename()
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="flex-1 truncate text-xs"
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  startRename(el)
                }}
              >
                {el.name}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
