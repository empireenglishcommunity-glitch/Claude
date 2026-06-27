/**
 * POST /api/assessment
 * Saves placement assessment results.
 * In MVP: logs to console. When Supabase is connected: saves to database.
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { scores, result, timestamp } = body

    if (!scores || !result) {
      return Response.json({ error: 'Missing scores or result' }, { status: 400 })
    }

    // Log the result (visible in server logs / Vercel function logs)
    console.log('=== PLACEMENT ASSESSMENT RESULT ===')
    console.log(`Timestamp: ${timestamp}`)
    console.log(`Level: ${result.level} (${result.level_info?.name})`)
    console.log(`Scores: Listening=${scores.listening}% Vocab=${scores.vocabulary}% Grammar=${scores.grammar}% Speaking=${scores.speaking}%`)
    console.log(`Flagged: ${result.flag ? 'YES — ' + result.flag_reason : 'No'}`)
    console.log('===================================')

    // TODO: When Supabase is connected, save to assessment_results table:
    // const { data, error } = await supabase.from('assessment_results').insert({
    //   user_id: userId,
    //   level_assigned: result.level,
    //   listening_score: scores.listening,
    //   vocabulary_score: scores.vocabulary,
    //   grammar_score: scores.grammar,
    //   speaking_score: scores.speaking,
    //   flagged: result.flag,
    //   flag_reason: result.flag_reason,
    //   raw_data: body,
    //   assessed_at: timestamp,
    // })

    return Response.json({
      success: true,
      level: result.level,
      level_info: result.level_info,
    })
  } catch (err) {
    console.error('Assessment save error:', err)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
