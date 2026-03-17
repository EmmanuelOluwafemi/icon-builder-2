"use client"

import { useCallback, useEffect, useRef } from "react"
import Konva from "konva"
import type KonvaType from "konva"
import { useEditorStore } from "@/store/editor"
import { PenPathBuilder } from "@/lib/pen-path-builder"
import { findContainingFrame } from "@/lib/find-containing-frame"

// How close the cursor must be to the first anchor to trigger path close (canvas px)
const CLOSE_HIT_RADIUS = 8

interface UsePenToolProps {
  stageRef: React.RefObject<KonvaType.Stage | null>
}

export function usePenTool({ stageRef }: UsePenToolProps) {
  const activeTool = useEditorStore((s) => s.activeTool)
  const addElement = useEditorStore((s) => s.addElement)
  const frames = useEditorStore((s) => s.frames)

  // ── In-progress state (all refs — no Zustand writes during drawing) ───────
  const builderRef = useRef(new PenPathBuilder())
  const lastAnchorRef = useRef<{ x: number; y: number } | null>(null)
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null)
  const isDraggingRef = useRef(false)

  // Konva nodes for live preview — created imperatively, never via React
  const livePathNodeRef = useRef<KonvaType.Path | null>(null)
  const previewLineNodeRef = useRef<KonvaType.Line | null>(null)
  const firstDotNodeRef = useRef<KonvaType.Circle | null>(null)

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getLayer = useCallback((): KonvaType.Layer | null => {
    return stageRef.current?.getLayers()[0] ?? null
  }, [stageRef])

  const resetDraw = useCallback(() => {
    builderRef.current = new PenPathBuilder()
    lastAnchorRef.current = null
    mouseDownPosRef.current = null
    isDraggingRef.current = false
    livePathNodeRef.current?.destroy()
    livePathNodeRef.current = null
    previewLineNodeRef.current?.destroy()
    previewLineNodeRef.current = null
    firstDotNodeRef.current?.destroy()
    firstDotNodeRef.current = null
    getLayer()?.batchDraw()
  }, [getLayer])

  const refreshLivePath = useCallback(() => {
    const builder = builderRef.current
    if (builder.isEmpty) return
    const d = builder.serialize()
    if (livePathNodeRef.current) {
      livePathNodeRef.current.data(d)
    } else {
      const node = new Konva.Path({
        data: d,
        stroke: "#000000",
        strokeWidth: 2,
        fill: "none",
        listening: false,
      })
      getLayer()?.add(node)
      livePathNodeRef.current = node
    }
    getLayer()?.batchDraw()
  }, [getLayer])

  const commitPath = useCallback(
    (d: string) => {
      if (!d) return
      const fp = builderRef.current.firstPoint
      const frame = fp ? findContainingFrame(fp.x, fp.y, frames) : undefined
      addElement({
        id: crypto.randomUUID(),
        type: "path",
        frameId: frame?.id ?? null,
        name: "Path",
        x: 0,
        y: 0,
        rotation: 0,
        fill: "none",
        stroke: "#000000",
        strokeWidth: 2,
        opacity: 1,
        d,
      })
      resetDraw()
    },
    [addElement, frames, resetDraw]
  )

  // Reset when switching away from pen tool
  useEffect(() => {
    if (activeTool !== "pen") resetDraw()
  }, [activeTool, resetDraw])

  // ── Mouse handlers ────────────────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: KonvaType.KonvaEventObject<MouseEvent>) => {
      if (activeTool !== "pen") return
      const stage = stageRef.current
      if (!stage) return
      const pos = stage.getRelativePointerPosition()
      if (!pos) return

      // Double-click → commit open path
      if (e.evt.detail === 2) {
        const builder = builderRef.current
        if (builder.segmentCount >= 2) commitPath(builder.serialize())
        else resetDraw()
        return
      }

      // Click on first anchor → close path
      const fp = builderRef.current.firstPoint
      if (fp && builderRef.current.segmentCount >= 2) {
        const scale = stage.scaleX()
        const dx = (pos.x - fp.x) * scale
        const dy = (pos.y - fp.y) * scale
        if (Math.sqrt(dx * dx + dy * dy) <= CLOSE_HIT_RADIUS) {
          commitPath(builderRef.current.serializeClosed())
          return
        }
      }

      mouseDownPosRef.current = { x: pos.x, y: pos.y }
      isDraggingRef.current = false
    },
    [activeTool, commitPath, resetDraw, stageRef]
  )

  const handleMouseMove = useCallback(
    (e: KonvaType.KonvaEventObject<MouseEvent>) => {
      if (activeTool !== "pen") return
      const stage = stageRef.current
      if (!stage) return
      const pos = stage.getRelativePointerPosition()
      if (!pos) return

      // Detect drag for smooth anchor
      if (mouseDownPosRef.current && e.evt.buttons === 1) {
        const dx = pos.x - mouseDownPosRef.current.x
        const dy = pos.y - mouseDownPosRef.current.y
        if (Math.sqrt(dx * dx + dy * dy) > 3) isDraggingRef.current = true
      }

      // Update preview cursor line from last placed anchor to current pointer
      const last = lastAnchorRef.current
      if (!last) return
      if (previewLineNodeRef.current) {
        previewLineNodeRef.current.points([last.x, last.y, pos.x, pos.y])
        getLayer()?.batchDraw()
      }
    },
    [activeTool, getLayer, stageRef]
  )

  const handleMouseUp = useCallback(
    (e: KonvaType.KonvaEventObject<MouseEvent>) => {
      if (activeTool !== "pen") return
      // Double-click second mouseup — already handled in mousedown
      if (e.evt.detail === 2) return

      const stage = stageRef.current
      if (!stage) return
      const pos = stage.getRelativePointerPosition()
      if (!pos) return
      const downPos = mouseDownPosRef.current
      if (!downPos) return

      // If this mouseup is a close-click, mousedown already committed — skip
      const fp = builderRef.current.firstPoint
      if (fp && builderRef.current.segmentCount >= 2) {
        const scale = stage.scaleX()
        const dx = (downPos.x - fp.x) * scale
        const dy = (downPos.y - fp.y) * scale
        if (Math.sqrt(dx * dx + dy * dy) <= CLOSE_HIT_RADIUS) {
          mouseDownPosRef.current = null
          return
        }
      }

      // Place anchor at the mousedown position
      const handleOut = isDraggingRef.current
        ? { x: pos.x - downPos.x, y: pos.y - downPos.y }
        : undefined

      builderRef.current.addAnchor(downPos, handleOut)
      lastAnchorRef.current = downPos

      const layer = getLayer()
      if (layer) {
        if (builderRef.current.segmentCount === 1) {
          // First anchor: create preview line + close-target dot
          const line = new Konva.Line({
            // Initialize end at current cursor so preview is visible immediately
            points: [downPos.x, downPos.y, pos.x, pos.y],
            stroke: "#6366f1",
            strokeWidth: 1 / stage.scaleX(),
            dash: [4 / stage.scaleX(), 4 / stage.scaleX()],
            listening: false,
          })
          layer.add(line)
          previewLineNodeRef.current = line

          const dot = new Konva.Circle({
            x: downPos.x,
            y: downPos.y,
            radius: CLOSE_HIT_RADIUS / stage.scaleX(),
            stroke: "#6366f1",
            strokeWidth: 1 / stage.scaleX(),
            fill: "transparent",
            listening: false,
          })
          layer.add(dot)
          firstDotNodeRef.current = dot
        } else if (previewLineNodeRef.current) {
          // Subsequent anchors: update preview line start to new anchor immediately
          previewLineNodeRef.current.points([downPos.x, downPos.y, pos.x, pos.y])
        }
      }

      refreshLivePath()
      mouseDownPosRef.current = null
      isDraggingRef.current = false
    },
    [activeTool, getLayer, refreshLivePath, stageRef]
  )

  return { handleMouseDown, handleMouseMove, handleMouseUp }
}
