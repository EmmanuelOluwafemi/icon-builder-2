interface Point {
  x: number
  y: number
}

interface Segment {
  point: Point
  handleIn: Point | null   // bezier in-handle (relative to point)
  handleOut: Point | null  // bezier out-handle (relative to point)
}

export class PenPathBuilder {
  private segments: Segment[] = []

  get isEmpty(): boolean {
    return this.segments.length === 0
  }

  get segmentCount(): number {
    return this.segments.length
  }

  get firstPoint(): Point | null {
    return this.segments[0]?.point ?? null
  }

  /**
   * Add an anchor point.
   * @param point     Canvas position of the anchor
   * @param handleOut Drag delta from the anchor — produces smooth bezier handles.
   *                  Omit (or pass undefined) for a corner anchor with no handles.
   */
  addAnchor(point: Point, handleOut?: Point): void {
    this.segments.push({
      point,
      handleIn: handleOut ? { x: -handleOut.x, y: -handleOut.y } : null,
      handleOut: handleOut ?? null,
    })
  }

  /** SVG d string for the current open path */
  serialize(): string {
    return buildDString(this.segments, false)
  }

  /** SVG d string with the path closed (appends Z) */
  serializeClosed(): string {
    return buildDString(this.segments, true)
  }
}

// ── SVG d string builder ───────────────────────────────────────────────────

function fmt(n: number): string {
  // Round to 4 decimal places to avoid floating-point noise in tests
  return +n.toFixed(4) + ""
}

function buildDString(segments: Segment[], closed: boolean): string {
  if (segments.length === 0) return ""

  const parts: string[] = []
  const first = segments[0]!

  parts.push(`M ${fmt(first.point.x)} ${fmt(first.point.y)}`)

  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1]!
    const curr = segments[i]!

    const cp1 = prev.handleOut
      ? { x: prev.point.x + prev.handleOut.x, y: prev.point.y + prev.handleOut.y }
      : prev.point

    const cp2 = curr.handleIn
      ? { x: curr.point.x + curr.handleIn.x, y: curr.point.y + curr.handleIn.y }
      : curr.point

    const isCurve = prev.handleOut !== null || curr.handleIn !== null

    if (isCurve) {
      parts.push(
        `C ${fmt(cp1.x)} ${fmt(cp1.y)} ${fmt(cp2.x)} ${fmt(cp2.y)} ${fmt(curr.point.x)} ${fmt(curr.point.y)}`
      )
    } else {
      parts.push(`L ${fmt(curr.point.x)} ${fmt(curr.point.y)}`)
    }
  }

  if (closed) {
    // Add closing curve/line from last segment back to first
    const last = segments[segments.length - 1]!
    const cp1 = last.handleOut
      ? { x: last.point.x + last.handleOut.x, y: last.point.y + last.handleOut.y }
      : last.point
    const cp2 = first.handleIn
      ? { x: first.point.x + first.handleIn.x, y: first.point.y + first.handleIn.y }
      : first.point

    const isCurve = last.handleOut !== null || first.handleIn !== null
    if (isCurve) {
      parts.push(
        `C ${fmt(cp1.x)} ${fmt(cp1.y)} ${fmt(cp2.x)} ${fmt(cp2.y)} ${fmt(first.point.x)} ${fmt(first.point.y)}`
      )
    }
    parts.push("Z")
  }

  return parts.join(" ")
}
