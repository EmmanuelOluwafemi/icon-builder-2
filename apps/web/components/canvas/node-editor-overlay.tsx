"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Konva from "konva"
import { useEditorStore } from "@/store/editor"
import {
  parsePathSegments,
  serializeSegments,
  moveAnchor,
  moveHandle,
  removeAnchor,
  insertAnchorAt,
  isPathClosed,
  type Segment,
} from "@/lib/node-editor-ops"
import { canvasToScreen } from "@/lib/viewport-transform"

const ANCHOR_SIZE = 7   // half-side of the square anchor in screen px
const HANDLE_RADIUS = 4 // radius of the circle handle in screen px

interface DragState {
  type: "anchor" | "handle-in" | "handle-out"
  index: number
  startMouseX: number
  startMouseY: number
  startValue: { x: number; y: number }
}

interface NodeEditorOverlayProps {
  stageRef: React.RefObject<Konva.Stage | null>
}

export function NodeEditorOverlay({ stageRef }: NodeEditorOverlayProps) {
  const nodeEditTarget = useEditorStore((s) => s.nodeEditTarget)
  const elements = useEditorStore((s) => s.elements)
  const viewport = useEditorStore((s) => s.viewport)
  const updateElement = useEditorStore((s) => s.updateElement)
  const pushHistory = useEditorStore((s) => s.pushHistory)
  const setNodeEditTarget = useEditorStore((s) => s.setNodeEditTarget)

  const element = nodeEditTarget ? elements.find((e) => e.id === nodeEditTarget) : null
  const pathEl = element?.type === "path" ? element : null

  // Local rendering state — allowed to change during drag (no Zustand writes until mouseup)
  const [segments, setSegments] = useState<Segment[]>([])
  const [closed, setClosed] = useState(false)
  const [selectedAnchor, setSelectedAnchor] = useState<number | null>(null)

  // Stable ref copy for use inside drag event listeners
  const segmentsRef = useRef<Segment[]>([])
  segmentsRef.current = segments

  const dragRef = useRef<DragState | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Sync segments when path element's d string changes
  useEffect(() => {
    if (!pathEl?.d) {
      setSegments([])
      setClosed(false)
      setSelectedAnchor(null)
      return
    }
    setSegments(parsePathSegments(pathEl.d))
    setClosed(isPathClosed(pathEl.d))
    setSelectedAnchor(null)
  }, [pathEl?.d])

  // ── Konva live update during drag ─────────────────────────────────────────
  const refreshKonva = useCallback(
    (newSegments: Segment[], isClosed: boolean) => {
      if (!pathEl || !stageRef.current) return
      const stage = stageRef.current
      const layer = stage.getLayers()[0]
      if (!layer) return
      const node = layer.findOne(`#${pathEl.id}`) as Konva.Path | undefined
      if (!node) return
      node.data(serializeSegments(newSegments, isClosed))
      layer.batchDraw()
    },
    [pathEl, stageRef]
  )

  // ── Global mouse handlers for drag ───────────────────────────────────────
  useEffect(() => {
    if (!pathEl) return

    const onMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current
      if (!drag) return

      const dx = (e.clientX - drag.startMouseX) / viewport.scale
      const dy = (e.clientY - drag.startMouseY) / viewport.scale

      let newSegments: Segment[]
      if (drag.type === "anchor") {
        newSegments = moveAnchor(segmentsRef.current, drag.index, dx, dy)
        // Incremental delta: update start so next event is relative to current
        drag.startMouseX = e.clientX
        drag.startMouseY = e.clientY
      } else {
        const newX = drag.startValue.x + dx
        const newY = drag.startValue.y + dy
        const handleType = drag.type === "handle-out" ? "out" : "in"
        newSegments = moveHandle(segmentsRef.current, drag.index, handleType, newX, newY)
      }

      setSegments(newSegments)
      refreshKonva(newSegments, closed)
    }

    const onMouseUp = () => {
      if (!dragRef.current || !pathEl) return
      dragRef.current = null
      // Commit final d to Zustand — only here, never during mousemove
      const newD = serializeSegments(segmentsRef.current, closed)
      updateElement(pathEl.id, { d: newD })
      pushHistory()
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [pathEl, viewport.scale, closed, refreshKonva, updateElement, pushHistory])

  // ── Keyboard handlers (Escape + Delete) ──────────────────────────────────
  useEffect(() => {
    if (!pathEl) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNodeEditTarget(null)
        return
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedAnchor !== null) {
        e.preventDefault()
        if (segments.length > 2) {
          const newSegs = removeAnchor(segments, selectedAnchor)
          setSegments(newSegs)
          setSelectedAnchor(null)
          const newD = serializeSegments(newSegs, closed)
          updateElement(pathEl.id, { d: newD })
          pushHistory()
          refreshKonva(newSegs, closed)
        }
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [pathEl, segments, selectedAnchor, closed, setNodeEditTarget, updateElement, pushHistory, refreshKonva])

  if (!pathEl || segments.length === 0) return null

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 size-full"
      style={{ pointerEvents: "none" }}
      onClick={(e) => {
        if (e.target === svgRef.current) setNodeEditTarget(null)
      }}
    >
      <g>
        {segments.map((seg, i) => {
          const anchor = canvasToScreen(seg.point, viewport)
          const hasHandleOut = seg.handleOut.x !== 0 || seg.handleOut.y !== 0
          const hasHandleIn = seg.handleIn.x !== 0 || seg.handleIn.y !== 0

          const handleOutScreen = canvasToScreen(
            { x: seg.point.x + seg.handleOut.x, y: seg.point.y + seg.handleOut.y },
            viewport
          )
          const handleInScreen = canvasToScreen(
            { x: seg.point.x + seg.handleIn.x, y: seg.point.y + seg.handleIn.y },
            viewport
          )

          const isSelected = selectedAnchor === i

          return (
            <g key={i}>
              {/* Handle arm lines — pass-through */}
              {hasHandleOut && (
                <line
                  x1={anchor.x} y1={anchor.y}
                  x2={handleOutScreen.x} y2={handleOutScreen.y}
                  stroke="#6366f1" strokeWidth={1}
                  style={{ pointerEvents: "none" }}
                />
              )}
              {hasHandleIn && (
                <line
                  x1={anchor.x} y1={anchor.y}
                  x2={handleInScreen.x} y2={handleInScreen.y}
                  stroke="#6366f1" strokeWidth={1}
                  style={{ pointerEvents: "none" }}
                />
              )}

              {/* Handle circles */}
              {hasHandleOut && (
                <circle
                  cx={handleOutScreen.x} cy={handleOutScreen.y}
                  r={HANDLE_RADIUS}
                  fill="white" stroke="#6366f1" strokeWidth={1.5}
                  style={{ pointerEvents: "all", cursor: "crosshair" }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    dragRef.current = {
                      type: "handle-out",
                      index: i,
                      startMouseX: e.clientX,
                      startMouseY: e.clientY,
                      startValue: { ...seg.handleOut },
                    }
                  }}
                />
              )}
              {hasHandleIn && (
                <circle
                  cx={handleInScreen.x} cy={handleInScreen.y}
                  r={HANDLE_RADIUS}
                  fill="white" stroke="#6366f1" strokeWidth={1.5}
                  style={{ pointerEvents: "all", cursor: "crosshair" }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    dragRef.current = {
                      type: "handle-in",
                      index: i,
                      startMouseX: e.clientX,
                      startMouseY: e.clientY,
                      startValue: { ...seg.handleIn },
                    }
                  }}
                />
              )}

              {/* Anchor square */}
              <rect
                x={anchor.x - ANCHOR_SIZE / 2}
                y={anchor.y - ANCHOR_SIZE / 2}
                width={ANCHOR_SIZE}
                height={ANCHOR_SIZE}
                fill={isSelected ? "#6366f1" : "white"}
                stroke="#6366f1"
                strokeWidth={1.5}
                style={{ pointerEvents: "all", cursor: "move" }}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  setSelectedAnchor(i)
                  dragRef.current = {
                    type: "anchor",
                    index: i,
                    startMouseX: e.clientX,
                    startMouseY: e.clientY,
                    startValue: { ...seg.point },
                  }
                }}
              />
            </g>
          )
        })}
      </g>
    </svg>
  )
}
