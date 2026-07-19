<script setup>
import { ref } from 'vue'
import CustomMap from './components/CustomMap.vue'

// Test image lives in public/maps/ and is git-ignored — swap in your own.
const imageSrc = '/maps/test.png'

// Origin: some pixel on the image that user-space (0,0) maps to.
const origin = { x: 800, y: 500 }

// Annotations in user coordinates (+x right, +y down, image-pixel units).
// level: 1 = always shown · 2 = shown at level2Scale · 3 = shown at level3Scale.
const annotations = [
  { id: 1, x: -1200, y: -900,  text: 'Zone North-West',  level: 1 },
  { id: 2, x: 1100,  y: -800,  text: 'Zone North-East',  level: 1 },
  { id: 3, x: -1300, y: 700,   text: 'Zone South-West',  level: 1 },
  { id: 4, x: 1200,  y: 600,   text: 'Zone South-East',  level: 1 },
  { id: 5, x: 0,     y: 0,     text: 'Origin',           level: 1 },
  { id: 6, x: -400,  y: -260,  text: 'Hall A',           level: 2 },
  { id: 7, x: 380,   y: -200,  text: 'Hall B',           level: 2 },
  { id: 8, x: -300,  y: 260,   text: 'Garden',           level: 2 },
  { id: 9, x: 420,   y: 200,   text: 'Cafeteria',        level: 2 },
  { id: 10, x: -120, y: -60,   text: 'Reception desk',   level: 3 },
  { id: 11, x: 140,  y: 40,    text: 'Storage room',     level: 3 },
  { id: 12, x: -40,  y: 120,   text: 'Fire exit',        level: 3 },
]

// levelThresholds[i] is the zoom scale at which level (i+2) appears.
const levelThresholds = ref([0.4, 0.8])
const labelBold = ref(true)
const pixelated = ref(true)

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
      Labels have 3 visibility levels gated by zoom.
    </p>

    <div style="display:flex; gap:1.2rem; align-items:center; flex-wrap:wrap; margin:0.5rem 0; font-size:0.85rem; color:#555;">
      <span style="font-weight:600;">Level thresholds:</span>
      <label style="display:flex; align-items:center; gap:0.4rem;">
        L2 ≥ <input type="range" min="0.05" max="2" step="0.05" v-model.number="levelThresholds[0]" />
        <span style="font-variant-numeric:tabular-nums; width:3ch;">{{ levelThresholds[0].toFixed(2) }}</span>
      </label>
      <label style="display:flex; align-items:center; gap:0.4rem;">
        L3 ≥ <input type="range" min="0.1" max="3" step="0.05" v-model.number="levelThresholds[1]" />
        <span style="font-variant-numeric:tabular-nums; width:3ch;">{{ levelThresholds[1].toFixed(2) }}</span>
      </label>
      <label style="display:inline-flex; align-items:center; gap:0.3rem; margin-left:0.5rem;">
        <input type="checkbox" v-model="labelBold" />
        bold
      </label>
      <label style="display:inline-flex; align-items:center; gap:0.3rem;">
        <input type="checkbox" v-model="pixelated" />
        pixelated
      </label>
    </div>

    <CustomMap
      ref="mapRef"
      :imageSrc="imageSrc"
      :origin="origin"
      :annotations="annotations"
      :levelThresholds="levelThresholds"
      :labelBold="labelBold"
      :pixelated="pixelated"
      :showCoordinate="true"
      :coordinatePrecision="1"
      width="100%"
      height="640px"
      @view-change="onViewChange"
    />

    <p v-if="view" style="color:#888; font-size: 0.85rem; margin-top: 0.5rem;">
      scale: {{ view.scale.toFixed(3) }} · L2 {{ view.scale >= levelThresholds[0] ? 'visible' : 'hidden' }} · L3 {{ view.scale >= levelThresholds[1] ? 'visible' : 'hidden' }} · bold: {{ labelBold }}
    </p>
  </div>
</template>
