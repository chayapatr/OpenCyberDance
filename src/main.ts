import 'animate.css'
import 'virtual:uno.css'
import './main.css'

import { devtools } from '@nanostores/vue/devtools'
import { createApp } from 'vue'

import { getEmbedParams } from './embed-params'
import { createIframeBridge } from './iframe-bridge'
import App from './view/App.vue'
import { world } from './world'

// Iframe bridge is only for external iframe integration.
if (getEmbedParams().messageEnabled) {
  const bridge = createIframeBridge(world)
  bridge.mount()

  world.bridge = bridge
}

export const app = createApp(App)
app.use(devtools, {})

app.mount('#app')
