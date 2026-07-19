import type { App } from 'vue'
import type { default as MyOwnMapType } from './components/MyOwnMap.vue'

export type Origin = { x: number; y: number }

export type Annotation = {
  id: string | number
  x: number
  y: number
  text: string // use \n for multi-line (each line is centered)
  level?: number // -1 = always visible · 0,1,2... = reads levelThresholds[i]
  style?: number // index into the component's `styles` prop; -1 / missing = default
  icon?: string // optional image URL rendered to the left of the text
}

export type LabelStyle = {
  fontSize?: number // px
  fontWeight?: number
  color?: string
  stroke?: string // e.g. "0.6px rgba(0,0,0,0.55)"
  textShadow?: string // e.g. "0 0 2px #000, 0 1px 3px rgba(0,0,0,0.35)"
}

export type ViewChangePayload = {
  scale: number
  offsetX: number
  offsetY: number
  visibleUserRect: { x: number; y: number; w: number; h: number }
}

export interface MyOwnMapHandle {
  zoomIn(): void
  zoomOut(): void
  resetView(): void
  getScale(): number
  userToScreen(ux: number, uy: number): { sx: number; sy: number }
  screenToUser(sx: number, sy: number): { ux: number; uy: number }
}

export declare const MyOwnMap: MyOwnMapType
export declare function useMapTransform(): {
  userToScreen(ux: number, uy: number): { sx: number; sy: number }
  screenToUser(sx: number, sy: number): { ux: number; uy: number }
  fitToContainer(): void
  getScale(): number
}

declare const _default: {
  install(app: App): void
}
export default _default
