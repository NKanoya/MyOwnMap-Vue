<script setup>
import { ref } from 'vue'
import CustomMap from './components/CustomMap.vue'

// Demo data. Real usage: developer supplies image + origin + annotations.
const imageSrc = '/maps/sample-map.svg'

// Declare pixel (800,500) on the image — the Main Gate — as user (0,0).
const origin = { x: 800, y: 500 }

// Annotations expressed in user coordinates relative to that origin.
// +x → right, +y → down, in image-pixel units.
const annotations = [
  { id: 1, x: -400, y: -260, text: 'Hall A' },
  { id: 2, x: 80,   y: -120, text: 'Hall B' },
  { id: 3, x: -260, y: 100,  text: 'Garden' },
  { id: 4, x: 280,  y: 60,   text: 'Cafeteria' },
  { id: 5, x: 0,    y: 0,    text: 'Main Gate (origin)' },
]

const mapRef = ref(null)
const view = ref(null)

function onViewChange(v) {
  view.value = v
}
</script>

<template>
  <div style="max-width: 1100px; margin: 2rem auto; padding: 0 1rem; font-family: sans-serif;">
    <h1 style="margin-bottom: 0.25rem;">CustomMap demo</h1>
    <p style="color:#666; margin-top: 0;">
      Origin set at image pixel (800, 500). Drag to pan, scroll to zoom.
    </p>

    <CustomMap
      ref="mapRef"
      :imageSrc="imageSrc"
      :origin="origin"
      :annotations="annotations"
      :showCoordinate="true"
      :coordinatePrecision="1"
      width="100%"
      height="640px"
      @view-change="onViewChange"
    />

    <p v-if="view" style="color:#888; font-size: 0.85rem; margin-top: 0.5rem;">
      scale: {{ view.scale.toFixed(3) }} · offset: ({{ view.offsetX.toFixed(0) }}, {{ view.offsetY.toFixed(0) }})
    </p>
  </div>
</template>
