export interface Segment {
  point: { x: number; y: number }
  handleIn: { x: number; y: number }   // relative to point
  handleOut: { x: number; y: number }  // relative to point
}

/** Translate anchor at `index` by (dx, dy). Handle vectors are preserved. */
export function moveAnchor(segments: Segment[], index: number, dx: number, dy: number): Segment[] {
  return segments.map((s, i) =>
    i !== index
      ? s
      : { ...s, point: { x: s.point.x + dx, y: s.point.y + dy } }
  )
}

/** Set the relative handle vector for a single anchor. */
export function moveHandle(
  segments: Segment[],
  index: number,
  handleType: "in" | "out",
  newX: number,
  newY: number
): Segment[] {
  return segments.map((s, i) => {
    if (i !== index) return s
    if (handleType === "out") return { ...s, handleOut: { x: newX, y: newY } }
    return { ...s, handleIn: { x: newX, y: newY } }
  })
}

/** Remove the segment at `index`. */
export function removeAnchor(segments: Segment[], index: number): Segment[] {
  return segments.filter((_, i) => i !== index)
}

// ── Bezier utilities ──────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

/**
 * Split the cubic bezier between segments[segIndex] and segments[segIndex+1]
 * at parameter `t` (0–1) using De Casteljau's algorithm.
 * Returns a new segments array with one extra anchor inserted.
 */
export function insertAnchorAt(segments: Segment[], segIndex: number, t: number): Segment[] {
  const s0 = segments[segIndex]!
  const s1 = segments[segIndex + 1]!

  // Absolute control points
  const p0x = s0.point.x, p0y = s0.point.y
  const p1x = s0.point.x + s0.handleOut.x, p1y = s0.point.y + s0.handleOut.y
  const p2x = s1.point.x + s1.handleIn.x,  p2y = s1.point.y + s1.handleIn.y
  const p3x = s1.point.x, p3y = s1.point.y

  // De Casteljau level 1
  const q0x = lerp(p0x, p1x, t), q0y = lerp(p0y, p1y, t)
  const q1x = lerp(p1x, p2x, t), q1y = lerp(p1y, p2y, t)
  const q2x = lerp(p2x, p3x, t), q2y = lerp(p2y, p3y, t)

  // Level 2
  const r0x = lerp(q0x, q1x, t), r0y = lerp(q0y, q1y, t)
  const r1x = lerp(q1x, q2x, t), r1y = lerp(q1y, q2y, t)

  // New anchor (level 3)
  const sx = lerp(r0x, r1x, t), sy = lerp(r0y, r1y, t)

  const newLeft: Segment = {
    ...s0,
    handleOut: { x: q0x - p0x, y: q0y - p0y },
  }
  const newAnchor: Segment = {
    point: { x: sx, y: sy },
    handleIn: { x: r0x - sx, y: r0y - sy },
    handleOut: { x: r1x - sx, y: r1y - sy },
  }
  const newRight: Segment = {
    ...s1,
    handleIn: { x: q2x - p3x, y: q2y - p3y },
  }

  const result = [...segments]
  result.splice(segIndex, 2, newLeft, newAnchor, newRight)
  return result
}

/** Returns true if the SVG path string ends with a Z/z close command. */
export function isPathClosed(d: string): boolean {
  return /[zZ]\s*$/.test(d.trimEnd())
}

// ── SVG path parsing / serialization ─────────────────────────────────────────

/**
 * Parse an SVG `d` string (M, L, C, Z only) into Paper.js-style Segments.
 * Handles are stored as relative offsets from the anchor point.
 */
export function parsePathSegments(d: string): Segment[] {
  const tokens = d.trim().split(/[\s,]+/)
  const segments: Segment[] = []
  let i = 0
  let curX = 0
  let curY = 0

  while (i < tokens.length) {
    const cmd = tokens[i++]
    if (cmd === "M") {
      curX = parseFloat(tokens[i++]!)
      curY = parseFloat(tokens[i++]!)
      segments.push({ point: { x: curX, y: curY }, handleIn: { x: 0, y: 0 }, handleOut: { x: 0, y: 0 } })
    } else if (cmd === "L") {
      curX = parseFloat(tokens[i++]!)
      curY = parseFloat(tokens[i++]!)
      segments.push({ point: { x: curX, y: curY }, handleIn: { x: 0, y: 0 }, handleOut: { x: 0, y: 0 } })
    } else if (cmd === "C") {
      const cx1 = parseFloat(tokens[i++]!)
      const cy1 = parseFloat(tokens[i++]!)
      const cx2 = parseFloat(tokens[i++]!)
      const cy2 = parseFloat(tokens[i++]!)
      const x = parseFloat(tokens[i++]!)
      const y = parseFloat(tokens[i++]!)
      // Set handleOut on previous segment (absolute cp1 → relative from prevPoint)
      const prev = segments[segments.length - 1]
      if (prev) {
        prev.handleOut = { x: cx1 - curX, y: cy1 - curY }
      }
      // New segment with handleIn = cp2 relative to new point
      segments.push({
        point: { x, y },
        handleIn: { x: cx2 - x, y: cy2 - y },
        handleOut: { x: 0, y: 0 },
      })
      curX = x
      curY = y
    } else if (cmd === "Z" || cmd === "z") {
      // closed marker — skip
    }
    // ignore unknown commands
  }

  return segments
}

/**
 * Serialize Paper.js-style Segments back to an SVG `d` string.
 * Uses C (cubic bezier) when a segment has non-zero handles, L otherwise.
 */
export function serializeSegments(segments: Segment[], closed: boolean): string {
  if (segments.length === 0) return ""

  const r = (n: number) => Math.round(n * 100) / 100

  const first = segments[0]!
  let d = `M ${r(first.point.x)} ${r(first.point.y)}`

  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1]!
    const cur = segments[i]!
    const hasHandles =
      (prev.handleOut.x !== 0 || prev.handleOut.y !== 0) ||
      (cur.handleIn.x !== 0 || cur.handleIn.y !== 0)

    if (hasHandles) {
      const cx1 = r(prev.point.x + prev.handleOut.x)
      const cy1 = r(prev.point.y + prev.handleOut.y)
      const cx2 = r(cur.point.x + cur.handleIn.x)
      const cy2 = r(cur.point.y + cur.handleIn.y)
      d += ` C ${cx1} ${cy1} ${cx2} ${cy2} ${r(cur.point.x)} ${r(cur.point.y)}`
    } else {
      d += ` L ${r(cur.point.x)} ${r(cur.point.y)}`
    }
  }

  if (closed) d += " Z"
  return d
}
