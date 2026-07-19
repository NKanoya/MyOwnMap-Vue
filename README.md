# @nkanoya/my-own-map-vue

English · [中文文档](./README.zh.md)

A self-rolled image-map component for **Vue 3**. Drop in any image as a base
map, then pan, zoom, and annotate it with a real pixel-space coordinate system
— the thing you'd normally reach a mapping library for, but with **your own
image**, no tiles, no network, no API key.

> This is a **developer tool**: the developer wires up the image, the origin,
> and the annotations. The end user just gets a finished, interactive map.

---

## Features

- **Your image as the base map** — any `imageSrc` (PNG / JPG / SVG / WebP).
- **Custom pixel coordinate system** — pick any image pixel as user-space
  `(0,0)`; +x → right, +y → down. All positions are expressed in those units.
- **Pan & zoom** — drag to pan, scroll to zoom (anchored at the cursor),
  plus on-screen zoom-in / zoom-out / reset controls.
- **Crisp annotation labels** — native HTML elements positioned in screen
  space, so text stays sharp at any zoom and never scales with the image.
- **Per-level zoom gating** — level-1 labels always show; level-2, level-3, …
  appear only past a developer-defined zoom threshold.
- **Optional live coordinate readout** — cursor's user-space coordinate, hidable.
- **Sharp-pixel base map** — pixelated (nearest-neighbor) rendering by default so
  zoomed-in maps stay crisp; toggleable.
- Compact black/white UI with a small footprint.

---

## Install

```sh
npm install @nkanoya/my-own-map-vue
```

This component is **dependency-free** aside from Vue itself: the controls are
plain HTML buttons styled inside the package. No extra setup is needed in the
host project — you only need Vue >= 3.5.

---

## Quick start

```js
// main.js — register globally (optional)
import { install as installMap } from '@nkanoya/my-own-map-vue'

app.use(installMap)
```

```vue
<!-- AnyView.vue — or import the component directly -->
<script setup>
import { MyOwnMap } from '@nkanoya/my-own-map-vue'

const imageSrc = '/maps/my-map.png'

// Say image pixel (1200, 900) is the spot you call (0,0).
const origin = { x: 1200, y: 900 }

const annotations = [
  { id: 1, x: -500, y: -300, text: 'Building A', level: 1 },
  { id: 2, x:  200, y: -150, text: 'Building B', level: 1 },
  { id: 3, x: -120, y:   60, text: 'Reception',  level: 2 },
  { id: 4, x:   80, y:  100, text: 'Fire exit',  level: 3 },
]
</script>

<template>
  <MyOwnMap
    :imageSrc="imageSrc"
    :origin="origin"
    :annotations="annotations"
    width="100%"
    height="640px"
  />
</template>
```

On mount, the view uses `initialScale` + `initialCenter` if set, otherwise the
image auto-fits the container. Annotations appear immediately. Drag to pan,
scroll to zoom. The home button restores the initial view.

---

## Coordinate system

Three spaces, chained:

```
user ──[ shift by origin ]──▶ image px ──[ *scale + offset ]──▶ screen
```

- **image px** — the bitmap's own pixels, origin top-left, +x right +y down.
- **user** — developer-defined. The pixel `origin` on the image becomes
  `(0,0)`; +x → right, +y → down (same orientation, just shifted).
- **screen** — actual on-screen pixels inside the component.

A point `{ x: 100, y: 50 }` in user space means "100 px right and 50 px down
from the origin" on the underlying image.

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `imageSrc` | `String` | *(required)* | Base-map image URL. |
| `imageAlt` | `String` | `'map'` | Alt text for the image. |
| `width` | `String` | `'100%'` | Any CSS length — component width. |
| `height` | `String` | `'600px'` | Any CSS length — component height. |
| `origin` | `{ x, y }` | `{ x: 0, y: 0 }` | Image pixel mapped to user `(0,0)`. |
| `annotations` | `Array` | `[]` | See [Annotations](#annotations). |
| `labelFontSize` | `Number` | `14` | Label font size in px — constant at any zoom. |
| `labelBold` | `Boolean` | `true` | Label weight: `true`→700, `false`→400. |
| `levelThresholds` | `Array` | `[0.4, 0.8]` | Per-level zoom thresholds (see below). |
| `pixelated` | `Boolean` | `true` | Render the base map with nearest-neighbor scaling (sharp pixels when zoomed) instead of smooth interpolation. |
| `initialScale` | `Number\|null` | `null` | Initial zoom scale (multiple of natural size). When `null` the image auto-fits the container. When set, `initialCenter` is used as the anchor. |
| `initialCenter` | `{ x, y }` | `{ x: 0, y: 0 }` | Initial view center in user coordinates (relative to origin). Ignored when `initialScale` is `null`. |
| `styles` | `Array<{ fontSize?, color? }>` | `[]` | Per-label style groups. Each annotation points at one via its `style` index; omitted fields and out-of-range / `-1` indices fall back to the component defaults. Independent of `level`. |
| `showCoordinate` | `Boolean` | `true` | Show the live cursor coordinate readout. |
| `coordinatePrecision` | `Number` | `1` | Decimal places in the readout. |

### annotations

```ts
type Annotation = {
  id: string | number   // stable key, also echoed by events
  x: number              // user-space x (+x → right)
  y: number              // user-space y (+y → down)
  text: string           // label text
  level?: 1 | 2 | 3      // visibility tier (default 1)
  style?: number         // index into the component's `styles` prop (default -1)
}
```

### Level visibility

`levelThresholds[i]` is the zoom factor (multiple of the image's natural size)
at which **level `i+2`** becomes visible:

- level 1 — always visible (threshold 0)
- level 2 — visible once `scale >= levelThresholds[0]`  (default `0.4`)
- level 3 — visible once `scale >= levelThresholds[1]`  (default `0.8`)
- levels beyond the array length never appear

This gives exact control over how many tiers exist and where each kicks in.
Out-of-gating labels simply don't render.

### Per-label style groups

`styles` is an array of `{ fontSize?, color? }` groups — a second axis
independent of `level`. Each annotation declares its group via `style`
(default `-1`, meaning component defaults). Group members override only the
fields they declare; everything else (weight, outline, shadow) stays at the
component defaults. An out-of-range index behaves like `-1`.

```js
const styles = [
  { fontSize: 20, color: '#ffd166' }, // index 0
  { color: '#ff5555' },               // index 1, default size
]
const annotations = [
  { id: 1, x: 100, y: 50, text: 'VIP',     style: 0 },
  { id: 2, x: 200, y: 80, text: 'Warning', style: 1 },
  { id: 3, x: 0,   y: 0,  text: 'Plain',   style: -1 }, // default white
]
```

---

## Events

| Event | Payload | When |
|-------|---------|------|
| `view-change` | `{ scale, offsetX, offsetY, visibleUserRect }` | Every pan / zoom. `visibleUserRect` is `{ x, y, w, h }` of the currently visible user-space rectangle — handy for your own dynamic annotations. |
| `annotation-click` | `annotation` | Reserved — a label was clicked. |
| `annotation-hover` | `(annotation, mouseEvent)` | Reserved — pointer entered a label. |
| `ready` | — | Reserved — initial layout complete. |

`annotation-click` / `annotation-hover` / `ready` are reserved hooks: they fire with
the right payload but carry no built-in behavior, so you can wire them up later
without an API change.

---

## Expose (imperative handle)

Access via template ref:

```vue
<MyOwnMap ref="map" ... />
```

```js
const map = ref(null)
map.value.zoomIn()                  // +25% at view center
map.value.zoomOut()                 // -20% at view center
map.value.resetView()               // restore initial view
map.value.getScale()                // → current scale factor
map.value.userToScreen(ux, uy)      // → { sx, sy }
map.value.screenToUser(sx, sy)      // → { ux, uy }
```

---

## Local development / demo

```sh
npm install
npm run dev
```

The demo in `src/App.vue` mixes three annotation levels and exposes the
threshold sliders + a bold toggle so you can exercise every prop live. Drop a
test image under `public/maps/` and point the demo's `imageSrc` at it.

---

## Project layout

```
src/
  index.js                        # library entry
  types.d.ts                      # public type declarations
  components/MyOwnMap.vue         # the component
  composables/useMapTransform.js  # pure reactive transform math (no DOM)
  App.vue                         # local demo (not shipped)
dist/                             # published output (git-ignored)
```

---

## License

[MIT](./LICENSE)
