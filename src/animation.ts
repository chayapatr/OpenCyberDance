import { AnimationClip } from 'three'

// The November 2026 exports are sampled at 24 fps.
export const MOCAP_FPS = 24

// Playback windows exclude the opening and closing calibration poses.
// Starts preserve the extra second after arm lowering approved for the previous exports.
// The END clips retain their recorded ending; neither ends in a T-pose.
export const animationFrameRanges: Record<
  string,
  { start: number; end: number }
> = {
  'v2-models/male-1.glb': { start: 72, end: 3688 },
  'v2-models/male-2.glb': { start: 64, end: 2441 },
  'v2-models/male-3.glb': { start: 70, end: 2413 },
  'v2-models/male-4.glb': { start: 82, end: 2410 },
  'v2-models/male-5.glb': { start: 77, end: 2420 },
  'v2-models/male-6.glb': { start: 70, end: 2354 },
  'v2-models/male-7.glb': { start: 70, end: 2354 },
  'v2-models/male-8.glb': { start: 75, end: 2266 },
  'v2-models/male-9.glb': { start: 89, end: 2423 },
  'v2-models/male-end.glb': { start: 75, end: 2208 },
  'v2-models/female-1.glb': { start: 62, end: 3663 },
  'v2-models/female-2.glb': { start: 64, end: 2428 },
  'v2-models/female-3.glb': { start: 71, end: 2399 },
  'v2-models/female-4.glb': { start: 71, end: 2399 },
  'v2-models/female-5.glb': { start: 71, end: 2417 },
  'v2-models/female-6.glb': { start: 67, end: 2358 },
  'v2-models/female-7.glb': { start: 71, end: 2332 },
  'v2-models/female-8.glb': { start: 64, end: 2270 },
  'v2-models/female-9.glb': { start: 91, end: 2386 },
  'v2-models/female-end.glb': { start: 72, end: 2208 },
}

/** Trim once on loading so startup, seeking and loops share the same timeline. */
export function trimAnimation(
  clip: AnimationClip,
  startTime: number,
  endTime: number,
) {
  const trimmed = clip.clone()
  const duration = endTime - startTime

  for (const track of trimmed.tracks) {
    // Preserve interpolated boundaries even for constant or sparse tracks.
    const interpolant = track.createInterpolant()
    const firstValue = interpolant.evaluate(startTime).slice()
    const lastValue = interpolant.evaluate(endTime).slice()
    const firstKey = track.times.findIndex((time) => time > startTime)
    const endKey = track.times.findIndex((time) => time >= endTime)
    const nextKey = firstKey === -1 ? track.times.length : firstKey
    const lastKey = endKey === -1 ? track.times.length : endKey
    const size = track.getValueSize()
    const remaining = lastKey - nextKey
    const times = new Float32Array(remaining + 2)
    const values = new Float32Array((remaining + 2) * size)
    values.set(firstValue)

    for (let i = 0; i < remaining; i++) {
      times[i + 1] = track.times[nextKey + i] - startTime
    }
    values.set(track.values.subarray(nextKey * size, lastKey * size), size)
    times[times.length - 1] = duration
    values.set(lastValue, values.length - size)

    track.times = times
    track.values = values
  }

  trimmed.duration = duration
  return trimmed
}
