<script lang="ts" setup>
import { ref, onMounted, ReactiveFlags } from 'vue'
import { useStore } from '@nanostores/vue'

import {
  $showPrompt,
  $valueCompleted,
  extendPromptTimeout,
  clearPromptTimeout,
  resetPrompt,
  $nonFinalNum,
  handleVoiceSelection,
} from '../store/choice'

import { world } from '../world'

import StepPrompt from './StepPrompt.vue'
import { ding, soundManager } from '../ding.ts'
import StageControl from './StageControl.vue'

import { EndingKeyframes } from '../character'
import { $currentScene } from '../store/scene'

const showPrompt = useStore($showPrompt)

const rendererElement = ref<HTMLDivElement>()
let show = () => {
  console.log("hello!")
}
// const plotterContainer = ref<HTMLDivElement>()

onMounted(async () => {
  await world.preload()
  await world.setup()

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

    // if (event.key === 'i') {
    //   if (world.panel.panel._hidden) {
    //     world.panel.panel.show(true)
    //   } else {
    //     world.panel.panel.hide()
    //   }
    // }

    // if (event.key === 'c') {
    //   world.setupControls()
    // }

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

    <StepPrompt v-if="showPrompt" />
    <StageControl />

    <div class="fixed w-screen h-screen m-4">
      <button @click="show" class="border-0 lg:text-4 bg-neutral-900 bg-black text-white px-4 py-2 hover:bg-neutral-800 hover:cursor-pointer">
        Add Command
      </button>
    </div>
  </div>

</template>