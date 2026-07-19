import type { App } from 'vue'
import type { CustomMap as _C } from './components/CustomMap.vue'

export type Origin = { x: number; y: number }

export type Annotation = {
  id: string | number
  x: number
  y: number
  text: string
  level?: number
  style?: number // index into the component's `styles` prop; -1 / missing = default
}

export type LabelStyle = {
  fontSize?: number // px
  color?: string
}

export type ViewChangePayload = {
  scale: number
  offsetX: number
  offsetY: number
  visibleUserRect: { x: number; y: number; w: number; h: number }
}

export interface CustomMapHandle {
  zoomIn(): void
  zoomOut(): void
  resetView(): void
  getScale(): number
  userToScreen(ux: number, uy: number): { sx: number; sy: number }
  screenToUser(sx: number, sy: number): { ux: number; uy: number }
}

export declare const CustomMap: typeof _C
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
