import 'animate.css'
import 'virtual:uno.css'
import './main.css'

import { devtools } from '@nanostores/vue/devtools'
import { createApp } from 'vue'

// @ts-expect-error - vue root import
import App from './view/App.vue'
import { createIframeBridge } from './iframe-bridge'
import { world } from './world'

const bridge = createIframeBridge(world)
bridge.mount()
world.bridge = bridge

export const app = createApp(App)
app.use(devtools, {})

app.mount('#app')
