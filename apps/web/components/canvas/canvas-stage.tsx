"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Stage, Layer, Rect } from "react-konva"
import Konva from "konva"
import { useEditorStore, type CanvasElement } from "@/store/editor"
import { CanvasFrames } from "@/components/canvas/canvas-frames"
import { CanvasElements } from "@/components/canvas/canvas-elements"
import { NodeEditorOverlay } from "@/components/canvas/node-editor-overlay"
import { usePenTool } from "@/components/canvas/canvas-pen"
import { normalizeRect } from "@/lib/normalize-rect"
import { normalizeCircle } from "@/lib/normalize-circle"
import { findContainingFrame } from "@/lib/find-containing-frame"
import { parsePathSegments, serializeSegments, insertAnchorAt, isPathClosed, type Segment } from "@/lib/node-editor-ops"

const MIN_SCALE = 0.1
const MAX_SCALE = 20
const ZOOM_SENSITIVITY = 1.05

/** Sample each bezier segment at N steps and return the (segIndex, t) nearest to (px, py). */
function findNearestBezierPoint(
  segments: Segment[],
  px: number,
  py: number,
  steps = 20
): { segIndex: number; t: number } {
  let bestSeg = 0
  let bestT = 0.5
  let bestDist = Infinity

  for (let i = 0; i < segments.length - 1; i++) {
    const s0 = segments[i]!
    const s1 = segments[i + 1]!
    const p0x = s0.point.x, p0y = s0.point.y
    const p1x = s0.point.x + s0.handleOut.x, p1y = s0.point.y + s0.handleOut.y
    const p2x = s1.point.x + s1.handleIn.x,  p2y = s1.point.y + s1.handleIn.y
    const p3x = s1.point.x, p3y = s1.point.y

    for (let step = 0; step <= steps; step++) {
      const t = step / steps
      const u = 1 - t
      const bx = u*u*u*p0x + 3*u*u*t*p1x + 3*u*t*t*p2x + t*t*t*p3x
      const by = u*u*u*p0y + 3*u*u*t*p1y + 3*u*t*t*p2y + t*t*t*p3y
      const d = (bx - px) ** 2 + (by - py) ** 2
      if (d < bestDist) {
        bestDist = d
        bestSeg = i
        bestT = t
      }
    }
  }

  // Clamp t away from endpoints to avoid degenerate zero-length segments
  return { segIndex: bestSeg, t: Math.max(0.05, Math.min(0.95, bestT)) }
}

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
  const setNodeEditTarget = useEditorStore((s) => s.setNodeEditTarget)
  const nodeEditTarget = useEditorStore((s) => s.nodeEditTarget)
  const elements = useEditorStore((s) => s.elements)
  const pushHistory = useEditorStore((s) => s.pushHistory)
  const frames = useEditorStore((s) => s.frames)

  const handleNodeEdit = useCallback(
    (id: string) => {
      setNodeEditTarget(id)
    },
    [setNodeEditTarget]
  )

  const handleSegmentClick = useCallback(
    (id: string, canvasX: number, canvasY: number) => {
      const el = elements.find((e) => e.id === id)
      if (!el || el.type !== "path") return
      const segs = parsePathSegments(el.d)
      const closed = isPathClosed(el.d)
      if (segs.length < 2) return

      // Find the segment index and t-parameter closest to the click point
      const { segIndex, t } = findNearestBezierPoint(segs, canvasX, canvasY)
      const newSegs = insertAnchorAt(segs, segIndex, t)
      updateElement(id, { d: serializeSegments(newSegs, closed) })
      pushHistory()
    },
    [elements, updateElement, pushHistory]
  )

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

  // ── Drawing refs (no re-renders during drag) ─────────────────────────────
  const isDrawingRef = useRef(false)
  const drawStartRef = useRef({ x: 0, y: 0 })
  const previewRectRef = useRef<Konva.Rect | null>(null)
  const previewEllipseRef = useRef<Konva.Ellipse | null>(null)
  const previewLineRef = useRef<Konva.Line | null>(null)

  // ── Pan refs (no re-renders during drag) ─────────────────────────────────
  const isPanningRef = useRef(false)
  const isSpaceRef = useRef(false)
  const lastPointerRef = useRef({ x: 0, y: 0 })

  // Panning overlay cursor — null means "use tool-based cursor"
  const [panCursor, setPanCursor] = useState<"grab" | "grabbing" | null>(null)
  const penHandlers = usePenTool({ stageRef })

  const DRAW_TOOLS = ["rect", "circle", "line", "pen"]
  const baseCursor = DRAW_TOOLS.includes(activeTool) ? "crosshair" : "default"
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

      // Pen tool — delegate entirely to usePenTool
      if (activeTool === "pen") {
        penHandlers.handleMouseDown(e)
        return
      }

      // Drawing tools: rect, circle, line
      if (activeTool === "rect" || activeTool === "circle" || activeTool === "line") {
        const stage = stageRef.current
        if (!stage) return
        const pos = stage.getRelativePointerPosition()
        if (!pos) return

        isDrawingRef.current = true
        drawStartRef.current = { x: pos.x, y: pos.y }

        const layer = stage.getLayers()[0]
        if (!layer) return

        if (activeTool === "rect") {
          const preview = new Konva.Rect({
            x: pos.x, y: pos.y, width: 0, height: 0,
            fill: "#000000", opacity: 0.5, listening: false,
          })
          layer.add(preview)
          previewRectRef.current = preview
        } else if (activeTool === "circle") {
          const preview = new Konva.Ellipse({
            x: pos.x, y: pos.y, radiusX: 0, radiusY: 0,
            fill: "#000000", opacity: 0.5, listening: false,
          })
          layer.add(preview)
          previewEllipseRef.current = preview
        } else if (activeTool === "line") {
          const preview = new Konva.Line({
            points: [pos.x, pos.y, pos.x, pos.y],
            stroke: "#000000", strokeWidth: 2, opacity: 0.5, listening: false,
          })
          layer.add(preview)
          previewLineRef.current = preview
        }
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

      // Pen tool mousemove
      if (activeTool === "pen") {
        penHandlers.handleMouseMove(e)
        return
      }

      // Shape previews — direct Konva update, NO Zustand
      if (isDrawingRef.current) {
        const stage = stageRef.current
        if (!stage) return
        const pos = stage.getRelativePointerPosition()
        if (!pos) return

        if (previewRectRef.current) {
          const { x, y, width, height } = normalizeRect(drawStartRef.current, pos)
          previewRectRef.current.setAttrs({ x, y, width, height })
          previewRectRef.current.getLayer()?.batchDraw()
        } else if (previewEllipseRef.current) {
          const { x, y, radiusX, radiusY } = normalizeCircle(drawStartRef.current, pos)
          previewEllipseRef.current.setAttrs({ x, y, radiusX, radiusY })
          previewEllipseRef.current.getLayer()?.batchDraw()
        } else if (previewLineRef.current) {
          previewLineRef.current.points([
            drawStartRef.current.x, drawStartRef.current.y,
            pos.x, pos.y,
          ])
          previewLineRef.current.getLayer()?.batchDraw()
        }
      }
    },
    []
  )

  const handleMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
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

    // Pen tool mouseup
    if (activeTool === "pen") {
      penHandlers.handleMouseUp(e)
      return
    }

    // Commit drawing to Zustand
    if (isDrawingRef.current) {
      isDrawingRef.current = false

      if (previewRectRef.current) {
        const preview = previewRectRef.current
        const x = preview.x(), y = preview.y()
        const width = preview.width(), height = preview.height()
        preview.destroy()
        previewRectRef.current = null

        if (width > 2 && height > 2) {
          const containingFrame = findContainingFrame(x + width / 2, y + height / 2, frames)
          addElement({
            id: crypto.randomUUID(), type: "rect",
            frameId: containingFrame?.id ?? null, name: "Rectangle",
            x, y, rotation: 0, fill: "#000000", stroke: "none",
            strokeWidth: 0, opacity: 1, width, height,
          })
        }
      } else if (previewEllipseRef.current) {
        const preview = previewEllipseRef.current
        const x = preview.x(), y = preview.y()
        const radiusX = preview.radiusX(), radiusY = preview.radiusY()
        preview.destroy()
        previewEllipseRef.current = null

        if (radiusX > 1 && radiusY > 1) {
          const containingFrame = findContainingFrame(x, y, frames)
          addElement({
            id: crypto.randomUUID(), type: "circle",
            frameId: containingFrame?.id ?? null, name: "Ellipse",
            x, y, rotation: 0, fill: "#000000", stroke: "none",
            strokeWidth: 0, opacity: 1, radiusX, radiusY,
          })
        }
      } else if (previewLineRef.current) {
        const preview = previewLineRef.current
        const points = preview.points()
        preview.destroy()
        previewLineRef.current = null

        const dx = (points[2] ?? 0) - (points[0] ?? 0)
        const dy = (points[3] ?? 0) - (points[1] ?? 0)
        if (Math.sqrt(dx * dx + dy * dy) > 2) {
          const mx = ((points[0] ?? 0) + (points[2] ?? 0)) / 2
          const my = ((points[1] ?? 0) + (points[3] ?? 0)) / 2
          const containingFrame = findContainingFrame(mx, my, frames)
          addElement({
            id: crypto.randomUUID(), type: "line",
            frameId: containingFrame?.id ?? null, name: "Line",
            x: 0, y: 0, rotation: 0, fill: "none", stroke: "#000000",
            strokeWidth: 2, opacity: 1, points,
          })
        }
      }
    }
  }, [activeTool, addElement, frames, penHandlers, setViewport])

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
              onNodeEdit={handleNodeEdit}
              onSegmentClick={handleSegmentClick}
              nodeEditTarget={nodeEditTarget}
              interactive={activeTool === "select"}
            />
          </Layer>
        </Stage>
      )}

      <NodeEditorOverlay stageRef={stageRef} />

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 rounded-md bg-card px-2 py-1 text-xs text-muted-foreground shadow-sm border border-border">
        {Math.round(viewport.scale * 100)}%
      </div>
    </div>
  )
}
