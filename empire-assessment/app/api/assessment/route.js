/**
 * POST /api/assessment
 * Saves placement assessment results and sends Telegram notification to admin.
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || ''

async function sendTelegramNotification(body) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
    console.warn('Telegram notification skipped: missing bot token or chat ID')
    return
  }

  const { scores, result, userId, email, timestamp } = body
  const level = result.level
  const levelName = result.level_info?.name || 'Unknown'
  const levelEmoji = level === 'L3' ? '👑' : level === 'L2' ? '🛡️' : level === 'L1' ? '⚔️' : '🗡️'

  const message = `
${levelEmoji} *New Assessment Completed*

👤 *Student:* ${email || 'Unknown'}
📅 *Date:* ${new Date(timestamp).toLocaleString('en-GB', { timeZone: 'Asia/Dubai' })}

🏅 *Assigned Level:* ${level} — ${levelName}

📊 *Scores:*
  👂 Listening: ${scores.listening}%
  📖 Vocabulary: ${scores.vocabulary}%
  ✍️ Grammar: ${scores.grammar}%
  🎙️ Speaking: ${scores.speaking}%

${result.flag ? `⚠️ *FLAGGED:* ${result.flag_reason}` : '✅ No flags — consistent performance'}

🔗 User ID: \`${userId || 'anonymous'}\`
`

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_ADMIN_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    })
  } catch (err) {
    console.error('Telegram notification failed:', err)
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { scores, result, timestamp, userId, email } = body

    if (!scores || !result) {
      return Response.json({ error: 'Missing scores or result' }, { status: 400 })
    }

    // Log the result
    console.log('=== PLACEMENT ASSESSMENT RESULT ===')
    console.log(`Student: ${email || 'anonymous'}`)
    console.log(`Timestamp: ${timestamp}`)
    console.log(`Level: ${result.level} (${result.level_info?.name})`)
    console.log(`Scores: Listening=${scores.listening}% Vocab=${scores.vocabulary}% Grammar=${scores.grammar}% Speaking=${scores.speaking}%`)
    console.log(`Flagged: ${result.flag ? 'YES — ' + result.flag_reason : 'No'}`)
    console.log('===================================')

    // Send Telegram notification (fire and forget)
    sendTelegramNotification(body).catch(() => {})

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
