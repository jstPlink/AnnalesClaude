// Conversione di una registrazione del microfono in WAV (PCM 16 bit, mono,
// 16 kHz): è il formato che Gemini dichiara ufficialmente di supportare per
// l'audio, mentre i telefoni registrano in WebM/MP4 (src/components/
// VoiceRecordButton.jsx). Si usa solo come ripiego, se Gemini rifiuta il
// formato originale.

function encodeWav(samples, rate) {
  const bytes = samples.length * 2
  const view = new DataView(new ArrayBuffer(44 + bytes))
  const str = (o, s) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF')
  view.setUint32(4, 36 + bytes, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  view.setUint32(16, 16, true) // dimensione del blocco fmt
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true) // byte al secondo
  view.setUint16(32, 2, true) // byte per campione
  view.setUint16(34, 16, true) // bit per campione
  str(36, 'data')
  view.setUint32(40, bytes, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([view], { type: 'audio/wav' })
}

export async function blobToWav(blob, rate = 16000) {
  const Ctx = window.AudioContext || window.webkitAudioContext
  const ctx = new Ctx()
  try {
    const audio = await ctx.decodeAudioData(await blob.arrayBuffer())
    const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(audio.duration * rate)), rate)
    const src = offline.createBufferSource()
    src.buffer = audio
    src.connect(offline.destination)
    src.start()
    const rendered = await offline.startRendering()
    return encodeWav(rendered.getChannelData(0), rate)
  } finally {
    ctx.close?.()
  }
}
