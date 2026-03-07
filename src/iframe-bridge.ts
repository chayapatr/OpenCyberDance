import { runCommand } from './command'
import { $cameraControl, $hideUI, $silenceDing } from './store/config'
import { switchDancers } from './switch-dance'
import { World } from './world'

export class IframeBridge {
  private capturing = false
  private captureMode: 'locked' | number = 'locked'
  private lastEmitTime = 0
  private readonly handler = this.dispatch.bind(this)

  constructor(private world: World) {}

  mount() {
    // window.addEventListener('message', this.handler)
  }

  unmount() {
    // window.removeEventListener('message', this.handler)
  }

  // --- hooks called by world / switch-dance ---

  onAnimationStarted(dancer: string) {
    this.emit({ type: 'animation:started', dancer })
  }

  onAnimationStopped() {
    this.emit({ type: 'animation:stopped' })
  }

  onDancerSelect(dancer: string) {
    this.emit({ type: 'dancer:select', dancer })
  }

  // --- frame capture ---

  isCapturing() {
    return this.capturing
  }

  captureFrame(canvas: HTMLCanvasElement) {
    if (!this.capturing) return

    const now = performance.now()

    if (this.captureMode !== 'locked') {
      if (now - this.lastEmitTime < 1000 / this.captureMode) return
    }

    this.lastEmitTime = now

    createImageBitmap(canvas).then((bitmap) => {
      this.emit({ type: 'frame', bitmap, timestamp: now }, [bitmap])
    })
  }

  // --- inbound message dispatch ---

  private dispatch(event: MessageEvent) {
    const msg = event.data
    if (!msg || typeof msg.type !== 'string') return

    const { type } = msg

    switch (type) {
      case 'dancer:select':
        switchDancers(msg.dancer)
        break

      case 'transport:play':
        this.world.params.paused = false
        this.world.panel.handlers.pause(false)
        break

      case 'transport:pause':
        this.world.params.paused = true
        this.world.panel.handlers.pause(true)
        break

      case 'transport:seek':
        this.world.params.time = msg.time
        this.world.panel.handlers.seek(msg.time)
        break

      case 'transport:speed':
        this.world.panel.handlers.timescale(msg.percent)
        break

      case 'param:energy':
        runCommand('energy', [msg.part, String(msg.percent)], { silent: true })
        break

      case 'param:curve':
        runCommand('curve', [msg.part, String(msg.percent)], { silent: true })
        break

      case 'param:shifting':
        runCommand('shifting', [msg.part, String(msg.percent)], {
          silent: true,
        })
        break

      case 'param:space':
        runCommand('space', [String(msg.percent)], { silent: true })
        break

      case 'param:axis':
        runCommand('axis', [String(msg.percent)], { silent: true })
        break

      case 'param:rotations':
        runCommand('rotations', [msg.axis, String(msg.percent)], {
          silent: true,
        })
        break

      case 'reset':
        runCommand('reset', [], { silent: true })
        break

      case 'config':
        if (typeof msg.hideUI === 'boolean') $hideUI.set(msg.hideUI)
        if (typeof msg.cameraControl === 'boolean')
          $cameraControl.set(msg.cameraControl)
        if (typeof msg.silenceDing === 'boolean')
          $silenceDing.set(msg.silenceDing)
        break

      case 'frame:start':
        this.capturing = true
        this.captureMode = msg.mode
        this.lastEmitTime = 0
        break

      case 'frame:stop':
        this.capturing = false
        break
    }
  }

  private emit(msg: object, transfer: Transferable[] = []) {
    window.parent.postMessage(msg, '*', transfer)
  }
}

export function createIframeBridge(world: World): IframeBridge {
  return new IframeBridge(world)
}
