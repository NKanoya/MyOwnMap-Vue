import MyOwnMap from './components/MyOwnMap.vue'
import { useMapTransform } from './composables/useMapTransform.js'

export { MyOwnMap, useMapTransform }

// Optional one-call install: registers the component globally.
export function install(app) {
  app.component('MyOwnMap', MyOwnMap)
}
