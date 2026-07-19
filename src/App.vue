<script setup>
import { ref, h, defineComponent } from 'vue'
import MyOwnMap from './components/MyOwnMap.vue'

// Test image lives in public/maps/ and is git-ignored — swap in your own.
const imageSrc = '/maps/test.png'

// Origin: some pixel on the image that user-space (0,0) maps to.
const origin = { x: 800, y: 500 }

// Style groups (index into the `styles` prop). Independent of `level`.
// Anything omitted falls back to the component defaults (white, 14px, bold, outlined).
const styles = [
  {}, // 0: unused
  { fontSize: 20, color: '#fde047' }, // 1: 亮黄大字
  { color: '#86efac' }, // 2: 薄荷绿，字号/字重沿用默认
  { color: '#ffffff', stroke: 'none', textShadow: 'none', fontWeight: 400 }, // 3: 无描边白字
  { iconBg: '#1a1a1a', iconColor: '#fde047' }, // 4: 暗底图标 + 黄色图标
]

// Annotations in user coordinates (+x right, +y down, image-pixel units).
// level: -1 = always visible (default) · 0 = thresholds[0] · 1 = thresholds[1].
// style: index into `styles`, -1 = default style.
const annotations = [
  { id: 1, x: -1200, y: -900,  text: 'Zone North-West',  level: -1, style: 1, icon: { lucide: 'Home' } },
  { id: 2, x: 1100,  y: -800,  text: 'Zone North-East',  level: -1, style: 1, icon: { lucide: 'MapPin' } },
  { id: 3, x: -1300, y: 700,   text: 'Zone\nSouth-West', level: -1, style: 2 },
  { id: 4, x: 1200,  y: 600,   text: 'Zone South-East',  level: -1, style: 2 },
  { id: 5, x: 0,     y: 0,     text: 'Origin',           level: -1, style: -1 },
  { id: 6, x: -400,  y: -260,  text: 'Hall A',           level:  0, style: -1 },
  { id: 7, x: 380,   y: -200,  text: 'Hall B',           level:  0, style: -1, icon: { lucide: 'Plane' } },
  { id: 8, x: -300,  y: 260,   text: 'Garden',           level:  0, style: 2, icon: { lucide: 'Bookmark' } },
  { id: 9, x: 420,   y: 200,   text: 'Cafeteria',        level:  0, style: 1 },
  { id: 10, x: -120, y: -60,   text: 'Reception\ndesk',  level:  1, style: 1, icon: { lucide: 'Building' } },
  { id: 11, x: 140,  y: 40,    text: 'Storage room',     level:  1, style: 2 },
  { id: 12, x: -40,  y: 120,   text: 'Fire exit',        level:  1, style: 4 },
]

// levelThresholds[i] is the zoom scale at which level i appears (-1 = always).
const levelThresholds = ref([0.4, 0.8])

// Icon resolver — wire any icon library without shipping it in the bundle.
// Here's a Lucide-style mock: the annotation says {lucide: 'Home'} and we map
// it to a Vue component. Swap the body with lucide-vue-next / heroicons / etc.
// h()-based icon components (no template compiler needed at runtime)
const svg = (attrs, children) => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, ...attrs }, children);
const lucideIcons = {
  Home: defineComponent({ render: () => svg({}, [h('path', { d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' })]) }),
  Plane: defineComponent({ render: () => svg({}, [h('path', { d: 'M14.5 6.5l3-3 3 3-3 3-3-3z' }), h('path', { d: 'M2 12h20M12 2v20' })]) }),
  Bookmark: defineComponent({ render: () => svg({}, [h('path', { d: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z' })]) }),
  MapPin: defineComponent({ render: () => svg({}, [h('path', { d: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z' }), h('circle', { cx: 12, cy: 10, r: 3 })]) }),
  Building: defineComponent({ render: () => svg({}, [h('rect', { x: 4, y: 2, width: 16, height: 20, rx: 2 }), h('path', { d: 'M9 22v-4h6v4M8 6h.01M16 6h.01' })]) }),
}
// Supports both {lucide:'Home'} (returns bare component) and
// 'lucide:book-marked' (returns {component, props}) — matching the
// <Icon name="lucide:..." /> pattern used in the host project.
// Stand-in for the host project's globally-registered <Icon name="lucide:..." />
const Icon = null
const getIcon = (desc) => {
  if (typeof desc === 'string') {
    return Icon ? { component: Icon, props: { name: desc } } : null
  }
  if (desc?.lucide && lucideIcons[desc.lucide]) {
    return lucideIcons[desc.lucide]  // the defineComponent(...) component
  }
  return null
}
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
    <h1 style="margin-bottom: 0.25rem;">MyOwnMap demo</h1>
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

    <MyOwnMap
      ref="mapRef"
      :imageSrc="imageSrc"
      :origin="origin"
      :annotations="annotations"
      :levelThresholds="levelThresholds"
      :labelBold="labelBold"
      :pixelated="pixelated"
      :styles="styles"
      :icons="getIcon"
      :showCoordinate="true"
      :coordinatePrecision="1"
      width="100%"
      height="640px"
      @view-change="onViewChange"
    />

    <p v-if="view" style="color:#888; font-size: 0.85rem; margin-top: 0.5rem;">
      scale: {{ view.scale.toFixed(3) }} · L0 {{ view.scale >= levelThresholds[0] ? 'visible' : 'hidden' }} · L1 {{ view.scale >= levelThresholds[1] ? 'visible' : 'hidden' }} · bold: {{ labelBold }}
    </p>
  </div>
</template>
