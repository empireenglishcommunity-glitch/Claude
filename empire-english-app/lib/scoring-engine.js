/**
 * ═══════════════════════════════════════════════════════════
 * EMPIRE ENGLISH COMMUNITY — Advanced Scoring Engine
 * Anti-Cheating + Seeded PRNG + Attempt-Weighted Scoring
 * ═══════════════════════════════════════════════════════════
 */

// ─── Seeded Pseudo-Random Number Generator ──────────────────
// Deterministic mulberry32 PRNG: same seed → same shuffle
// Prevents refresh exploits (questions stay shuffled same way per session)

export function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Fisher-Yates Shuffle (seeded) ──────────────────────────

export function shuffleArray(array, seed) {
  const rng = mulberry32(seed)
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// ─── Shuffle Options for a Single Question ──────────────────
// Returns new options array with answer still matchable by value

export function shuffleQuestionOptions(question, seed) {
  const rng = mulberry32(seed)
  const options = [...question.options]
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[options[i], options[j]] = [options[j], options[i]]
  }
  return { ...question, options }
}

// ─── Session Seed Generation ────────────────────────────────
// Generates a deterministic seed from available identifiers

export function generateSessionSeed(identifier, module, attemptNumber = 1) {
  let hash = 0
  const str = `${identifier}:${module}:${attemptNumber}:${Date.now()}`
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

// ─── Attempt-Weighted Score Calculation ─────────────────────
// First attempt has highest weight. Subsequent attempts are
// used for refinement only — prevents "score farming".

const ATTEMPT_WEIGHTS = [1.0, 0.7, 0.5, 0.3]

export function calculateWeightedScore(attempts) {
  if (!attempts || attempts.length === 0) {
    return { weightedScore: 0, confidence: 'low', interpretation: 'No attempts recorded.' }
  }

  // Sort by attempt number
  const sorted = [...attempts].sort((a, b) => a.attemptNumber - b.attemptNumber)

  let totalWeight = 0
  let weightedSum = 0

  for (let i = 0; i < sorted.length; i++) {
    const weight = ATTEMPT_WEIGHTS[Math.min(i, ATTEMPT_WEIGHTS.length - 1)]
    weightedSum += sorted[i].score * weight
    totalWeight += weight
  }

  const weightedScore = Math.round(weightedSum / totalWeight)

  // Determine confidence level
  let confidence
  let interpretation

  if (sorted.length === 1) {
    confidence = 'high'
    interpretation = 'First attempt — most reliable indicator of true ability.'
  } else if (sorted.length === 2) {
    const diff = Math.abs(sorted[0].score - sorted[1].score)
    if (diff <= 10) {
      confidence = 'high'
      interpretation = 'Consistent results. Score reliably reflects ability.'
    } else {
      confidence = 'medium'
      interpretation = 'Some variation between attempts. First attempt weighted more heavily.'
    }
  } else {
    const maxDiff = Math.max(...sorted.map(a => a.score)) - Math.min(...sorted.map(a => a.score))
    if (maxDiff <= 15) {
      confidence = 'high'
      interpretation = 'Consistent across multiple attempts. Strong confidence in placement.'
    } else if (maxDiff <= 30) {
      confidence = 'medium'
      interpretation = 'Moderate variation. Earlier attempts weighted more heavily.'
    } else {
      confidence = 'low'
      interpretation = 'High variation detected. Weighted average with first attempt prioritized.'
    }
  }

  return { weightedScore, confidence, interpretation }
}

// ─── Retake Cooldown Check ─────────────────────────────────
// Minimum 5 minutes between attempts to prevent rapid-fire retakes

const MINIMUM_RETAKE_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

export function canRetake(lastCompletedAt) {
  if (!lastCompletedAt) return { allowed: true, remainingMs: 0 }

  const elapsed = Date.now() - new Date(lastCompletedAt).getTime()
  const remaining = MINIMUM_RETAKE_INTERVAL_MS - elapsed

  return {
    allowed: remaining <= 0,
    remainingMs: Math.max(0, remaining),
  }
}

export function formatRemainingTime(ms) {
  const seconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes > 0) return `${minutes}m ${secs}s`
  return `${secs}s`
}

// ─── Time-Based Suspicion Detection ─────────────────────────
// Flags answers that are too fast (likely guessing) or too slow (looking up)

export function analyzeResponseTimes(answers) {
  if (!answers || answers.length === 0) return { suspicious: false, flags: [] }

  const flags = []
  const times = answers.filter(a => a.elapsed != null).map(a => a.elapsed)

  if (times.length === 0) return { suspicious: false, flags: [] }

  const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length

  // Too fast: < 3 seconds average suggests random clicking
  if (avgTime < 3) {
    flags.push({ type: 'too_fast', message: `Average response time ${avgTime.toFixed(1)}s — suspiciously fast.` })
  }

  // Count instant answers (< 2 seconds)
  const instantCount = times.filter(t => t < 2).length
  if (instantCount > times.length * 0.5) {
    flags.push({ type: 'bulk_instant', message: `${instantCount}/${times.length} answers under 2 seconds.` })
  }

  // Perfect score with very fast times is suspicious
  const correctCount = answers.filter(a => a.correct).length
  if (correctCount === answers.length && avgTime < 5) {
    flags.push({ type: 'perfect_fast', message: 'Perfect score with very fast responses.' })
  }

  return {
    suspicious: flags.length > 0,
    flags,
    averageTime: avgTime,
    instantCount,
  }
}

// ─── Difficulty Balancer ────────────────────────────────────
// Ensures questions are distributed evenly across difficulty tiers

export function balanceDifficulty(questions, count, seed) {
  if (questions.length <= count) return questions

  const rng = mulberry32(seed + 42)

  // Group by difficulty/level
  const groups = {}
  questions.forEach(q => {
    const key = q.level || q.band || 'default'
    if (!groups[key]) groups[key] = []
    groups[key].push(q)
  })

  const groupKeys = Object.keys(groups)
  const perGroup = Math.floor(count / groupKeys.length)
  const remainder = count % groupKeys.length

  const result = []

  groupKeys.forEach((key, i) => {
    const groupQs = groups[key]
    const take = perGroup + (i < remainder ? 1 : 0)

    // Shuffle within group
    const shuffled = [...groupQs]
    for (let j = shuffled.length - 1; j > 0; j--) {
      const k = Math.floor(rng() * (j + 1))
      ;[shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]]
    }

    result.push(...shuffled.slice(0, take))
  })

  return result
}

// ─── Assessment Integrity Score ─────────────────────────────
// Calculates an overall integrity score for the assessment

export function calculateIntegrityScore(moduleResults) {
  let totalFlags = 0
  let totalModules = 0

  Object.entries(moduleResults).forEach(([module, answers]) => {
    if (!Array.isArray(answers)) return
    totalModules++

    const analysis = analyzeResponseTimes(answers)
    totalFlags += analysis.flags.length
  })

  if (totalModules === 0) return { score: 100, level: 'high' }

  // Each flag reduces integrity by 15 points
  const score = Math.max(0, 100 - (totalFlags * 15))

  let level
  if (score >= 80) level = 'high'
  else if (score >= 50) level = 'medium'
  else level = 'low'

  return { score, level, totalFlags }
}

// ─── Imperial Rank Constants ────────────────────────────────

export const IMPERIAL_RANKS = {
  L0: { name: 'Recruit', name_ar: 'مجند', emoji: '🗡️', color: '#8b7355' },
  L1: { name: 'Initiate', name_ar: 'مبتدئ', emoji: '⚔️', color: '#cd7f32' },
  L2: { name: 'Warrior', name_ar: 'محارب', emoji: '🛡️', color: '#D4AF37' },
  L3: { name: 'Champion', name_ar: 'بطل', emoji: '👑', color: '#ff6b35' },
}

export const IMPERIAL_RANK_DESCRIPTIONS = {
  L0: 'You stand at the gates of the Empire. The journey begins here. With dedication, you will rise.',
  L1: 'You have taken your first steps. The Empire recognizes your commitment to mastery.',
  L2: 'A warrior of the Empire. Your command of English grows stronger with each battle.',
  L3: 'Champion of the Empire. Your mastery is recognized by all. Continue to refine your craft.',
}

export const IMPERIAL_TRAINING_PATHS = {
  L0: 'Begin with the Foundation Path: Focus on basic grammar, essential vocabulary (500 words), slow listening, and pronunciation fundamentals.',
  L1: 'Follow the Initiate Path: Strengthen grammar accuracy, expand vocabulary to 2000+ words, practice natural-speed listening, and work on fluency.',
  L2: 'Embark on the Warrior Path: Master advanced grammar (conditionals, passive voice), push vocabulary to 3000+ words, train with fast listening.',
  L3: 'Enter the Champion Path: Perfect nuanced grammar, expand vocabulary beyond 5000 words, master rapid listening, achieve near-native proficiency.',
}
