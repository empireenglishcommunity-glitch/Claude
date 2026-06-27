/**
 * Empire English — Speech Scoring Engine
 * Uses browser's SpeechRecognition API to transcribe speech,
 * then scores by comparing transcript against expected text.
 * 
 * 100% client-side. No API calls. No latency. Reliable.
 */

/**
 * Calculate similarity between two strings (Levenshtein-based)
 * Returns 0-100 percentage
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0
  
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()
  
  if (s1 === s2) return 100
  if (s1.length === 0 || s2.length === 0) return 0

  // Word-level comparison (more meaningful for speech)
  const words1 = s1.split(/\s+/).filter(w => w.length > 0)
  const words2 = s2.split(/\s+/).filter(w => w.length > 0)

  if (words1.length === 0 || words2.length === 0) return 0

  // Count matching words (order-independent for partial credit)
  let matchCount = 0
  const used = new Set()
  
  for (const word of words1) {
    const idx = words2.findIndex((w, i) => !used.has(i) && (w === word || levenshteinDistance(w, word) <= 1))
    if (idx !== -1) {
      matchCount++
      used.add(idx)
    }
  }

  // Percentage of expected words that were spoken correctly
  const expectedWords = Math.max(words1.length, words2.length)
  return Math.round((matchCount / expectedWords) * 100)
}

/**
 * Levenshtein distance between two strings
 */
function levenshteinDistance(a, b) {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null))
  
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      )
    }
  }
  return matrix[b.length][a.length]
}

/**
 * Calculate word order score (how well the order matches)
 */
function calculateOrderScore(spoken, expected) {
  const spokenWords = spoken.toLowerCase().split(/\s+/)
  const expectedWords = expected.toLowerCase().split(/\s+/)
  
  if (spokenWords.length === 0) return 0

  let orderMatches = 0
  let lastFoundIdx = -1

  for (const word of spokenWords) {
    const idx = expectedWords.indexOf(word, lastFoundIdx + 1)
    if (idx > lastFoundIdx) {
      orderMatches++
      lastFoundIdx = idx
    }
  }

  return Math.round((orderMatches / Math.max(spokenWords.length, 1)) * 100)
}

/**
 * Score a speaking recording based on transcript vs expected text.
 * 
 * @param {string} transcript - What the browser recognized (from SpeechRecognition)
 * @param {string} expectedText - What they were supposed to say
 * @param {string} partType - 'read_aloud' | 'spontaneous' | 'shadowing'
 * @param {number} duration - Recording duration in seconds
 * @param {number} expectedDuration - Expected duration in seconds
 * @returns {{ pronunciation: number, fluency: number, coherence: number, overall: number, feedback: string }}
 */
export function scoreSpeech(transcript, expectedText, partType, duration, expectedDuration) {
  // No speech detected
  if (!transcript || transcript.trim().length === 0) {
    return {
      pronunciation: 0,
      fluency: 0,
      coherence: 0,
      overall: 0,
      feedback: 'لم يتم اكتشاف أي كلام. تأكد من التحدث بصوت واضح.',
    }
  }

  const spokenWords = transcript.trim().split(/\s+/).length
  const expectedWords = expectedText.trim().split(/\s+/).length

  let pronunciation, fluency, coherence

  if (partType === 'read_aloud' || partType === 'shadowing') {
    // For read-aloud and shadowing: compare directly to expected text
    const similarity = calculateSimilarity(transcript, expectedText)
    const orderScore = calculateOrderScore(transcript, expectedText)
    
    // Pronunciation: based on word-level accuracy (how many words matched)
    pronunciation = similarity

    // Fluency: based on duration ratio + word count ratio
    const durationRatio = Math.min(1, duration / (expectedDuration * 0.7))
    const wordRatio = Math.min(1, spokenWords / (expectedWords * 0.8))
    fluency = Math.round((durationRatio * 0.5 + wordRatio * 0.5) * 100)

    // Coherence: based on word order + coverage
    coherence = Math.round((similarity * 0.6 + orderScore * 0.4))

  } else {
    // For spontaneous: evaluate response quality differently
    // Can't compare word-for-word, so evaluate: length, English detected, relevance
    
    // Pronunciation: based on recognition confidence (if recognized = likely clear)
    // SpeechRecognition only returns text if pronunciation is understandable
    pronunciation = spokenWords >= 3 ? Math.min(85, 40 + spokenWords * 3) : 20

    // Fluency: based on duration and word count
    const wordsPerSecond = spokenWords / Math.max(duration, 1)
    if (wordsPerSecond >= 1.5) fluency = 80 // Good pace
    else if (wordsPerSecond >= 1.0) fluency = 65 // Acceptable
    else if (wordsPerSecond >= 0.5) fluency = 45 // Slow but trying
    else fluency = 25 // Very slow/broken

    // Coherence: did they respond at all with meaningful content?
    if (spokenWords >= 20) coherence = 80
    else if (spokenWords >= 10) coherence = 60
    else if (spokenWords >= 5) coherence = 40
    else coherence = 20
  }

  // Cap all scores at 100
  pronunciation = Math.min(100, Math.max(0, pronunciation))
  fluency = Math.min(100, Math.max(0, fluency))
  coherence = Math.min(100, Math.max(0, coherence))

  const overall = Math.round((pronunciation * 0.4 + fluency * 0.3 + coherence * 0.3))

  // Generate Arabic feedback
  let feedback
  if (overall >= 75) feedback = 'أداء ممتاز! نطقك واضح وطلق.'
  else if (overall >= 55) feedback = 'أداء جيد. استمر في التدريب لتحسين الطلاقة.'
  else if (overall >= 35) feedback = 'بداية جيدة. حاول قراءة النص بالكامل بصوت واضح.'
  else if (overall > 0) feedback = 'حاول التحدث بصوت أعلى وأوضح. تأكد من قراءة النص بالإنجليزية.'
  else feedback = 'لم يتم اكتشاف كلام.'

  return { pronunciation, fluency, coherence, overall, feedback }
}

/**
 * Check if SpeechRecognition is supported in this browser
 */
export function isSpeechRecognitionSupported() {
  if (typeof window === 'undefined') return false
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

/**
 * Create a SpeechRecognition instance configured for English
 */
export function createRecognizer() {
  if (!isSpeechRecognitionSupported()) return null
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const recognizer = new SpeechRecognition()
  
  recognizer.lang = 'en-US'
  recognizer.continuous = true
  recognizer.interimResults = true
  recognizer.maxAlternatives = 1
  
  return recognizer
}
