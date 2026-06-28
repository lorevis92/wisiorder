// Alert sonoro senza file audio: genera un beep via Web Audio API.
// Gestisce il vincolo browser "serve un gesto utente" sbloccando al primo tap.
let ctx = null

export function initAudio() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)()
    } catch (e) {
      ctx = null
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume()
}

export function beep({ freq = 880, duration = 0.18, repeat = 2, gap = 0.12 } = {}) {
  if (!ctx) initAudio()
  if (!ctx) return
  for (let i = 0; i < repeat; i++) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const start = ctx.currentTime + i * (duration + gap)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(start)
    osc.stop(start + duration)
  }
}

export function vibrate(pattern = [120, 60, 120]) {
  if (navigator.vibrate) navigator.vibrate(pattern)
}
