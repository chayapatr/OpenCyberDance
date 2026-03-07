interface EmbedParams {
  speakEnabled: boolean
  listenEnabled: boolean
  hideUI: boolean
  showDebugStatusLine: boolean
  showDebugInspector: boolean
  dancer: string | null
  cameraControl: boolean
  silenceDing: boolean
}

export const getEmbedParams = (): EmbedParams => {
  const param = new URLSearchParams(window.location.search)

  const check = (key: string) => {
    const value = param.get(key)

    return value === 'true' || value === '1'
  }

  return {
    speakEnabled: check('speak'),
    listenEnabled: check('listen'),
    hideUI: check('hide_ui'),
    showDebugStatusLine: check('debug_status_line'),
    showDebugInspector: check('debug_inspector'),
    dancer: param.get('dancer'),
    cameraControl: check('camera_control'),
    silenceDing: check('silence_ding'),
  }
}
