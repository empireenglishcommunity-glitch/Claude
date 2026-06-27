/**
 * Empire English — Sound Effects System
 * Uses Web Audio API to generate subtle UI sounds.
 * No external audio files required — all synthesized.
 */

let audioCtx = null

function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return audioCtx
}

// Resume audio context on first user interaction (required by browsers)
export function initSounds() {
  const ctx = getAudioContext()
  if (ctx && ctx.state === 'suspended') {
    ctx.resume()
  }
}

/**
 * Subtle click sound — for button presses
 * Short, soft "tick" 
 */
export function playClick() {
  const ctx = getAudioContext()
  if (!ctx) return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.frequency.setValueAtTime(800, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05)
  osc.type = 'sine'

  gain.gain.setValueAtTime(0.08, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)

  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.08)
}

/**
 * Option select sound — slightly brighter tick
 */
export function playSelect() {
  const ctx = getAudioContext()
  if (!ctx) return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.frequency.setValueAtTime(1200, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.06)
  osc.type = 'sine'

  gain.gain.setValueAtTime(0.06, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)

  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.1)
}

/**
 * Confirm/submit sound — two-note ascending chime
 */
export function playConfirm() {
  const ctx = getAudioContext()
  if (!ctx) return

  // First note
  const osc1 = ctx.createOscillator()
  const gain1 = ctx.createGain()
  osc1.connect(gain1)
  gain1.connect(ctx.destination)
  osc1.frequency.setValueAtTime(600, ctx.currentTime)
  osc1.type = 'sine'
  gain1.gain.setValueAtTime(0.07, ctx.currentTime)
  gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
  osc1.start(ctx.currentTime)
  osc1.stop(ctx.currentTime + 0.15)

  // Second note (higher)
  const osc2 = ctx.createOscillator()
  const gain2 = ctx.createGain()
  osc2.connect(gain2)
  gain2.connect(ctx.destination)
  osc2.frequency.setValueAtTime(900, ctx.currentTime + 0.08)
  osc2.type = 'sine'
  gain2.gain.setValueAtTime(0.07, ctx.currentTime + 0.08)
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
  osc2.start(ctx.currentTime + 0.08)
  osc2.stop(ctx.currentTime + 0.25)
}

/**
 * Success sound — triumphant ascending three-note chord
 */
export function playSuccess() {
  const ctx = getAudioContext()
  if (!ctx) return

  const notes = [523, 659, 784] // C5, E5, G5 (major chord)
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1)
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.06, ctx.currentTime + i * 0.1)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.3)
    osc.start(ctx.currentTime + i * 0.1)
    osc.stop(ctx.currentTime + i * 0.1 + 0.3)
  })
}

/**
 * Error/warning sound — low descending tone
 */
export function playError() {
  const ctx = getAudioContext()
  if (!ctx) return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.frequency.setValueAtTime(400, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15)
  osc.type = 'sine'

  gain.gain.setValueAtTime(0.08, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)

  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.2)
}

/**
 * Transition/whoosh — for page transitions
 */
export function playTransition() {
  const ctx = getAudioContext()
  if (!ctx) return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.frequency.setValueAtTime(200, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.12)
  osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.2)
  osc.type = 'sine'

  gain.gain.setValueAtTime(0.04, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)

  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.25)
}

/**
 * Level up / rank reveal — epic ascending sweep
 */
export function playLevelUp() {
  const ctx = getAudioContext()
  if (!ctx) return

  const notes = [262, 330, 392, 523, 659] // C4 → E5 ascending
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12)
    osc.type = 'triangle'
    gain.gain.setValueAtTime(0.05 + i * 0.01, ctx.currentTime + i * 0.12)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4)
    osc.start(ctx.currentTime + i * 0.12)
    osc.stop(ctx.currentTime + i * 0.12 + 0.4)
  })
}

/**
 * Timer warning — urgent double beep
 */
export function playTimerWarning() {
  const ctx = getAudioContext()
  if (!ctx) return

  for (let i = 0; i < 2; i++) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(1000, ctx.currentTime + i * 0.15)
    osc.type = 'square'
    gain.gain.setValueAtTime(0.03, ctx.currentTime + i * 0.15)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.08)
    osc.start(ctx.currentTime + i * 0.15)
    osc.stop(ctx.currentTime + i * 0.15 + 0.08)
  }
}
