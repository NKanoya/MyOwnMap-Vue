<script setup>
import { ref, shallowRef, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useMapTransform } from '@/composables/useMapTransform'

const props = defineProps({
  // container dimensions — any CSS length (e.g. "800px", "100%")
  width: { type: String, default: '100%' },
  height: { type: String, default: '600px' },

  // base map image
  imageSrc: { type: String, required: true },
  imageAlt: { type: String, default: 'map' },

  // the image pixel that becomes user-space (0,0)
  origin: {
    type: Object,
    default: () => ({ x: 0, y: 0 }),
    validator: (v) => Number.isFinite(v.x) && Number.isFinite(v.y),
  },

  // developer-specified annotations in user coordinates.
  // { id, x, y, text, level? } — level is 1 (default, always shown),
  // 2+ (shown once zoom reaches the matching entry in levelThresholds).
  annotations: { type: Array, default: () => [] },

  // base font-size (px) for annotations — stays constant regardless of zoom
  labelFontSize: { type: Number, default: 14 },

  // toggle label weight — true = bold (700), false = normal (400)
  labelBold: { type: Boolean, default: true },

  // style groups referenced by annotations via `style` index. Each group
  // overrides whatever fields it declares; anything omitted falls back to
  // the component defaults (labelFontSize / labelBold / outlined white).
  styles: {
    type: Array,
    default: () => [],
  },

  // per-level zoom thresholds (multiplier of natural size), indexed by
  // (level - 2). level 1 is always shown. level 2 appears once scale >=
  // levelThresholds[0], level 3 once scale >= levelThresholds[1], etc.
  levelThresholds: {
    type: Array,
    default: () => [0.4, 0.8],
    validator: (v) => Array.isArray(v) && v.every((n) => Number.isFinite(n) && n > 0),
  },

  // render the base map with nearest-neighbor scaling (pixel art style)
  // instead of the browser's smooth interpolation. Default true.
  pixelated: { type: Boolean, default: true },

  // show a live readout of the cursor's user-space coordinate
  showCoordinate: { type: Boolean, default: true },

  // number of decimals for the coordinate readout
  coordinatePrecision: { type: Number, default: 1 },
})

const emit = defineEmits(['ready', 'view-change', 'annotation-click', 'annotation-hover'])

const {
  state,
  configure,
  userToImage,
  userToScreen,
  screenToUser,
  fitToContainer,
  zoomAt,
  zoomBy,
  panBy,
  reset,
} = useMapTransform()

// ---- refs ----
const containerRef = ref(null)
const imageRef = ref(null)
const naturalSize = ref({ w: 0, h: 0 })
const pan = ref({ active: false, startX: 0, startY: 0, moved: false })

// live cursor position in user coordinates (for the readout overlay)
const pointerUser = ref(null)
const computedPointerUser = computed(() =>
  pointerUser.value
    ? {
        x: pointerUser.value.ux.toFixed(props.coordinatePrecision),
        y: pointerUser.value.uy.toFixed(props.coordinatePrecision),
      }
    : null,
)

// buffered mirror of scale/offset, written SYNCHRONOUSLY when the view
// mutates so the labels computed tracks the image with zero frame lag
const buffered = shallowRef({ scale: 1, offsetX: 0, offsetY: 0 })

// ---- view transform (what we bind to DOM) ----
const imageTransform = computed(
  () => `translate3d(${state.offsetX}px, ${state.offsetY}px, 0) scale(${state.scale})`,
)

// minimum scale a given annotation level needs before it shows.
// level 1 → 0 (always). level N>=2 → levelThresholds[N-2] (undefined = never).
const thresholdForLevel = (level) => {
  if (level <= 1) return 0
  return props.levelThresholds[level - 2] ?? Infinity
}

// Resolve a single annotation's style group, indexed by `a.style`. The group
// only overrides `color` and `fontSize`; everything else (weight, outline,
// shadow) stays at the component defaults. `style === -1` or an out-of-range
// index falls back to defaults.
const baseFontWeight = computed(() => (props.labelBold ? 700 : 400))
function resolveLabelStyle(a) {
  const g = props.styles[a.style]
  return {
    fontSize: g?.fontSize ?? props.labelFontSize,
    fontWeight: baseFontWeight.value,
    color: g?.color ?? '#fff',
    stroke: '0.6px rgba(0, 0, 0, 0.55)',
    textShadow: '0 0 2px rgba(0, 0, 0, 0.45), 0 1px 3px rgba(0, 0, 0, 0.35)',
  }
}

// ---- annotations rendered in SCREEN space (outside the transformed world) ----
// Recomputes in the same tick as the image transform (via buffered) so labels
// never visibly lag; living outside the scaled world keeps text crisp.
// Per-level zoom gating: level 1 always, level 2+3 gated by their thresholds.
const positionedLabels = computed(() => {
  const { scale, offsetX, offsetY } = buffered.value
  return props.annotations
    .filter((a) => scale >= thresholdForLevel(a.level || 1))
    .map((a) => {
      const { px, py } = userToImage(a.x, a.y)
      return { ...a, sx: px * scale + offsetX, sy: py * scale + offsetY, resolvedStyle: resolveLabelStyle(a) }
    })
})

// ---- image load ----
function onImageLoad() {
  const img = imageRef.value
  if (!img) return
  naturalSize.value = { w: img.naturalWidth, h: img.naturalHeight }
  measureAndFit(true)
}

function measureAndFit(forceFit = false) {
  const el = containerRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  configure({
    originX: props.origin.x,
    originY: props.origin.y,
    imageW: naturalSize.value.w,
    imageH: naturalSize.value.h,
    containerW: rect.width,
    containerH: rect.height,
  })
  if (forceFit) fitToContainer()
  syncBuffered()
  emitViewChange()
}

// mirror the readonly transform state into the buffered ref for labels
function syncBuffered() {
  buffered.value = { scale: state.scale, offsetX: state.offsetX, offsetY: state.offsetY }
}

// ---- pointer pan ----
function onPointerDown(e) {
  // ignore clicks on label buttons
  if (e.target.closest('[data-map-label]')) return
  pan.value = { active: true, startX: e.clientX, startY: e.clientY, moved: false }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(e) {
  if (!pan.value.active) return
  const dx = e.clientX - pan.value.startX
  const dy = e.clientY - pan.value.startY
  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) pan.value.moved = true
  pan.value.startX = e.clientX
  pan.value.startY = e.clientY
  panBy(dx, dy)
  syncBuffered()
  emitViewChange()
}

function onPointerUp(e) {
  const didMove = pan.value.moved
  pan.value = { active: false, startX: 0, startY: 0, moved: false }
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  // A click without drag leaves room for future interaction (e.g. placing a point).
  // We intentionally do nothing here for now.
}

// ---- live cursor coordinate (independent of pan) ----
function onPointerMoveContainer(e) {
  if (!props.showCoordinate) {
    if (pointerUser.value) pointerUser.value = null
    return
  }
  const rect = containerRef.value.getBoundingClientRect()
  const pt = screenToUser(e.clientX - rect.left, e.clientY - rect.top)
  pointerUser.value = pt
}
function onPointerLeaveContainer() {
  pointerUser.value = null
}

// ---- wheel zoom (anchor at cursor) ----
function onWheel(e) {
  e.preventDefault()
  const rect = containerRef.value.getBoundingClientRect()
  const ax = e.clientX - rect.left
  const ay = e.clientY - rect.top
  zoomBy(ax, ay, e.deltaY)
  syncBuffered()
  emitViewChange()
}

function emitViewChange() {
  const { ux: tlX, uy: tlY } = screenToUser(0, 0)
  const { ux: brX, uy: brY } = screenToUser(state.containerW, state.containerH)
  emit('view-change', {
    scale: state.scale,
    offsetX: state.offsetX,
    offsetY: state.offsetY,
    visibleUserRect: { x: tlX, y: tlY, w: brX - tlX, h: brY - tlY },
  })
}

// ---- toolbar controls ----
function zoomIn() {
  const cx = state.containerW / 2
  const cy = state.containerH / 2
  zoomAt(cx, cy, 1.25)
  syncBuffered()
  emitViewChange()
}
function zoomOut() {
  const cx = state.containerW / 2
  const cy = state.containerH / 2
  zoomAt(cx, cy, 0.8)
  syncBuffered()
  emitViewChange()
}
function resetView() {
  reset()
  syncBuffered()
  emitViewChange()
}

// ---- lifecycle ----
let resizeObserver = null
onMounted(() => {
  if (imageRef.value && imageRef.value.complete) onImageLoad()
  resizeObserver = new ResizeObserver(() => measureAndFit(false))
  if (containerRef.value) resizeObserver.observe(containerRef.value)
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})

watch(() => [props.origin.x, props.origin.y], () => {
  configure({
    originX: props.origin.x,
    originY: props.origin.y,
    imageW: naturalSize.value.w,
    imageH: naturalSize.value.h,
    containerW: containerRef.value?.getBoundingClientRect().width || 0,
    containerH: containerRef.value?.getBoundingClientRect().height || 0,
  })
})

// ---- public API (exposed for parent ref usage) ----
defineExpose({
  zoomIn, zoomOut, resetView,
  userToScreen, screenToUser,
  getScale: () => state.scale,
})
</script>

<template>
  <div class="cmap-root" :style="{ width, height }">
    <div
      ref="containerRef"
      class="cmap-container"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMoveContainer"
      @pointerleave="onPointerLeaveContainer"
      @wheel="onWheel"
    >
      <!-- transformed image world (GPU-composited) -->
      <div class="cmap-world" :style="{ transform: imageTransform }">
        <img
          ref="imageRef"
          class="cmap-image"
          :class="{ 'cmap-image--smooth': !pixelated }"
          :src="imageSrc"
          :alt="imageAlt"
          draggable="false"
          @load="onImageLoad"
        />
      </div>

      <!-- labels: native HTML in SCREEN space, positioned each frame from
           buffered transform. Never lives inside a scaled element => crisp.
           JS-driven position, NOT CSS transform. Per-level zoom gating. -->
      <div v-if="positionedLabels.length" class="cmap-labels">
        <div
          v-for="a in positionedLabels"
          :key="a.id"
          class="cmap-label"
          :style="{
            left: a.sx + 'px',
            top: a.sy + 'px',
            fontSize: a.resolvedStyle.fontSize + 'px',
            fontWeight: a.resolvedStyle.fontWeight,
            color: a.resolvedStyle.color,
            '-webkit-text-stroke': a.resolvedStyle.stroke,
            textShadow: a.resolvedStyle.textShadow,
          }"
          data-map-label
          @click.stop="emit('annotation-click', a)"
          @mouseenter="emit('annotation-hover', a, $event)"
        >{{ a.text }}</div>
      </div>

      <!-- live cursor coordinate readout (top-left), hideable via prop -->
      <div v-if="showCoordinate && computedPointerUser" class="cmap-coordinate">
        x: {{ computedPointerUser.x }} &nbsp; y: {{ computedPointerUser.y }}
      </div>

      <!-- floating zoom controls: plain HTML buttons with inline SVG icons -->
      <div class="cmap-controls" role="group" aria-label="map controls">
        <button type="button" class="cmap-btn" @click="zoomIn" aria-label="zoom in">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" fill="currentColor" /></svg>
        </button>
        <button type="button" class="cmap-btn" @click="zoomOut" aria-label="zoom out">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 11h14v2H5z" fill="currentColor" /></svg>
        </button>
        <button type="button" class="cmap-btn" @click="resetView" aria-label="reset view">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" fill="currentColor" /></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cmap-root {
  display: flex;
  flex-direction: column;
}
.cmap-container {
  position: relative;
  flex: auto;
  overflow: hidden;
  background: var(--p-surface-100);
  border: 1px solid var(--p-surface-300);
  border-radius: var(--p-border-radius-md);
  user-select: none;
  touch-action: none;
  cursor: grab;
}
.cmap-container:active {
  cursor: grabbing;
}

/* ---- coordinate readout ---- */
.cmap-coordinate {
  position: absolute;
  top: 0.6rem;
  left: 0.6rem;
  z-index: 5;
  padding: 0.25rem 0.6rem;
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  color: #000;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 0.5rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  pointer-events: none;
}

/* ---- floating zoom controls: flat grey pill row ---- */
.cmap-controls {
  position: absolute;
  right: 0.6rem;
  bottom: 0.6rem;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0.2rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.15);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}
.cmap-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  font-size: 0.85rem;
  line-height: 1;
  color: #000;
  background: transparent;
  border: none;
  border-radius: 0.35rem;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}
.cmap-btn:hover {
  background: #000;
  color: #fff;
}
.cmap-btn:active {
  background: #222;
  color: #fff;
}
.cmap-btn:focus-visible {
  outline: 2px solid #000;
  outline-offset: 1px;
}

:deep(.p-button){

}

.cmap-world {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  will-change: transform;
}
.cmap-image {
  display: block;
  pointer-events: none;
  /* nearest-neighbor scaling: sharp pixels when zoomed, not blurry */
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
.cmap-image--smooth {
  image-rendering: auto;
}
.cmap-labels {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}
.cmap-label {
  position: absolute;
  transform: translateX(-50%);
  white-space: nowrap;
  line-height: 1.2;
  pointer-events: auto;
  cursor: default;
  /* text styling is driven inline by resolveLabelStyle(); these are just
     hardcoded fallbacks in case the inline style is ever missing. */
  color: #fff;
  font-weight: 700;
  -webkit-text-stroke: 0.6px rgba(0, 0, 0, 0.55);
  text-shadow:
    0 0 2px rgba(0, 0, 0, 0.45),
    0 1px 3px rgba(0, 0, 0, 0.35);
  paint-order: stroke fill;
}
</style>
