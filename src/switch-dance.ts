import { Character, CharacterKey, ModelKey } from './character'
import { world } from './world'

export async function switchDancers(key: string) {
  const v2Match = /^(male|female):([1-9])$/.exec(key)
  if (!v2Match) return

  const modelKey = `${v2Match[1]}-${v2Match[2]}` as ModelKey

  if (!Character.sources[modelKey]) {
    console.error(`v2 model ${modelKey} not found`)
    return
  }

  await world.fadeOut()

  for (const character of world.characters) {
    const name = character.options.name

    character.options.model = modelKey
    character.options.action = null
    world.params.characters[name].model = modelKey
    world.params.characters[name].action = null

    await changeCharacter(name)
  }

  await world.fadeIn()

  world.bridge?.onDancerSelect(key)
  world.bridge?.onAnimationStarted(key)
}

export async function changeCharacter(name: CharacterKey) {
  const char = world.characterByName(name)
  if (!char) return

  // Teardown and reset the character.
  char.teardown()

  await char.reset()

  // !!! IMPORTANT: positioning lock will not apply if we did not update the parameter once!
  char.updateParams()
}

/**
 * !! THIS IS ONLY USED BY THE INSPECTION PANEL !!!
 *
 * Don't worry about this.
 */
export function changeAction(name: CharacterKey) {
  const action = world.params.characters[name].action
  const character = world.characterByName(name)
  if (!character || !action) return

  character.playByName(action)
}
