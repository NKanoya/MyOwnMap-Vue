import CustomMap from './components/CustomMap.vue'
import { useMapTransform } from './composables/useMapTransform.js'

export { CustomMap, useMapTransform }

// Optional one-call install: registers the component globally and, if a
// PrimeVue instance is passed, wires up the theme the controls rely on.
export function install(app, opts = {}) {
  app.component('CustomMap', CustomMap)
  if (opts.primevuePlugin) app.use(opts.primevuePlugin)
}
