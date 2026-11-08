import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  AnimationClip,
  AnimationMixer,
  Object3D,
  Vector3,
  VectorKeyframeTrack,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { animationFrameRanges, trimAnimation } from '../src/animation.ts'

test('trimming preserves interpolated and constant tracks and loops on the new timeline', () => {
  const clip = new AnimationClip('dance', 10, [
    new VectorKeyframeTrack(
      'dancer.position',
      [0, 5, 10],
      [0, 0, 0, 5, 0, 0, 10, 0, 0],
    ),
    new VectorKeyframeTrack('dancer.scale', [0], [1, 1, 1]),
  ])
  const trimmed = trimAnimation(clip, 2, 8)
  assert.equal(clip.duration, 10)
  assert.equal(clip.tracks[0].times[0], 0)
  assert.equal(trimmed.duration, 6)
  assert.deepEqual([...trimmed.tracks[0].times], [0, 3, 6])
  assert.deepEqual([...trimmed.tracks[0].values], [2, 0, 0, 5, 0, 0, 8, 0, 0])
  assert.deepEqual([...trimmed.tracks[1].times], [0, 6])
  assert.deepEqual([...trimmed.tracks[1].values], [1, 1, 1, 1, 1, 1])

  const dancer = new Object3D()
  dancer.name = 'dancer'
  const mixer = new AnimationMixer(dancer)
  mixer.clipAction(trimmed).play()
  mixer.update(0)
  assert.equal(dancer.position.x, 2)
  mixer.setTime(6.04)
  assert.ok(Math.abs(dancer.position.x - 2.04) < 1e-5)
  mixer.setTime(0)
  assert.equal(dancer.position.x, 2)
})

test('all 20 files start outside the recorded T-pose and retain every track', async () => {
  assert.equal(Object.keys(animationFrameRanges).length, 20)
  for (const [source, { start, end }] of Object.entries(animationFrameRanges)) {
    const bytes = await readFile(
      new URL(`../public/${source}`, import.meta.url),
    )
    const gltf = await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      '',
    )
    const clip = gltf.animations[0]
    const trimmed = trimAnimation(clip, start / 25, end / 25)
    assert.equal(trimmed.tracks.length, clip.tracks.length, source)
    assert.ok(Math.abs(trimmed.duration - (end - start) / 25) < 1e-5, source)
    let maxEndArmAngle = 0
    trimmed.tracks.forEach((track, i) => {
      assert.equal(track.times[0], 0, `${source}: ${track.name}`)
      assert.ok(track.validate(), `${source}: ${track.name}`)
      const original = clip.tracks[i]
      const expected = original.createInterpolant().evaluate(start / 25)
      const size = track.getValueSize()
      const expectedEnd = original.createInterpolant().evaluate(end / 25)
      for (let j = 0; j < size; j++) {
        assert.ok(
          Math.abs(
            track.values[track.values.length - size + j] - expectedEnd[j],
          ) < 1e-5,
          `${source}: ending ${track.name}`,
        )
      }
      for (let j = 0; j < size; j++) {
        assert.ok(
          Math.abs(track.values[j] - expected[j]) < 1e-5,
          `${source}: ${track.name}`,
        )
      }
      if (/^(Left|Right)(Arm|ForeArm)\.quaternion$/.test(track.name)) {
        let endDot = 0
        for (let j = 0; j < 4; j++) {
          endDot +=
            original.values[j] * track.values[track.values.length - 4 + j]
        }
        maxEndArmAngle = Math.max(
          maxEndArmAngle,
          2 * Math.acos(Math.min(1, Math.abs(endDot))),
        )
      }
    })
    const mixer = new AnimationMixer(gltf.scene)
    mixer.clipAction(trimmed).play()
    mixer.update(0)
    gltf.scene.updateMatrixWorld(true)
    const handDrops = ['Left', 'Right'].map((side) => {
      const arm = gltf.scene
        .getObjectByName(`${side}Arm`)!
        .getWorldPosition(new Vector3())
      const elbow = gltf.scene
        .getObjectByName(`${side}ForeArm`)!
        .getWorldPosition(new Vector3())
      const hand = gltf.scene
        .getObjectByName(`${side}Hand`)!
        .getWorldPosition(new Vector3())
      return (arm.y - hand.y) / (arm.distanceTo(elbow) + elbow.distanceTo(hand))
    })
    // Inspect the actual pose: local quaternion changes also include arm twisting.
    assert.ok(
      Math.max(...handDrops) > 0.8,
      `${source}: hands still near calibration height`,
    )

    assert.ok(
      maxEndArmAngle >= Math.PI / 6,
      `${source}: still in closing T-pose`,
    )
  }
})
