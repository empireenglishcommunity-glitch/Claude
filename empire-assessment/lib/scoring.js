/**
 * Placement Assessment Scoring Engine
 * Implements the algorithm from scoring_algorithm.json:
 *   1. Score each module 0-100
 *   2. Map each score to a level (L0-L3)
 *   3. Majority-rules: most frequent level = assigned level
 *   4. Tiebreaker: Speaking score wins
 *   5. 20+ point gap between any two dimensions = flag for human review
 */

const LEVEL_THRESHOLDS = {
  speaking:   { L0: [0, 30], L1: [31, 55], L2: [56, 75], L3: [76, 100] },
  listening:  { L0: [0, 35], L1: [36, 60], L2: [61, 80], L3: [81, 100] },
  vocabulary: { L0: [0, 35], L1: [36, 60], L2: [61, 80], L3: [81, 100] },
  grammar:    { L0: [0, 35], L1: [36, 60], L2: [61, 80], L3: [81, 100] },
}

const LEVEL_INFO = {
  L0: { name: 'Absolute Beginner', name_ar: 'مبتدئ تمامًا', emoji: '🌱', color: '#A8E6CF', duration: '8-12 weeks', daily_minutes: 45, vocab_target: 500 },
  L1: { name: 'Survival English', name_ar: 'إنجليزية النجاة', emoji: '💪', color: '#2ECC71', duration: '10-14 weeks', daily_minutes: 60, vocab_target: 1500 },
  L2: { name: 'Communication', name_ar: 'التواصل', emoji: '🚀', color: '#3498DB', duration: '12-16 weeks', daily_minutes: 75, vocab_target: 3000 },
  L3: { name: 'Fluency & Native Accent', name_ar: 'الطلاقة واللهجة', emoji: '👑', color: '#D4AF37', duration: 'Ongoing', daily_minutes: 90, vocab_target: 5000 },
}

/**
 * Map a raw module score (0-100) to a level based on thresholds.
 */
export function scoreToLevel(module, score) {
  const thresholds = LEVEL_THRESHOLDS[module]
  if (!thresholds) return 'L0'
  
  for (const [level, [min, max]] of Object.entries(thresholds)) {
    if (score >= min && score <= max) return level
  }
  return 'L0'
}

/**
 * Calculate listening score from answers.
 * 15 questions, each worth 100/15 points.
 */
export function scoreListening(answers) {
  const total = 15
  const correct = answers.filter(a => a.correct).length
  return Math.round((correct / total) * 100)
}

/**
 * Calculate vocabulary score from answers.
 * 40 questions, maps to estimated vocabulary size, then to 0-100 scale.
 * Each correct answer ≈ 125 words. Max 5000 words = 100%.
 */
export function scoreVocabulary(answers) {
  const correct = answers.filter(a => a.correct).length
  const estimatedVocab = correct * 125
  return Math.min(100, Math.round((estimatedVocab / 5000) * 100))
}

/**
 * Calculate grammar score from answers.
 * 25 questions, each worth 100/25 = 4 points.
 */
export function scoreGrammar(answers) {
  const total = 25
  const correct = answers.filter(a => a.correct).length
  return Math.round((correct / total) * 100)
}

/**
 * Speaking score based on actual recording quality.
 * Scores based on:
 * - Whether recordings exist and have real duration
 * - Minimum 5 seconds per part to count as "attempted"
 * - Duration relative to target indicates effort/fluency
 * 
 * Returns: 0-100 score (0 if skipped/too short, scaled by actual performance)
 * Note: This is provisional — AI evaluation will override when available.
 */
export function scoreSpeaking(recordings) {
  if (!recordings || recordings.length === 0) return 0

  // Expected durations per part (seconds)
  const expectedDurations = [90, 60, 30] // read aloud, spontaneous, shadowing
  const MIN_DURATION = 5 // minimum seconds to count as an attempt

  let totalScore = 0
  let attemptedParts = 0

  for (let i = 0; i < Math.min(recordings.length, 3); i++) {
    const rec = recordings[i]
    const duration = rec.duration || 0

    // Skip if recording is too short (< 5 seconds = didn't actually speak)
    if (duration < MIN_DURATION) {
      continue
    }

    attemptedParts++
    const expected = expectedDurations[i] || 60

    // Score based on how much of the expected time they spoke
    // Speaking 80%+ of expected time = full marks for that part
    // Speaking less = proportional score
    const durationRatio = Math.min(1, duration / (expected * 0.8))
    const partScore = durationRatio * 100

    totalScore += partScore
  }

  // If no parts were actually attempted (all skipped or < 5 seconds)
  if (attemptedParts === 0) return 0

  // Average across attempted parts, scaled by how many parts they did
  const avgScore = totalScore / 3 // Always divide by 3 (total parts) not attemptedParts
  return Math.round(Math.min(100, avgScore))
}

/**
 * Main placement algorithm.
 * Returns: { level, levels_by_module, scores, flag, flag_reason, level_info }
 */
export function calculatePlacement(scores) {
  const { listening, vocabulary, grammar, speaking } = scores

  // Step 1-2: Map each score to a level
  const levels = {
    speaking: scoreToLevel('speaking', speaking),
    listening: scoreToLevel('listening', listening),
    vocabulary: scoreToLevel('vocabulary', vocabulary),
    grammar: scoreToLevel('grammar', grammar),
  }

  // Step 3: Count level frequencies
  const levelCounts = { L0: 0, L1: 0, L2: 0, L3: 0 }
  Object.values(levels).forEach(l => levelCounts[l]++)

  // Find the majority level
  let majorityLevel = 'L0'
  let maxCount = 0
  for (const [level, count] of Object.entries(levelCounts)) {
    if (count > maxCount) {
      maxCount = count
      majorityLevel = level
    }
  }

  // Step 4: Tiebreaker — speaking wins
  if (maxCount <= 2) {
    // No clear majority or tie — speaking decides
    majorityLevel = levels.speaking
  }

  // Step 5: Flag if 20+ point gap between any two modules
  const scoreValues = [listening, vocabulary, grammar, speaking]
  const maxScore = Math.max(...scoreValues)
  const minScore = Math.min(...scoreValues)
  const gap = maxScore - minScore
  const flag = gap >= 20
  const flagReason = flag 
    ? `${gap}-point gap between strongest and weakest modules (${maxScore} vs ${minScore})`
    : null

  // Step 6: Refinement — if 2 strongest are a full level above majority, try higher
  const levelOrder = ['L0', 'L1', 'L2', 'L3']
  const sortedModules = Object.entries(levels).sort((a, b) => 
    levelOrder.indexOf(b[1]) - levelOrder.indexOf(a[1])
  )
  const top2Level = sortedModules[0][1]
  if (
    sortedModules[0][1] === sortedModules[1][1] &&
    levelOrder.indexOf(top2Level) > levelOrder.indexOf(majorityLevel)
  ) {
    majorityLevel = top2Level // Upgrade to higher level (2-week trial)
  }

  return {
    level: majorityLevel,
    levels_by_module: levels,
    scores: { listening, vocabulary, grammar, speaking },
    flag,
    flag_reason: flagReason,
    level_info: LEVEL_INFO[majorityLevel],
    all_levels_info: LEVEL_INFO,
  }
}

/**
 * Get study plan based on level.
 */
export function getStudyPlan(level) {
  const info = LEVEL_INFO[level] || LEVEL_INFO.L0
  return {
    level,
    ...info,
    focus_areas: getFocusAreas(level),
    track: 'Core',
    tasks_per_day: 7,
    first_week_tasks: 3,
  }
}

function getFocusAreas(level) {
  switch (level) {
    case 'L0': return ['Basic pronunciation (44 English phonemes)', 'Core vocabulary (500 words)', 'Simple sentence structure (SVO)', 'Daily speaking practice (30-60 seconds)']
    case 'L1': return ['Connected speech + word stress', 'Expanded vocabulary (1500 words)', 'Past/future tenses + questions', 'Longer speaking (1-2 minutes)']
    case 'L2': return ['Natural rhythm + intonation', 'Academic vocabulary (3000 words)', 'Complex grammar (conditionals, passive)', 'Discussion + argumentation (3-5 min)']
    case 'L3': return ['Native-like accent refinement', 'Advanced vocabulary + collocations', 'Nuance + style (formal/informal register)', 'Fluent extended discourse']
    default: return []
  }
}

export { LEVEL_INFO, LEVEL_THRESHOLDS }
