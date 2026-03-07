import { atom } from 'nanostores'

import { getEmbedParams } from '../embed-params'

const p = getEmbedParams()

export const $hideUI = atom<boolean>(p.hideUI)
export const $cameraControl = atom<boolean>(p.cameraControl)
export const $silenceDing = atom<boolean>(p.silenceDing)
