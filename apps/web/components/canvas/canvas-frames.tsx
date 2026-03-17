"use client"

import { Group, Rect, Text } from "react-konva"
import type Konva from "konva"
import { useEditorStore } from "@/store/editor"

interface CanvasFramesProps {
  onFrameDragEnd: (id: string, x: number, y: number) => void
}

export function CanvasFrames({ onFrameDragEnd }: CanvasFramesProps) {
  const frames = useEditorStore((s) => s.frames)

  return (
    <>
      {frames.map((frame) => (
        <Group
          key={frame.id}
          x={frame.x}
          y={frame.y}
          draggable
          onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
            onFrameDragEnd(frame.id, e.target.x(), e.target.y())
          }}
        >
          {/* Frame boundary — no fill, thin stroke; listening enables drag hit area */}
          <Rect
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
            fill="transparent"
            stroke="#6366f1"
            strokeWidth={1}
          />
          {/* Name label below the frame */}
          <Text
            x={0}
            y={frame.height + 4}
            text={frame.name}
            fontSize={11}
            fill="#6366f1"
            listening={false}
          />
        </Group>
      ))}
    </>
  )
}
