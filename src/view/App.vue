<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useStore } from '@nanostores/vue'

import {
  $showPrompt,
  $valueCompleted,
  extendPromptTimeout,
  clearPromptTimeout,
  resetPrompt,
  $nonFinalNum,
  handleVoiceSelection,
  $dancesSelected,
  setChoice,
} from '../store/choice'

import { world } from '../world'

import StepPrompt from './StepPrompt.vue'
import { soundManager } from '../ding.ts'
import StageControl from './StageControl.vue'

import { $currentScene } from '../store/scene'
import { getEmbedParams } from '../embed-params'

const showPrompt = useStore($showPrompt)
const dancesSelected = useStore($dancesSelected)

const rendererElement = ref<HTMLDivElement>()
const isLoading = ref(true)
let show = () => {
  console.log('hello!')
}

const selectDances = () => {
  resetPrompt()
  setChoice('dances')
  soundManager.play()
  $showPrompt.set(true)
  extendPromptTimeout('select dances', true)
}
// const plotterContainer = ref<HTMLDivElement>()

const { hideUI, showDebugStatusLine, showDebugInspector } = getEmbedParams()

onMounted(async () => {
  await world.setup()
  isLoading.value = false

  show = async () => {
    console.log('start')
    if (world.isEnding && world.flags.waitingEndingStart) {
      return
    }

    const willVisible = !showPrompt.value

    const completed = $valueCompleted.get()

    if (completed) {
      soundManager.play()
      // world.voice.enableVoice('prompt completed')
      resetPrompt()
      $showPrompt.set(true)

      return
    }

    resetPrompt()

    if (willVisible) {
      soundManager.play()
      // world.voice.enableVoice('prompt activated')
      $showPrompt.set(true)

      // start the prompt timeout countdown
      extendPromptTimeout('prompt activated', true)
    } else {
      world.voice.stop()
      $showPrompt.set(false)

      clearPromptTimeout('prompt deactivated')
    }
  }

  window.addEventListener('keydown', async (event) => {
    if (event.key === ' ' || event.key === 'PageDown') {
      if (world.isEnding && world.flags.waitingEndingStart) {
        return
      }

      const willVisible = !showPrompt.value

      const completed = $valueCompleted.get()

      if (completed) {
        soundManager.play()
        world.voice.enableVoice('prompt completed')
        resetPrompt()
        $showPrompt.set(true)

        return
      }

      resetPrompt()

      if (willVisible) {
        soundManager.play()
        world.voice.enableVoice('prompt activated')
        $showPrompt.set(true)

        // start the prompt timeout countdown
        extendPromptTimeout('prompt activated', true)
      } else {
        world.voice.stop()
        $showPrompt.set(false)

        clearPromptTimeout('prompt deactivated')
      }
    }

    if (showDebugInspector && event.key === 'i') {
      if (world.panel.panel._hidden) {
        world.panel.panel.show(true)
      } else {
        world.panel.panel.hide()
      }
    }

    if (showDebugInspector && event.key === 'c') {
      world.setupControls()
    }

    // if (event.key === 'k') {
    //   const cam = world.camera
    //   if (!cam) return

    //   const output = JSON.stringify({
    //     position: cam.position.toArray(),
    //     rotation: cam.rotation.toArray(),
    //     zoom: cam.zoom,
    //   })

    //   navigator.clipboard.writeText(output)
    // }

    if ((event.key === 'e' || event.key === 'ำ') && event.ctrlKey) {
      if (world.flags.waitingEndingStart) {
        world.fadeInSceneContent()

        world.flags.waitingEndingStart = false
        return
      }

      if (world.isEnding) return $currentScene.set('BLACK')

      $currentScene.set('ENDING')
    }

    if ((event.key === 'u' || event.key === 'ี') && event.ctrlKey) {
      world.startShadowCharacter()
    }

    if ((event.key === 'i' || event.key === 'ร') && event.ctrlKey) {
      world.startDissolveCharacter()
    }

    if (event.key === 'f' && event.ctrlKey) {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen()
      } else if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }

    if (event.key === 'j' && event.ctrlKey) {
      console.log(`FORCE RESTART RECOGNIZER`)
      world.voice.stop()

      setTimeout(() => {
        world.voice.startRecognition('FORCE RESTART')
      }, 50)
    }

    if (event.key === 'k' && event.ctrlKey) {
      console.log(`FORCE STOP RECOGNIZER`)
      world.voice.stop()
    }

    if (event.key === 'l' && event.ctrlKey) {
      const nfn = $nonFinalNum.get()
      console.log(`INSERT NONFINAL NUM: ${nfn}`)

      if (nfn !== null) {
        handleVoiceSelection(nfn)
      }
    }
  })

  rendererElement.value?.appendChild(world.renderer.domElement)

  // if (world.plotter.domElement) {
  //   plotterContainer.value?.appendChild(world.plotter.domElement)
  // }

  world.render()
})
</script>

<template>
  <div class="app-container">
    <div class="backdrop" />
    <div class="renderer-container" ref="rendererElement" />

    <!-- <div ref="plotterContainer" pointer-events-none /> -->

    <div
      v-if="isLoading"
      class="fixed inset-0 flex items-center justify-center z-10"
    >
      <div class="flex flex-col items-center gap-3 text-white text-opacity-60">
        <div class="w-8 h-8 border-2 border-white border-t-transparent rounded-full rotating" />
        <span class="text-sm opacity-60">Loading...</span>
      </div>
    </div>

    <StepPrompt v-if="showPrompt && !hideUI" />

    <StageControl v-if="showDebugStatusLine" />

    <div class="fixed w-screen h-screen m-4" v-if="!hideUI">
      <button
        @click="dancesSelected ? show() : selectDances()"
        class="border-0 lg:text-4 bg-neutral-900 bg-black text-white px-4 py-2 hover:bg-neutral-800 hover:cursor-pointer"
      >
        {{ dancesSelected ? 'Add Command' : 'Select Dances' }}
      </button>
    </div>
  </div>
</template>
