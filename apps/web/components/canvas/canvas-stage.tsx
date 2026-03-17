"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Stage, Layer, Rect } from "react-konva"
import type Konva from "konva"
import { useEditorStore } from "@/store/editor"

const MIN_SCALE = 0.1
const MAX_SCALE = 20
const ZOOM_SENSITIVITY = 1.05

export function CanvasStage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  const viewport = useEditorStore((s) => s.viewport)
  const setViewport = useEditorStore((s) => s.setViewport)
  const activeTool = useEditorStore((s) => s.activeTool)

  // Refs for pan math (no re-renders during drag)
  const isPanningRef = useRef(false)
  const isSpaceRef = useRef(false)
  const lastPointerRef = useRef({ x: 0, y: 0 })

  // State for cursor — must be state since it drives render
  const [cursor, setCursor] = useState<"default" | "grab" | "grabbing">("default")

  // Fit container size
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Space key tracking
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        if (
          document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement
        )
          return
        e.preventDefault()
        isSpaceRef.current = true
        setCursor("grab")
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpaceRef.current = false
        isPanningRef.current = false
        setCursor("default")
      }
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [])

  // ── Pan handlers ──────────────────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (isSpaceRef.current || activeTool === "zoom") {
        isPanningRef.current = true
        setCursor("grabbing")
        lastPointerRef.current = {
          x: e.evt.clientX,
          y: e.evt.clientY,
        }
      }
    },
    [activeTool]
  )

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isPanningRef.current) return
      const dx = e.evt.clientX - lastPointerRef.current.x
      const dy = e.evt.clientY - lastPointerRef.current.y
      lastPointerRef.current = { x: e.evt.clientX, y: e.evt.clientY }

      // Directly update stage — bypass Zustand during drag
      const stage = stageRef.current
      if (stage) {
        stage.x(stage.x() + dx)
        stage.y(stage.y() + dy)
        stage.batchDraw()
      }
    },
    []
  )

  const handleMouseUp = useCallback(() => {
    if (!isPanningRef.current) return
    isPanningRef.current = false
    setCursor(isSpaceRef.current ? "grab" : "default")

    // Commit final position to Zustand on mouseup only
    const stage = stageRef.current
    if (stage) {
      setViewport({ x: stage.x(), y: stage.y() })
    }
  }, [setViewport])

  // ── Zoom handler ──────────────────────────────────────────────────────────
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()
      const stage = stageRef.current
      if (!stage) return

      const oldScale = stage.scaleX()
      const pointer = stage.getPointerPosition()
      if (!pointer) return

      const direction = e.evt.deltaY < 0 ? 1 : -1
      const newScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, direction > 0 ? oldScale * ZOOM_SENSITIVITY : oldScale / ZOOM_SENSITIVITY)
      )

      // Zoom toward the cursor position
      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      }
      const newX = pointer.x - mousePointTo.x * newScale
      const newY = pointer.y - mousePointTo.y * newScale

      // Direct update during wheel — no Zustand
      stage.scale({ x: newScale, y: newScale })
      stage.position({ x: newX, y: newY })
      stage.batchDraw()

      // Commit to Zustand after zoom settles
      setViewport({ x: newX, y: newY, scale: newScale })
    },
    [setViewport]
  )

  // Zoom tool: click to zoom in, alt+click to zoom out
  const handleClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (activeTool !== "zoom") return
      const stage = stageRef.current
      if (!stage) return

      const direction = e.evt.altKey ? -1 : 1
      const oldScale = stage.scaleX()
      const pointer = stage.getPointerPosition()
      if (!pointer) return

      const newScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, direction > 0 ? oldScale * 1.3 : oldScale / 1.3)
      )
      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      }
      const newX = pointer.x - mousePointTo.x * newScale
      const newY = pointer.y - mousePointTo.y * newScale

      stage.scale({ x: newScale, y: newScale })
      stage.position({ x: newX, y: newY })
      stage.batchDraw()
      setViewport({ x: newX, y: newY, scale: newScale })
    },
    [activeTool, setViewport]
  )

  return (
    <div
      ref={containerRef}
      className="relative size-full overflow-hidden bg-muted/30"
      style={{ cursor }}
    >
      {size.width > 0 && (
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          x={viewport.x}
          y={viewport.y}
          scaleX={viewport.scale}
          scaleY={viewport.scale}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onClick={handleClick}
        >
          <Layer>
            {/* Canvas grid placeholder — elements rendered in later issues */}
            <Rect
              x={-5000}
              y={-5000}
              width={10000}
              height={10000}
              fill="transparent"
              listening={false}
            />
          </Layer>
        </Stage>
      )}

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 rounded-md bg-card px-2 py-1 text-xs text-muted-foreground shadow-sm border border-border">
        {Math.round(viewport.scale * 100)}%
      </div>
    </div>
  )
}
