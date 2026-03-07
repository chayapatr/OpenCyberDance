import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

export class ModelPreloader {
  models: Map<string, GLTF> = new Map()
  private pending: Map<string, Promise<GLTF | null>> = new Map()

  public async getOrLoad(source: string): Promise<GLTF | null> {
    const cached = this.models.get(source)
    if (cached) return cached

    const inFlight = this.pending.get(source)
    if (inFlight) return inFlight

    const promise = this.load(source)
    this.pending.set(source, promise)

    const result = await promise
    this.pending.delete(source)

    return result
  }

  private async load(source: string): Promise<GLTF | null> {
    try {
      const now = performance.now()

      const draco = new DRACOLoader()
      draco.setDecoderPath(`https://www.gstatic.com/draco/v1/decoders/`)
      draco.preload()

      const loader = new GLTFLoader()
      loader.setDRACOLoader(draco)

      const path = source.includes('/') ? `/${source}` : `/models/${source}`
      const model = await loader.loadAsync(path)

      this.models.set(source, model)

      const time = (performance.now() - now).toFixed(2)
      console.log(`-- loaded ${source} in ${time}ms --`)

      return model
    } catch (error) {
      console.error(`-- failed to load ${source} --`, error)
      return null
    }
  }
}

export const preloader = new ModelPreloader()
