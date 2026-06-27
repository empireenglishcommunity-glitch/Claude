/**
 * POST /api/assessment
 * Saves placement assessment results and triggers all integrations:
 * - Telegram notification to admin
 * - n8n webhook (connects to CRM, auto-assign level, etc.)
 * - Google Sheets logging (direct append to CRM spreadsheet)
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || ''
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || ''
const GOOGLE_SHEETS_WEBHOOK = process.env.GOOGLE_SHEETS_WEBHOOK || ''

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

async function sendN8nWebhook(body) {
  if (!N8N_WEBHOOK_URL) return

  const { scores, result, userId, email, timestamp } = body
  try {
    await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'assessment_completed',
        student: { userId, email },
        level: result.level,
        levelName: result.level_info?.name,
        scores,
        flagged: result.flag || false,
        flagReason: result.flag_reason || null,
        timestamp,
      }),
    })
  } catch (err) {
    console.error('n8n webhook failed:', err)
  }
}

async function sendToGoogleSheets(body) {
  if (!GOOGLE_SHEETS_WEBHOOK) return

  const { scores, result, userId, email, timestamp } = body
  try {
    // Format as a row for Google Sheets (via n8n or Apps Script webhook)
    await fetch(GOOGLE_SHEETS_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp,
        email: email || 'anonymous',
        userId: userId || '',
        level: result.level,
        levelName: result.level_info?.name || '',
        listening: scores.listening,
        vocabulary: scores.vocabulary,
        grammar: scores.grammar,
        speaking: scores.speaking,
        average: Math.round((scores.listening + scores.vocabulary + scores.grammar + scores.speaking) / 4),
        flagged: result.flag ? 'YES' : 'NO',
        flagReason: result.flag_reason || '',
      }),
    })
  } catch (err) {
    console.error('Google Sheets logging failed:', err)
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

    // Fire all integrations in parallel (non-blocking)
    const integrations = [
      sendTelegramNotification(body),
      sendN8nWebhook(body),
      sendToGoogleSheets(body),
    ]
    Promise.allSettled(integrations).catch(() => {})

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
