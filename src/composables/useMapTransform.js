import { reactive, readonly } from 'vue'

/**
 * Core map transform logic — pure reactive state, no DOM.
 *
 * Coordinate spaces:
 *   image px : the bitmap's native pixels, origin at top-left, +x right, +y down
 *   user     : developer-defined space. origin sits at image pixel (originX, originY).
 *              +x = right, +y = down (matches image space, just shifted).
 *   screen   : actual on-screen pixels inside the container.
 *
 * Pipeline:  user --[shift by origin]--> image px --[*scale + offset]--> screen
 */
export function useMapTransform() {
  const state = reactive({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    originX: 0,
    originY: 0,
    containerW: 0,
    containerH: 0,
    imageW: 0,
    imageH: 0,
    boundaryMargin: 100,
  })

  function configure({ originX = 0, originY = 0, imageW = 0, imageH = 0, containerW = 0, containerH = 0, boundaryMargin = 100 }) {
    state.originX = originX
    state.originY = originY
    state.imageW = imageW
    state.imageH = imageH
    state.containerW = containerW
    state.containerH = containerH
    state.boundaryMargin = boundaryMargin
  }

  // the smallest scale that still covers the container in both dimensions
  function fitScale() {
    if (!state.imageW || !state.imageH || !state.containerW || !state.containerH) return 0.02
    return Math.min(state.containerW / state.imageW, state.containerH / state.imageH)
  }

  // keep the mapped image within container bounds + an allowed background margin
  function clampOffset() {
    const m = state.boundaryMargin
    const imgW = state.imageW * state.scale
    const imgH = state.imageH * state.scale

    if (imgW <= state.containerW) {
      state.offsetX = (state.containerW - imgW) / 2
    } else {
      const minX = state.containerW - imgW - m
      const maxX = m
      state.offsetX = Math.min(maxX, Math.max(minX, state.offsetX))
    }

    if (imgH <= state.containerH) {
      state.offsetY = (state.containerH - imgH) / 2
    } else {
      const minY = state.containerH - imgH - m
      const maxY = m
      state.offsetY = Math.min(maxY, Math.max(minY, state.offsetY))
    }
  }

  // user coord -> image pixel
  function userToImage(ux, uy) {
    return { px: state.originX + ux, py: state.originY + uy }
  }

  // image pixel -> screen
  function imageToScreen(ix, iy) {
    return { sx: ix * state.scale + state.offsetX, sy: iy * state.scale + state.offsetY }
  }

  // user coord -> screen  (the one we use most for annotations)
  function userToScreen(ux, uy) {
    const { px, py } = userToImage(ux, uy)
    return imageToScreen(px, py)
  }

  // screen -> user coord  (reverse, for future interaction)
  function screenToUser(sx, sy) {
    const ix = (sx - state.offsetX) / state.scale
    const iy = (sy - state.offsetY) / state.scale
    return { ux: ix - state.originX, uy: iy - state.originY }
  }

  // fit image inside the container, centered
  function fitToContainer() {
    if (!state.imageW || !state.imageH || !state.containerW || !state.containerH) return
    const s = Math.min(state.containerW / state.imageW, state.containerH / state.imageH)
    state.scale = s
    state.offsetX = (state.containerW - state.imageW * s) / 2
    state.offsetY = (state.containerH - state.imageH * s) / 2
  }

  // center the view on a user-space point at a given scale
  function centerAtScale(scale, userX, userY) {
    if (!state.imageW || !state.imageH || !state.containerW || !state.containerH) return
    const { px, py } = userToImage(userX, userY)
    state.scale = scale
    state.offsetX = state.containerW / 2 - px * scale
    state.offsetY = state.containerH / 2 - py * scale
  }

  // zoom while keeping the screen point (anchorX, anchorY) fixed; clamp scale to
  // never go below fitScale (whole image stays at least covering the container)
  function zoomAt(anchorX, anchorY, factor) {
    const min = fitScale()
    const next = Math.min(50, Math.max(min, state.scale * factor))
    const ratio = next / state.scale
    state.offsetX = anchorX - (anchorX - state.offsetX) * ratio
    state.offsetY = anchorY - (anchorY - state.offsetY) * ratio
    state.scale = next
    clampOffset()
  }

  function zoomBy(anchorX, anchorY, deltaY) {
    // deltaY > 0 from wheel => zoom out; < 0 => zoom in
    const factor = Math.exp(-deltaY * 0.0015)
    zoomAt(anchorX, anchorY, factor)
  }

  function panBy(dx, dy) {
    state.offsetX += dx
    state.offsetY += dy
    clampOffset()
  }

  function reset() {
    fitToContainer()
  }

  return {
    state: readonly(state),
    configure,
    userToImage,
    imageToScreen,
    userToScreen,
    screenToUser,
    fitToContainer,
    centerAtScale,
    fitScale,
    clampOffset,
    zoomAt,
    zoomBy,
    panBy,
    reset,
  }
}
