"use client"

import { useEffect, useRef } from "react"
import { Rect, Ellipse, Line, Path, Transformer } from "react-konva"
import type Konva from "konva"
import { useEditorStore, type CanvasElement } from "@/store/editor"

interface CanvasElementsProps {
  onSelect: (id: string) => void
  onTransformEnd: (id: string, attrs: Partial<CanvasElement>) => void
  onNodeEdit: (id: string) => void
  onSegmentClick: (id: string, canvasX: number, canvasY: number) => void
  nodeEditTarget: string | null
  interactive: boolean
}

function ShapeNode({
  el,
  isSelected,
  isNodeEditTarget,
  interactive,
  onSelect,
  onTransformEnd,
  onNodeEdit,
  onSegmentClick,
}: {
  el: CanvasElement
  isSelected: boolean
  isNodeEditTarget: boolean
  interactive: boolean
  onSelect: (id: string) => void
  onTransformEnd: (id: string, attrs: Partial<CanvasElement>) => void
  onNodeEdit: (id: string) => void
  onSegmentClick: (id: string, canvasX: number, canvasY: number) => void
}) {
  const shapeRef = useRef<Konva.Shape>(null)
  const transformerRef = useRef<Konva.Transformer>(null)

  // Keep transformer attached to the shape whenever selection changes
  useEffect(() => {
    if (!transformerRef.current) return
    if (isSelected && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current])
      transformerRef.current.getLayer()?.batchDraw()
    } else {
      transformerRef.current.nodes([])
    }
  }, [isSelected])

  const commonProps = {
    id: el.id,
    x: el.x,
    y: el.y,
    rotation: el.rotation,
    fill: el.fill,
    stroke: el.stroke,
    strokeWidth: el.strokeWidth,
    opacity: el.opacity,
    listening: interactive,
    draggable: interactive && isSelected,
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (isNodeEditTarget && el.type === "path") {
        const stage = e.target.getStage()
        const pos = stage?.getRelativePointerPosition()
        if (pos) onSegmentClick(el.id, pos.x, pos.y)
      } else {
        onSelect(el.id)
      }
    },
    onTap: () => onSelect(el.id),
    onDblClick: () => el.type === "path" ? onNodeEdit(el.id) : undefined,
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      onTransformEnd(el.id, { x: e.target.x(), y: e.target.y() })
    },
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()
      // Reset scale after baking it into dimensions
      node.scaleX(1)
      node.scaleY(1)

      if (el.type === "rect") {
        onTransformEnd(el.id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          width: Math.max(1, el.width * scaleX),
          height: Math.max(1, el.height * scaleY),
        })
      } else if (el.type === "circle") {
        onTransformEnd(el.id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          radiusX: Math.max(1, el.radiusX * scaleX),
          radiusY: Math.max(1, el.radiusY * scaleY),
        })
      } else {
        onTransformEnd(el.id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
        })
      }
    },
  }

  let shape: React.ReactNode

  if (el.type === "rect") {
    shape = <Rect ref={shapeRef as React.RefObject<Konva.Rect>} {...commonProps} width={el.width} height={el.height} />
  } else if (el.type === "circle") {
    shape = (
      <Ellipse
        ref={shapeRef as React.RefObject<Konva.Ellipse>}
        {...commonProps}
        radiusX={el.radiusX}
        radiusY={el.radiusY}
      />
    )
  } else if (el.type === "line") {
    shape = (
      <Line
        ref={shapeRef as React.RefObject<Konva.Line>}
        {...commonProps}
        points={el.points}
        stroke={el.stroke || "#000"}
        strokeWidth={el.strokeWidth || 2}
        fill={undefined}
      />
    )
  } else if (el.type === "path") {
    shape = <Path ref={shapeRef as React.RefObject<Konva.Path>} {...commonProps} data={el.d} />
  } else {
    return null
  }

  return (
    <>
      {shape}
      {isSelected && (
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(_oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) return _oldBox
            return newBox
          }}
        />
      )}
    </>
  )
}

export function CanvasElements({ onSelect, onTransformEnd, onNodeEdit, onSegmentClick, nodeEditTarget, interactive }: CanvasElementsProps) {
  const elements = useEditorStore((s) => s.elements)
  const selection = useEditorStore((s) => s.selection)

  return (
    <>
      {elements.map((el) => (
        <ShapeNode
          key={el.id}
          el={el}
          isSelected={selection.includes(el.id)}
          isNodeEditTarget={nodeEditTarget === el.id}
          interactive={interactive}
          onSelect={onSelect}
          onNodeEdit={onNodeEdit}
          onSegmentClick={onSegmentClick}
          onTransformEnd={onTransformEnd}
        />
      ))}
    </>
  )
}
