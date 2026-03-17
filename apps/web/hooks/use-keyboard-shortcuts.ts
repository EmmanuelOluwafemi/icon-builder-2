"use client"

import { useEffect } from "react"
import { useEditorStore, type Tool } from "@/store/editor"

const TOOL_SHORTCUTS: Record<string, Tool> = {
  v: "select",
  p: "pen",
  r: "rect",
  o: "circle",
  l: "line",
  z: "zoom",
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

export function useKeyboardShortcuts() {
  const setActiveTool = useEditorStore((s) => s.setActiveTool)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const selection = useEditorStore((s) => s.selection)
  const removeElements = useEditorStore((s) => s.removeElements)
  const elements = useEditorStore((s) => s.elements)
  const addElement = useEditorStore((s) => s.addElement)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || e.repeat) return
      if (isTypingTarget(e.target)) return

      const key = e.key.toLowerCase()

      // Undo / Redo
      if ((e.metaKey || e.ctrlKey) && key === "z") {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
        return
      }

      // Duplicate
      if ((e.metaKey || e.ctrlKey) && key === "d") {
        e.preventDefault()
        if (selection.length > 0) {
          selection.forEach((id) => {
            const el = elements.find((e) => e.id === id)
            if (!el) return
            const clone: typeof el = {
              ...structuredClone(el),
              id: crypto.randomUUID(),
              x: el.x + 10,
              y: el.y + 10,
              name: `${el.name} copy`,
            }
            addElement(clone)
          })
        }
        return
      }

      // Delete selected elements
      if ((key === "delete" || key === "backspace") && selection.length > 0) {
        e.preventDefault()
        removeElements(selection)
        return
      }

      // Tool shortcuts (no modifier)
      if (!e.metaKey && !e.ctrlKey && !e.altKey && TOOL_SHORTCUTS[key]) {
        setActiveTool(TOOL_SHORTCUTS[key])
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [setActiveTool, undo, redo, selection, removeElements, elements, addElement])
}
