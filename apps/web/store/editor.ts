import { create } from "zustand"

// ── Types ──────────────────────────────────────────────────────────────────

export type Tool = "select" | "pen" | "rect" | "circle" | "line" | "zoom"

export interface Viewport {
  x: number
  y: number
  scale: number
}

interface BaseElement {
  id: string
  frameId: string | null
  name: string
  x: number
  y: number
  rotation: number
  fill: string
  stroke: string
  strokeWidth: number
  opacity: number
}

export interface RectElement extends BaseElement {
  type: "rect"
  width: number
  height: number
}

export interface CircleElement extends BaseElement {
  type: "circle"
  radiusX: number
  radiusY: number
}

export interface LineElement extends BaseElement {
  type: "line"
  points: number[]
}

export interface PathElement extends BaseElement {
  type: "path"
  d: string
}

export type CanvasElement = RectElement | CircleElement | LineElement | PathElement

export interface Frame {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
}

// ── Store ──────────────────────────────────────────────────────────────────

interface EditorState {
  elements: CanvasElement[]
  frames: Frame[]
  activeTool: Tool
  selection: string[]
  viewport: Viewport
  history: CanvasElement[][]
  historyIndex: number
  nodeEditTarget: string | null
}

interface EditorActions {
  setActiveTool: (tool: Tool) => void
  setViewport: (viewport: Partial<Viewport>) => void
  setSelection: (ids: string[]) => void
  setNodeEditTarget: (id: string | null) => void
  addElement: (element: CanvasElement) => void
  updateElement: (id: string, updates: Partial<CanvasElement>) => void
  removeElements: (ids: string[]) => void
  reorderElement: (id: string, toIndex: number) => void
  addFrame: (frame: Frame) => void
  updateFrame: (id: string, updates: Partial<Frame>) => void
  removeFrame: (id: string) => void
  pushHistory: () => void
  undo: () => void
  redo: () => void
}

const INITIAL_ELEMENTS: CanvasElement[] = []
const INITIAL_FRAMES: Frame[] = []
const MAX_HISTORY = 50

export const useEditorStore = create<EditorState & EditorActions>((set, get) => ({
  // ── State ────────────────────────────────────────────────────────────────
  elements: INITIAL_ELEMENTS,
  frames: INITIAL_FRAMES,
  activeTool: "select",
  selection: [],
  viewport: { x: 0, y: 0, scale: 1 },
  history: [INITIAL_ELEMENTS],
  historyIndex: 0,
  nodeEditTarget: null,

  // ── Tool & UI ────────────────────────────────────────────────────────────
  setActiveTool: (tool) => set({ activeTool: tool, selection: [], nodeEditTarget: null }),

  setViewport: (viewport) =>
    set((state) => ({ viewport: { ...state.viewport, ...viewport } })),

  setSelection: (ids) => set({ selection: ids }),

  setNodeEditTarget: (id) => set({ nodeEditTarget: id }),

  // ── Elements ─────────────────────────────────────────────────────────────
  addElement: (element) => {
    set((state) => ({ elements: [...state.elements, element] }))
    get().pushHistory()
  },

  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? ({ ...el, ...updates } as CanvasElement) : el
      ),
    })),

  removeElements: (ids) => {
    set((state) => ({
      elements: state.elements.filter((el) => !ids.includes(el.id)),
      selection: state.selection.filter((id) => !ids.includes(id)),
    }))
    get().pushHistory()
  },

  reorderElement: (id, toIndex) => {
    set((state) => {
      const elements = [...state.elements]
      const fromIndex = elements.findIndex((el) => el.id === id)
      if (fromIndex === -1) return state
      const element = elements.splice(fromIndex, 1)[0]
      if (!element) return state
      elements.splice(toIndex, 0, element)
      return { elements }
    })
    get().pushHistory()
  },

  // ── Frames ────────────────────────────────────────────────────────────────
  addFrame: (frame) => set((state) => ({ frames: [...state.frames, frame] })),

  updateFrame: (id, updates) =>
    set((state) => ({
      frames: state.frames.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    })),

  removeFrame: (id) =>
    set((state) => ({
      frames: state.frames.filter((f) => f.id !== id),
      elements: state.elements.filter((el) => el.frameId !== id),
    })),

  // ── History ───────────────────────────────────────────────────────────────
  pushHistory: () =>
    set((state) => {
      const snapshot = structuredClone(state.elements)
      const sliced = state.history.slice(0, state.historyIndex + 1)
      const next = [...sliced, snapshot].slice(-MAX_HISTORY)
      return { history: next, historyIndex: next.length - 1 }
    }),

  undo: () =>
    set((state) => {
      const nextIndex = Math.max(0, state.historyIndex - 1)
      return {
        elements: structuredClone(state.history[nextIndex]),
        historyIndex: nextIndex,
        selection: [],
        nodeEditTarget: null,
      }
    }),

  redo: () =>
    set((state) => {
      const nextIndex = Math.min(state.history.length - 1, state.historyIndex + 1)
      return {
        elements: structuredClone(state.history[nextIndex]),
        historyIndex: nextIndex,
        selection: [],
        nodeEditTarget: null,
      }
    }),
}))

// ── Selectors ─────────────────────────────────────────────────────────────
export const canUndo = (state: EditorState) => state.historyIndex > 0
export const canRedo = (state: EditorState) => state.historyIndex < state.history.length - 1
