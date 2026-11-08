import { AnimationClip } from 'three'

// Playback windows at 25 fps, excluding the opening and closing calibration poses.
// Starts include an extra 25 frames (one second) after the initial calibration cutoff.
// The END clips retain their recorded ending; neither ends in a T-pose.
export const animationFrameRanges: Record<
  string,
  { start: number; end: number }
> = {
  'v2-models/male-1.glb': { start: 74, end: 3842 },
  'v2-models/male-2.glb': { start: 66, end: 2543 },
  'v2-models/male-3.glb': { start: 72, end: 2514 },
  'v2-models/male-4.glb': { start: 85, end: 2511 },
  'v2-models/male-5.glb': { start: 80, end: 2521 },
  'v2-models/male-6.glb': { start: 72, end: 2453 },
  'v2-models/male-7.glb': { start: 72, end: 2453 },
  'v2-models/male-8.glb': { start: 78, end: 2361 },
  'v2-models/male-9.glb': { start: 92, end: 2524 },
  'v2-models/male-end.glb': { start: 78, end: 2300 },
  'v2-models/female-1.glb': { start: 64, end: 3816 },
  'v2-models/female-2.glb': { start: 66, end: 2530 },
  'v2-models/female-3.glb': { start: 73, end: 2499 },
  'v2-models/female-4.glb': { start: 73, end: 2499 },
  'v2-models/female-5.glb': { start: 73, end: 2518 },
  'v2-models/female-6.glb': { start: 69, end: 2457 },
  'v2-models/female-7.glb': { start: 73, end: 2430 },
  'v2-models/female-8.glb': { start: 66, end: 2365 },
  'v2-models/female-9.glb': { start: 94, end: 2486 },
  'v2-models/female-end.glb': { start: 74, end: 2300 },
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
