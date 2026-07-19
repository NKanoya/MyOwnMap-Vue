import CustomMap from './components/CustomMap.vue'
import { useMapTransform } from './composables/useMapTransform.js'

export { CustomMap, useMapTransform }

// Optional one-call install: registers the component globally.
export function install(app) {
  app.component('CustomMap', CustomMap)
}
