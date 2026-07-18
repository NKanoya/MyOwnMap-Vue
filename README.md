# CustomMap — a self-rolled image map component for Vue 3

A reusable, PrimeVue-styled image-map widget. Drop in any image as a base
map, then pan, zoom, and annotate it — the kind of thing you'd normally
reach a mapping library for, but with **your own image** and a **real
pixel-based coordinate system** that a developer controls.

> This component is a **developer tool**: the developer wires up the image,
> the origin, and the annotations; the end user just gets a finished,
> interactive map.

---

## Features

- **Your image as the base map** — any `imageSrc` (PNG/JPG/SVG/…). No tiles,
  no network, no API key.
- **Custom pixel coordinate system** — pick any image pixel as user-space
  `(0,0)`; +x → right, +y → down. All positions are expressed in those units.
- **Pan & zoom** — drag to pan, scroll to zoom (anchored at the cursor), plus
  on-screen zoom-in / zoom-out / reset controls.
- **Crisp annotation labels** — native HTML `<div>` elements positioned in
  screen space, so the text stays sharp at any zoom level and never scales
  with the image.
- **Per-level zoom gating** — level-1 labels always show; level-2, level-3, …
  only appear once the zoom crosses a developer-defined threshold.
- **Optional live coordinate readout** — shows the cursor's user-space
>   coordinate in real time.
- PrimeVue integration and a small footprint.

---

## Requirements

- Vue ≥ 3.5
- PrimeVue ≥ 4 (tested with `@primeuix/themes` Aura preset) and `primeicons`

The component consumes PrimeVue globally — register PrimeVue + a theme in
your `main.js` (see below).

---

## Quick start

### 1. Install Peer dependencies (once per host project)

```sh
npm install primevue @primeuix/themes primeicons
```

Wire PrimeVue in `src/main.js`:

```js
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import 'primeicons/primeicons.css'

const app = createApp(App)
app.use(PrimeVue, { theme: { preset: Aura } })
```

### 2. Drop in the base map

Put your image somewhere statically servable (`public/` is simplest):

```
public/maps/my-map.png
```

### 3. Use the component

```vue
<script setup>
import CustomMap from './components/CustomMap.vue'

const imageSrc = '/maps/my-map.png'

// Say image pixel (1200, 900) is the spot you want to call (0,0).
const origin = { x: 1200, y: 900 }

// Annotations in user coordinates, +x right +y down, in image-pixel units.
const annotations = [
  { id: 1, x: -500, y: -300, text: 'Building A',   level: 1 },
  { id: 2, x:  200, y: -150, text: 'Building B',   level: 1 },
  { id: 3, x: -120, y:   60, text: 'Reception',    level: 2 },
  { id: 4, x:   80, y:  100, text: 'Fire exit',   level: 3 },
]
</script>

<template>
  <CustomMap
    :imageSrc="imageSrc"
    :origin="origin"
    :annotations="annotations"
    width="100%"
    height="640px"
  />
</template>
```

On mount the image is auto-fitted, centered, and the annotations appear. Drag
to pan, scroll to zoom.

---

## Coordinate system

Three spaces, chained:

```
user ──[ shift by origin ]──▶ image px ──[ *scale + offset ]──› screen
```

- **image px** — the bitmap's own pixels, origin at top-left, +x right +y down.
- **user** — developer-defined. The pixel `origin` on the image *becomes*
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
| `origin` | `{ x, y }` | `{ x: 0, y: 0 }` | Image pixel that maps to user `(0,0)`. |
| `annotations` | `Array` | `[]` | See [Annotations](#annotations). |
| `labelFontSize` | `Number` | `14` | Label font size in px — constant at any zoom. |
| `labelBold` | `Boolean` | `true` | Label weight: `true`→700, `false`→400. |
| `levelThresholds` | `Array` | `[0.4, 0.8]` | Per-level zoom thresholds (see [Level visibility](#level-visibility)). |
| `showCoordinate` | `Boolean` | `true` | Show the live cursor coordinate readout. |
| `coordinatePrecision` | `Number` | `1` | Decimal places in the readout. |

### annotations

```ts
type Annotation = {
  id: string | number   // stable key, also passed through events
  x: number              // user-space x (+x → right)
  y: number              // user-space y (+y → down)
  text: string           // label text
  level?: 1 | 2 | 3      // visibility tier (default 1)
}
```

### level visibility

`levelThresholds[i]` is the zoom-factor (multiple of the image's natural
size) at which **level `i+2`** becomes visible:

- level 1 — always visible (threshold 0)
- level 2 — visible once `scale >= levelThresholds[0]`  (default `0.4`)
- level 3 — visible once `scale >= levelThresholds[1]`  (default `0.8`)
- levels beyond the array length never appear.

This gives you exact control over how many tiers exist and where each one
kicks in. Out-of-gating labels simply don't render — no hidden DOM.

---

## Events

| Event | Payload | When |
|-------|---------|------|
| `view-change` | `{ scale, offsetX, offsetY, visibleUserRect }` | Every pan / zoom mutation. `visibleUserRect` is `{ x, y, w, h }` of the currently visible user-space rectangle (useful for your own dynamic annotations). |
| `annotation-click` | `annotation` | Reserved — a label was clicked. |
| `annotation-hover` | `(annotation, mouseEvent)` | Reserved — pointer entered a label. |
| `ready` | — | Reserved — initial layout complete. |

The `annotation-click` / `annotation-hover` / `ready` events are reserved hooks:
they fire with the right payload but currently carry no built-in behavior, so
you can wire them up later without an API change.

---

## Expose (imperative handle)

Access via `ref`:

```vue
<CustomMap ref="map" ... />
```

```js
const map = ref(null)
map.value.zoomIn()       // +25% at center
map.value.zoomOut()      // -20% at center
map.value.resetView()    // re-fit & center
map.value.getScale()     // current scale factor
map.value.userToScreen(ux, uy)  // → { sx, sy }
map.value.screenToUser(sx, sy)  // → { ux, uy }
```

---

## Trying the demo

```sh
npm run dev
```

The demo in `src/App.vue` loads a sample map under `public/maps/`, mixes three
annotation levels, and exposes the threshold sliders + a bold toggle so you
can play with every prop live. Drop your own image into `public/maps/` and
point `imageSrc` at it.

> Per the `.gitignore`, `public/maps/` is excluded from version control — base
> images checked in there won't be committed (keep a sample or two outside that
> folder if you want them in the repo).

---

## Project layout

```
src/
  components/CustomMap.vue      # the component
  composables/useMapTransform.js  # pure reactive transform math (no DOM)
  App.vue                       # demo page
public/maps/                    # dev-only base images (git-ignored)
```
