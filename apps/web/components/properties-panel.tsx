"use client"

import { useState, useEffect } from "react"
import { useEditorStore, type CanvasElement } from "@/store/editor"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

export function PropertiesPanel() {
  const selection = useEditorStore((s) => s.selection)
  const elements = useEditorStore((s) => s.elements)

  const selectedId = selection[0]
  const el = selectedId ? elements.find((e) => e.id === selectedId) ?? null : null

  if (!el) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
        No selection
      </div>
    )
  }

  return <PropertyFields el={el} />
}

// ── Property field form ───────────────────────────────────────────────────────

function PropertyFields({ el }: { el: CanvasElement }) {
  const updateElement = useEditorStore((s) => s.updateElement)
  const pushHistory = useEditorStore((s) => s.pushHistory)

  const commit = (patch: Partial<CanvasElement>) => {
    updateElement(el.id, patch)
    pushHistory()
  }

  return (
    <div className="flex flex-col gap-3 p-3 text-sm">
      <Section label="Fill & Stroke">
        <ColorRow id="fill" label="Fill" value={el.fill} onChange={(v) => commit({ fill: v })} />
        <ColorRow id="stroke-color" label="Stroke Color" value={el.stroke} onChange={(v) => commit({ stroke: v })} />
        <NumberRow
          id="stroke-width"
          label="Stroke Width"
          value={el.strokeWidth}
          min={0}
          onCommit={(v) => commit({ strokeWidth: v })}
        />
        <NumberRow
          id="opacity"
          label="Opacity"
          value={el.opacity}
          min={0}
          max={1}
          step={0.01}
          onCommit={(v) => commit({ opacity: v })}
        />
      </Section>

      <Section label="Position">
        <NumberRow id="x" label="X" value={el.x} onCommit={(v) => commit({ x: v })} />
        <NumberRow id="y" label="Y" value={el.y} onCommit={(v) => commit({ y: v })} />
      </Section>

      {el.type === "rect" && (
        <Section label="Dimensions">
          <NumberRow id="width" label="Width" value={el.width} min={1} onCommit={(v) => commit({ width: v })} />
          <NumberRow id="height" label="Height" value={el.height} min={1} onCommit={(v) => commit({ height: v })} />
        </Section>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

function ColorRow({
  id,
  label,
  value: externalValue,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const [localValue, setLocalValue] = useState(externalValue)

  useEffect(() => {
    setLocalValue(externalValue)
  }, [externalValue])

  const commit = (v: string) => {
    setLocalValue(v)
    onChange(v)
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className="w-24 shrink-0 text-xs">
        {label}
      </Label>
      <input
        id={id}
        type="text"
        value={localValue}
        className="h-7 w-full min-w-0 rounded-sm border border-border bg-background px-2 text-xs font-mono"
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
      />
      <button
        type="button"
        className="h-7 shrink-0 rounded-sm border border-border bg-background px-1.5 text-[10px] text-muted-foreground hover:bg-accent"
        tabIndex={-1}
        title="Set to none / transparent"
        onClick={() => commit("none")}
      >
        ✕
      </button>
      <input
        type="color"
        value={localValue.startsWith("#") ? localValue : "#000000"}
        className="h-7 w-7 shrink-0 cursor-pointer rounded-sm border border-border bg-background p-0.5"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => commit(e.target.value)}
      />
    </div>
  )
}

function NumberRow({
  id,
  label,
  value: externalValue,
  min,
  max,
  step = 1,
  onCommit,
}: {
  id: string
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onCommit: (v: number) => void
}) {
  const [localValue, setLocalValue] = useState(String(externalValue))

  // Keep local value in sync when the element changes externally
  useEffect(() => {
    setLocalValue(String(externalValue))
  }, [externalValue])

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className="w-24 shrink-0 text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        value={localValue}
        min={min}
        max={max}
        step={step}
        className="h-7 text-xs"
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => {
          const n = parseFloat(localValue)
          if (!isNaN(n)) onCommit(n)
        }}
      />
    </div>
  )
}
