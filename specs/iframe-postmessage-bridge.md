# iframe postMessage Bridge Spec

## Overview

A new `src/iframe-bridge.ts` module that makes the app embeddable in an `<iframe>`. It:

- Listens for `window.addEventListener('message', ...)` from the parent
- Validates and routes messages to existing internals (`runCommand`, transport handlers, `switchDancers`, etc.)
- Emits output events to the parent via `window.parent.postMessage()`

**Security:** Open by default — all origins accepted (`'*'`). No handshake required.

---

## Input Events (parent → iframe)

### `dancer:select`

Select a dancer model and start playing.

```ts
{ type: 'dancer:select', dancer: string }
// dancer: 'male:1'–'male:9', 'female:1'–'female:9'
```

Routes to `switchDancers(dancer)` in `switch-dance.ts`.

---

### Transport Controls

```ts
{ type: 'transport:play' }
{ type: 'transport:pause' }
{ type: 'transport:seek',  time: number }     // seconds
{ type: 'transport:speed', percent: number }  // 0–300
```

- `play` / `pause` → `world.panel.handlers.pause(bool)`
- `seek` → `world.panel.handlers.seek(time)`
- `speed` → `world.panel.handlers.timescale(value)` via `FromPercent.speed(percent)`

---

### Parameter Commands

These mirror the `runCommand(key, args)` interface exactly. All `percent` values match the same
ranges as the UI.

```ts
{ type: 'param:energy',
  part: 'upper' | 'lower' | 'reset',
  percent: number }                          // 0–300

{ type: 'param:curve',
  part: 'body' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg' | 'all',
  percent: number }                          // 0–100

{ type: 'param:shifting',
  part: 'left' | 'right' | 'body',
  percent: number }                          // 0–100

{ type: 'param:space',
  percent: number }                          // 0–100

{ type: 'param:axis',
  percent: number }                          // 0–120

{ type: 'param:rotations',
  axis: 'x' | 'y' | 'z' | 'all' | 'reset',
  percent: number }                          // 0–300
```

Each routes to `runCommand(key, [part/axis, percent.toString()])`.

---

### Reset

Reset all parameters to defaults.

```ts
{
  type: 'reset'
}
```

Routes to `runCommand('reset', [])`.

---

### `config`

Toggle runtime embed options. All fields are optional — only provided fields are updated.

```ts
{
  type: 'config',
  hideUI?: boolean        // show/hide the in-app command UI
  cameraControl?: boolean // enable/disable user camera interaction
  silenceDing?: boolean   // mute/unmute audio dings
}
```

These map directly to the existing `EmbedParams` flags in `embed-params.ts`.

**Reactivity:** `hideUI` and `cameraControl` are currently read once at component init
(`App.vue:44`). To support dynamic toggling, both must be converted from plain values to
**nanostore atoms** (e.g. `$hideUI`, `$cameraControl`, `$silenceDing` in
`src/store/config.ts`), initialized from `getEmbedParams()`. `App.vue` then uses
`useStore($hideUI)` instead of the destructured constant, and `ding.ts` reads `$silenceDing.get()`.

---

## Output Events (iframe → parent)

### `animation:started`

Fires on initial app load (once the first character is ready and playing) **and** after every
`dancer:select` completes (after `fadeIn()` resolves).

```ts
{ type: 'animation:started', dancer: string }
```

### `dancer:select` (output)

Fires whenever the active dancer changes — whether triggered by a `dancer:select` input message
or by the in-app UI. Lets the parent track which model is loaded independently of playback state.

```ts
{ type: 'dancer:select', dancer: string }
```

### `animation:stopped`

Fires when playback is paused (either from `transport:pause` or UI).

```ts
{
  type: 'animation:stopped'
}
```

---

## Stretch Goal: Frame Capture

Capture the rendered canvas and stream frames to the parent for display in a `<canvas>`.

### Input

```ts
// Start capturing at the given rate
{ type: 'frame:start', mode: 'locked' | number }
// 'locked' = every render frame (requestAnimationFrame rate)
// number   = target fps, e.g. 24 or 60 (throttled via elapsed-time check)

// Stop capturing
{ type: 'frame:stop' }
```

### Output

```ts
{ type: 'frame', bitmap: ImageBitmap, timestamp: DOMHighResTimeStamp }
```

`bitmap` is included in the transfer list so it is zero-copy (neutered in the iframe after send).
The parent draws it with `ctx.drawImage(bitmap, 0, 0)` and then calls `bitmap.close()`.

### Mechanism

After `this.renderer.render(scene, camera)` in `world.render()`:

```ts
if (this.bridge?.isCapturing()) {
  const bitmap = canvas.transferToImageBitmap()
  this.bridge.emitFrame(bitmap, performance.now())
}
```

For fps-throttled mode: track `lastEmitTime`, skip if `elapsed < 1000 / targetFps`.

---

## Implementation Plan

### 1. `src/iframe-bridge.ts` — new module

```ts
class IframeBridge {
  constructor(private world: World) {}

  mount(): void // attach window 'message' listener
  unmount(): void // remove listener

  // called by world hooks:
  onAnimationStarted(dancer: string): void
  onAnimationStopped(): void
  isCapturing(): boolean
  emitFrame(bitmap: ImageBitmap, timestamp: number): void

  private dispatch(event: MessageEvent): void // route by type
  private emit(msg: object, transfer?: Transferable[]): void
  // → window.parent.postMessage(msg, '*', transfer)
}

export function createIframeBridge(world: World): IframeBridge
```

### 2. `src/world.ts` — minimal hooks

- End of `switchDancers` / after `fadeIn()` resolves → `this.bridge?.onAnimationStarted(dancer)`
- Initial character load ready → `this.bridge?.onAnimationStarted(initialDancer)`
- `pause` handler when pausing → `this.bridge?.onAnimationStopped()`
- In `render()` after `renderer.render(...)` → frame capture call (behind `isCapturing()` guard)

### 3. `src/store/config.ts` — new reactive config store

```ts
import { atom } from 'nanostores'
import { getEmbedParams } from '../embed-params'

const p = getEmbedParams()
export const $hideUI = atom<boolean>(p.hideUI)
export const $cameraControl = atom<boolean>(p.cameraControl)
export const $silenceDing = atom<boolean>(p.silenceDing)
```

- `App.vue` replaces `const { hideUI, cameraControl } = getEmbedParams()` with
  `useStore($hideUI)` / `useStore($cameraControl)`
- `ding.ts` replaces `getEmbedParams().silenceDing` with `$silenceDing.get()`
- `iframe-bridge.ts` handles `config` by calling `$hideUI.set(...)` etc.

### 4. `src/main.ts` — wire up

```ts
const bridge = createIframeBridge(world)
bridge.mount()
```

---

## TypeScript Types Reference

```ts
// ---- Input ----
type DancerSelectMsg = { type: 'dancer:select'; dancer: string }
type TransportMsg =
  | { type: 'transport:play' | 'transport:pause' }
  | { type: 'transport:seek'; time: number }
  | { type: 'transport:speed'; percent: number }
type ParamEnergyMsg = {
  type: 'param:energy'
  part: EnergyPart
  percent: number
}
type ParamCurveMsg = { type: 'param:curve'; part: CurvePart; percent: number }
type ParamShiftingMsg = {
  type: 'param:shifting'
  part: ShiftingPart
  percent: number
}
type ParamSpaceMsg = { type: 'param:space'; percent: number }
type ParamAxisMsg = { type: 'param:axis'; percent: number }
type ParamRotationsMsg = {
  type: 'param:rotations'
  axis: RotationAxis
  percent: number
}
type ResetMsg = { type: 'reset' }
type ConfigMsg = {
  type: 'config'
  hideUI?: boolean
  cameraControl?: boolean
  silenceDing?: boolean
}
type FrameStartMsg = { type: 'frame:start'; mode: 'locked' | number }
type FrameStopMsg = { type: 'frame:stop' }

type InboundMsg =
  | DancerSelectMsg
  | TransportMsg
  | ParamEnergyMsg
  | ParamCurveMsg
  | ParamShiftingMsg
  | ParamSpaceMsg
  | ParamAxisMsg
  | ParamRotationsMsg
  | ResetMsg
  | ConfigMsg
  | FrameStartMsg
  | FrameStopMsg

// ---- Output ----
type DancerSelectOutMsg = { type: 'dancer:select'; dancer: string }
type AnimationStartedMsg = { type: 'animation:started'; dancer: string }
type AnimationStoppedMsg = { type: 'animation:stopped' }
type FrameMsg = { type: 'frame'; bitmap: ImageBitmap; timestamp: number }

type OutboundMsg =
  | DancerSelectOutMsg
  | AnimationStartedMsg
  | AnimationStoppedMsg
  | FrameMsg
```

---

## Parent-Side Usage Example

```html
<iframe id="dancer" src="https://example.com/dancer" allow="autoplay"></iframe>

<canvas id="output"></canvas>

<script>
  const frame = document.getElementById('dancer')
  const canvas = document.getElementById('output')
  const ctx = canvas.getContext('2d')

  // Send commands
  frame.contentWindow.postMessage(
    { type: 'dancer:select', dancer: 'female:3' },
    '*',
  )
  frame.contentWindow.postMessage({ type: 'transport:play' }, '*')
  frame.contentWindow.postMessage(
    { type: 'param:energy', part: 'upper', percent: 150 },
    '*',
  )

  // Enable frame streaming at 30fps
  frame.contentWindow.postMessage({ type: 'frame:start', mode: 30 }, '*')

  // Receive events
  window.addEventListener('message', (e) => {
    if (e.data.type === 'animation:started') {
      console.log('playing', e.data.dancer)
    }
    if (e.data.type === 'frame') {
      canvas.width = e.data.bitmap.width
      canvas.height = e.data.bitmap.height
      ctx.drawImage(e.data.bitmap, 0, 0)
      e.data.bitmap.close()
    }
  })
</script>
```
