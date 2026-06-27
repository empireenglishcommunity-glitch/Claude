/**
 * Retake Comparison — compares current assessment to previous one.
 * Shows improvement/decline per module and overall.
 */

/**
 * Get the previous assessment for comparison
 * @param {string} userId
 * @returns {{ previous: object|null, comparison: object|null }}
 */
export function getRetakeComparison(userId, currentScores) {
  if (!userId || typeof window === 'undefined') return { previous: null, comparison: null }

  try {
    const saved = JSON.parse(localStorage.getItem(`assessments_${userId}`) || '[]')
    
    // Need at least 2 entries (current one is already saved by this point)
    // Get the second entry (previous assessment)
    const previous = saved.length >= 2 ? saved[1] : null
    
    if (!previous || !previous.scores) return { previous: null, comparison: null }

    const prevScores = previous.scores
    const comparison = {
      listening: currentScores.listening - (prevScores.listening || 0),
      vocabulary: currentScores.vocabulary - (prevScores.vocabulary || 0),
      grammar: currentScores.grammar - (prevScores.grammar || 0),
      speaking: currentScores.speaking - (prevScores.speaking || 0),
      overall: Math.round(
        ((currentScores.listening + currentScores.vocabulary + currentScores.grammar + currentScores.speaking) / 4) -
        ((prevScores.listening + prevScores.vocabulary + prevScores.grammar + prevScores.speaking) / 4)
      ),
      previousLevel: previous.result?.level || 'L0',
      previousDate: previous.timestamp,
      improved: false,
      declined: false,
    }

    comparison.improved = comparison.overall > 0
    comparison.declined = comparison.overall < 0

    return { previous, comparison }
  } catch {
    return { previous: null, comparison: null }
  }
}

/**
 * Format a comparison value with + or - prefix and color
 */
export function formatDiff(value) {
  if (value > 0) return { text: `+${value}%`, color: '#4ade80', emoji: '📈' }
  if (value < 0) return { text: `${value}%`, color: '#ef4444', emoji: '📉' }
  return { text: '0%', color: '#8B919A', emoji: '➡️' }
}
