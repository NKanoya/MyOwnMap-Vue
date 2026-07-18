<script setup>
import { ref, shallowRef, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useMapTransform } from '@/composables/useMapTransform'
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'

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

  // developer-specified annotations in user coordinates
  // { id, x, y, text }  — id reserved for future interaction
  annotations: { type: Array, default: () => [] },

  // base font-size (px) for annotations — stays constant regardless of zoom
  labelFontSize: { type: Number, default: 14 },

  // hide labels when zoomed out below this scale
  labelHideBelowScale: { type: Number, default: 0.25 },
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

// buffered mirror of scale/offset, written SYNCHRONOUSLY when the view
// mutates so the labels computed tracks the image with zero frame lag
const buffered = shallowRef({ scale: 1, offsetX: 0, offsetY: 0 })

// ---- view transform (what we bind to DOM) ----
const imageTransform = computed(
  () => `translate3d(${state.offsetX}px, ${state.offsetY}px, 0) scale(${state.scale})`,
)

const labelsVisible = computed(() => state.scale >= props.labelHideBelowScale)

// ---- annotations rendered in SCREEN space (outside the transformed world) ----
// We rely on buffered reactive state (not viewState) so this recomputes in the
// exact same tick as the image's transform — labels never visibly lag, and
// because they are never inside a scaled element the text stays crisp at any zoom.
const positionedLabels = computed(() =>
  props.annotations.map((a) => {
    const { px, py } = userToImage(a.x, a.y)
    const sx = px * buffered.scale + buffered.offsetX
    const sy = py * buffered.scale + buffered.offsetY
    return { ...a, sx, sy }
  }),
)

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
    <Toolbar class="cmap-toolbar">
      <template #start>
        <Button icon="pi pi-plus" size="small" text rounded @click="zoomIn" aria-label="zoom in" />
        <Button icon="pi pi-minus" size="small" text rounded @click="zoomOut" aria-label="zoom-out" />
        <Button icon="pi pi-refresh" size="small" text rounded @click="resetView" aria-label="reset" />
      </template>
    </Toolbar>

    <div
      ref="containerRef"
      class="cmap-container"
      @pointerdown="onPointerDown"
      @wheel="onWheel"
    >
      <!-- transformed image world (GPU-composited) -->
      <div class="cmap-world" :style="{ transform: imageTransform }">
        <img
          ref="imageRef"
          class="cmap-image"
          :src="imageSrc"
          :alt="imageAlt"
          draggable="false"
          @load="onImageLoad"
        />
      </div>

      <!-- labels: native HTML in SCREEN space, positioned each frame from
           buffered transform. Never lives inside a scaled element => crisp.
           JS-driven position, NOT CSS transform. -->
      <div v-if="labelsVisible" class="cmap-labels">
        <div
          v-for="a in positionedLabels"
          :key="a.id"
          class="cmap-label"
          :style="{
            left: a.sx + 'px',
            top: a.sy + 'px',
            fontSize: labelFontSize + 'px',
          }"
          data-map-label
          @click.stop="emit('annotation-click', a)"
          @mouseenter="emit('annotation-hover', a, $event)"
        >
          <span class="cmap-label-dot" />
          <span class="cmap-label-text">{{ a.text }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cmap-root {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.cmap-toolbar {
  flex: none;
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
}
.cmap-labels {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}
.cmap-label {
  position: absolute;
  transform: translate(-50%, -100%);
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 1px 0.4rem;
  white-space: nowrap;
  color: var(--p-surface-900);
  background: color-mix(in srgb, var(--p-surface-0) 85%, transparent);
  border: 1px solid var(--p-surface-400);
  border-radius: 999px;
  pointer-events: auto;
  cursor: default;
  line-height: 1.2;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}
.cmap-label-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--p-primary-color);
  border: 1px solid var(--p-surface-0);
  flex: none;
}
.cmap-label-text {
  font-weight: 500;
}
</style>
