# API Reference

## URL / Embed Parameters

Pass these as query string parameters when embedding the app in an `<iframe>`.

```html
<iframe
  src="https://example.com/?dancer=male:3&hide_ui=true&silence_ding=true"
></iframe>
```

| Parameter           | Type    | Default | Description                                                      |
| ------------------- | ------- | ------- | ---------------------------------------------------------------- |
| `dancer`            | string  | —       | Initial dancer. Format: `male:1`–`male:9`, `female:1`–`female:9` |
| `hide_ui`           | boolean | `false` | Hide the in-app command UI                                       |
| `camera_control`    | boolean | `false` | Enable user camera interaction                                   |
| `silence_ding`      | boolean | `false` | Mute audio dings                                                 |
| `speak`             | boolean | `false` | Enable text-to-speech output                                     |
| `listen`            | boolean | `false` | Enable voice recognition input                                   |
| `message`           | boolean | `false` | Enable the postMessage API (disabled by default)                 |
| `debug_status_line` | boolean | `false` | Show debug status line                                           |
| `debug_inspector`   | boolean | `false` | Show debug inspector panel                                       |

Boolean parameters accept `true` or `1`.

---

## postMessage API

> **Requires `?message=1`** in the embed URL. The message handler is disabled by default.

The embed accepts messages from the parent window and emits events back. All messages use structured
JSON objects with a `type` field.

**Sending to the embed:**

```js
iframe.contentWindow.postMessage({ type: '...' }, '*')
```

**Receiving from the embed:**

```js
window.addEventListener('message', (e) => {
  if (e.data.type === '...') { ... }
})
```

---

## Input Events (parent → iframe)

### `dancer:select`

Load and play a dancer model.

```js
{ type: 'dancer:select', dancer: 'male:3' }
// dancer: 'male:1'–'male:9' | 'female:1'–'female:9'
```

---

### Transport Controls

```js
{ type: 'transport:play' }
{ type: 'transport:pause' }
{ type: 'transport:seek',  time: number }     // position in seconds
{ type: 'transport:speed', percent: number }  // 0–300 (100 = normal speed)
```

---

### Parameter Commands

Fine-grained animation parameter control. `percent` ranges match the in-app UI sliders.

```js
// Energy — affects animation intensity per body region
{ type: 'param:energy', part: 'upper' | 'lower' | 'reset', percent: number } // 0–300

// Circle and curve — affects curve filtering per body part
{ type: 'param:curve', part: 'body' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg' | 'all', percent: number } // 0–100

// Shifting relations — offsets animation timing per limb group
{ type: 'param:shifting', part: 'left' | 'right' | 'body', percent: number } // 0–100

// External body space — modulates overall movement amplitude
{ type: 'param:space', percent: number } // 0–100

// Axis point — adjusts the axis frequency
{ type: 'param:axis', percent: number } // 0–120

// Rotations — scales rotation on a given axis
{ type: 'param:rotations', axis: 'x' | 'y' | 'z' | 'all' | 'reset', percent: number } // 0–300
```

---

### `reset`

Reset all animation parameters to their defaults.

```js
{
  type: 'reset'
}
```

---

### `config`

Toggle embed options at runtime. All fields are optional.

```js
{
  type: 'config',
  hideUI?: boolean        // show/hide the in-app command UI
  cameraControl?: boolean // enable/disable user camera interaction
  silenceDing?: boolean   // mute/unmute audio dings
}
```

---

### Frame Capture _(stretch goal)_

Stream the rendered canvas to the parent as transferable `ImageBitmap` frames.

```js
// Start streaming
{ type: 'frame:start', mode: 'locked' | number }
// 'locked' = every render frame; number = target fps (e.g. 24, 30, 60)

// Stop streaming
{ type: 'frame:stop' }
```

---

## Output Events (iframe → parent)

### `animation:started`

Fires when the animation begins playing — on initial load and after each `dancer:select`.

```js
{ type: 'animation:started', dancer: string }
```

### `dancer:select`

Fires whenever the active dancer changes (via postMessage or in-app UI).

```js
{ type: 'dancer:select', dancer: string }
```

### `animation:stopped`

Fires when playback is paused.

```js
{
  type: 'animation:stopped'
}
```

### `frame` _(stretch goal)_

One frame of the rendered canvas, emitted at the configured rate.
`bitmap` is a transferable — call `bitmap.close()` after drawing it.

```js
{ type: 'frame', bitmap: ImageBitmap, timestamp: DOMHighResTimeStamp }
```

---

## Full Example

```html
<iframe
  id="dancer"
  src="https://example.com/?hide_ui=true&silence_ding=true&message=1"
></iframe>
<canvas id="output"></canvas>

<script>
  const iframe = document.getElementById('dancer')
  const canvas = document.getElementById('output')
  const ctx = canvas.getContext('2d')

  // Select dancer and configure
  iframe.contentWindow.postMessage(
    { type: 'dancer:select', dancer: 'female:3' },
    '*',
  )
  iframe.contentWindow.postMessage(
    { type: 'param:energy', part: 'upper', percent: 150 },
    '*',
  )
  iframe.contentWindow.postMessage(
    { type: 'transport:speed', percent: 80 },
    '*',
  )

  // Stream frames at 30fps
  iframe.contentWindow.postMessage({ type: 'frame:start', mode: 30 }, '*')

  // Listen for events
  window.addEventListener('message', (e) => {
    switch (e.data.type) {
      case 'animation:started':
        console.log('playing:', e.data.dancer)
        break
      case 'dancer:select':
        console.log('dancer changed to:', e.data.dancer)
        break
      case 'animation:stopped':
        console.log('paused')
        break
      case 'frame':
        canvas.width = e.data.bitmap.width
        canvas.height = e.data.bitmap.height
        ctx.drawImage(e.data.bitmap, 0, 0)
        e.data.bitmap.close()
        break
    }
  })
</script>
```
