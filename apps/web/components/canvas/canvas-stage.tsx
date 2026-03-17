"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Stage, Layer, Rect } from "react-konva"
import Konva from "konva"
import { useEditorStore, type CanvasElement } from "@/store/editor"
import { CanvasFrames } from "@/components/canvas/canvas-frames"
import { CanvasElements } from "@/components/canvas/canvas-elements"
import { normalizeRect } from "@/lib/normalize-rect"
import { findContainingFrame } from "@/lib/find-containing-frame"

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
  const updateFrame = useEditorStore((s) => s.updateFrame)
  const addElement = useEditorStore((s) => s.addElement)
  const updateElement = useEditorStore((s) => s.updateElement)
  const setSelection = useEditorStore((s) => s.setSelection)
  const frames = useEditorStore((s) => s.frames)

  const handleFrameDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      updateFrame(id, { x, y })
    },
    [updateFrame]
  )

  const handleElementSelect = useCallback(
    (id: string) => {
      setSelection([id])
    },
    [setSelection]
  )

  const handleTransformEnd = useCallback(
    (id: string, attrs: Partial<CanvasElement>) => {
      updateElement(id, attrs)
    },
    [updateElement]
  )

  // ── Rect drawing refs (no re-renders during drag) ─────────────────────────
  const isDrawingRef = useRef(false)
  const drawStartRef = useRef({ x: 0, y: 0 })
  const previewRectRef = useRef<Konva.Rect | null>(null)

  // ── Pan refs (no re-renders during drag) ─────────────────────────────────
  const isPanningRef = useRef(false)
  const isSpaceRef = useRef(false)
  const lastPointerRef = useRef({ x: 0, y: 0 })

  // Panning overlay cursor — null means "use tool-based cursor"
  const [panCursor, setPanCursor] = useState<"grab" | "grabbing" | null>(null)
  const baseCursor = activeTool === "rect" ? "crosshair" : "default"
  const cursor = panCursor ?? baseCursor

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
        setPanCursor("grab")
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpaceRef.current = false
        isPanningRef.current = false
        setPanCursor(null)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [activeTool])

  // ── Mouse handlers ────────────────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Pan: space + drag, or zoom tool
      if (isSpaceRef.current || activeTool === "zoom") {
        isPanningRef.current = true
        setPanCursor("grabbing")
        lastPointerRef.current = { x: e.evt.clientX, y: e.evt.clientY }
        return
      }

      // Rect tool: start drawing
      if (activeTool === "rect") {
        const stage = stageRef.current
        if (!stage) return
        const pos = stage.getRelativePointerPosition()
        if (!pos) return

        isDrawingRef.current = true
        drawStartRef.current = { x: pos.x, y: pos.y }

        // Spawn a preview rect directly on the layer — bypasses Zustand
        const layer = stage.getLayers()[0]
        if (!layer) return
        const preview = new Konva.Rect({
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0,
          fill: "#000000",
          opacity: 0.5,
          listening: false,
        })
        layer.add(preview)
        previewRectRef.current = preview
        return
      }
    },
    [activeTool]
  )

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Pan move
      if (isPanningRef.current) {
        const dx = e.evt.clientX - lastPointerRef.current.x
        const dy = e.evt.clientY - lastPointerRef.current.y
        lastPointerRef.current = { x: e.evt.clientX, y: e.evt.clientY }

        const stage = stageRef.current
        if (stage) {
          stage.x(stage.x() + dx)
          stage.y(stage.y() + dy)
          stage.batchDraw()
        }
        return
      }

      // Rect preview — direct Konva update, NO Zustand
      if (isDrawingRef.current && previewRectRef.current) {
        const stage = stageRef.current
        if (!stage) return
        const pos = stage.getRelativePointerPosition()
        if (!pos) return

        const { x, y, width, height } = normalizeRect(drawStartRef.current, pos)
        previewRectRef.current.setAttrs({ x, y, width, height })
        previewRectRef.current.getLayer()?.batchDraw()
      }
    },
    []
  )

  const handleMouseUp = useCallback(() => {
    // Commit pan to Zustand
    if (isPanningRef.current) {
      isPanningRef.current = false
      setPanCursor(isSpaceRef.current ? "grab" : null)

      const stage = stageRef.current
      if (stage) {
        setViewport({ x: stage.x(), y: stage.y() })
      }
      return
    }

    // Commit rect to Zustand
    if (isDrawingRef.current && previewRectRef.current) {
      isDrawingRef.current = false
      const preview = previewRectRef.current
      const { x, y, width, height } = {
        x: preview.x(),
        y: preview.y(),
        width: preview.width(),
        height: preview.height(),
      }
      preview.destroy()
      previewRectRef.current = null

      // Only commit if it has a meaningful size
      if (width > 2 && height > 2) {
        // Assign to a frame if the rect's center falls inside one
        const cx = x + width / 2
        const cy = y + height / 2
        const containingFrame = findContainingFrame(cx, cy, frames)
        addElement({
          id: crypto.randomUUID(),
          type: "rect",
          frameId: containingFrame?.id ?? null,
          name: "Rectangle",
          x,
          y,
          rotation: 0,
          fill: "#000000",
          stroke: "none",
          strokeWidth: 0,
          opacity: 1,
          width,
          height,
        })
      }
    }
  }, [addElement, frames, setViewport])

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
    [setViewport]
  )

  // Zoom tool: click to zoom in, alt+click to zoom out
  const handleClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (activeTool === "zoom") {
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
        return
      }

      // Select tool: click on empty canvas → clear selection
      if (activeTool === "select" && e.target === stageRef.current) {
        setSelection([])
      }
    },
    [activeTool, setSelection, setViewport]
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
            {/* Hit area for empty-canvas click detection */}
            <Rect
              x={-5000}
              y={-5000}
              width={10000}
              height={10000}
              fill="transparent"
              listening={false}
            />
            <CanvasFrames
              onFrameDragEnd={handleFrameDragEnd}
              interactive={activeTool === "select"}
            />
            <CanvasElements
              onSelect={handleElementSelect}
              onTransformEnd={handleTransformEnd}
              interactive={activeTool === "select"}
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
