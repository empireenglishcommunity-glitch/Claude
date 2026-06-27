/**
 * POST /api/evaluate-speaking
 * Evaluates student's speaking audio using Gemini AI.
 * Accepts audio as base64, compares against expected text.
 * Returns pronunciation, fluency, coherence scores.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export async function POST(request) {
  try {
    const body = await request.json()
    const { audioBase64, expectedText, partType, mimeType } = body

    if (!audioBase64 || !expectedText) {
      return Response.json({ error: 'Missing audio or expected text' }, { status: 400 })
    }

    if (!GEMINI_API_KEY) {
      // Fallback: return minimal score if no API key
      return Response.json({
        success: true,
        scores: {
          pronunciation: 0,
          fluency: 0,
          coherence: 0,
          overall: 0,
        },
        feedback: 'AI evaluation unavailable. Please contact administrator.',
        fallback: true,
      })
    }

    // Build the evaluation prompt based on part type
    let prompt = ''
    if (partType === 'read_aloud') {
      prompt = `You are an expert English pronunciation evaluator for Arabic-speaking students.

The student was asked to read this text aloud:
"${expectedText}"

Listen to their audio recording and evaluate:
1. PRONUNCIATION (0-100): How correctly they pronounce each word. Consider: individual sounds, word stress, vowel quality. Be strict but fair for Arabic speakers who commonly struggle with /p/ vs /b/, /v/ vs /f/, short vs long vowels.
2. FLUENCY (0-100): How smoothly they speak. Consider: pace, hesitations, stumbles, restarts. A score of 70+ means mostly smooth with minor pauses.
3. COHERENCE (0-100): How much of the text they actually read correctly and completely. Did they skip words? Read the wrong words?

If the audio is silent, contains no speech, or is just noise: give all scores 0.
If they speak a different language or say random words: give all scores 5-10.
If they clearly attempted but struggled: give scores 20-50 range.`
    } else if (partType === 'spontaneous') {
      prompt = `You are an expert English speaking evaluator for Arabic-speaking students.

The student was asked this question: "${expectedText}"

They recorded a spontaneous response. Evaluate:
1. PRONUNCIATION (0-100): Clarity of their English pronunciation.
2. FLUENCY (0-100): Smoothness, pace, confidence. Natural pauses are OK but long silences reduce score.
3. COHERENCE (0-100): Does their response make sense? Is it relevant to the question? Is it in English?

If the audio is silent or has no speech: give all scores 0.
If they speak Arabic only: give 5 for coherence, evaluate pronunciation of any English words.
If very short (under 10 seconds of speech): cap fluency at 40.`
    } else {
      prompt = `You are an expert English pronunciation evaluator for Arabic-speaking students.

The student was asked to repeat this sentence: "${expectedText}"

Evaluate how accurately they repeated it:
1. PRONUNCIATION (0-100): How closely their pronunciation matches a native speaker.
2. FLUENCY (0-100): Rhythm and flow of their repetition.
3. COHERENCE (0-100): Did they repeat the correct words in the right order?

If the audio is silent: give all scores 0.`
    }

    prompt += `

IMPORTANT RULES:
- Be honest and strict. This is a placement test — inflated scores harm the student.
- Arabic speakers are the target audience. Common L1 interference is expected at lower levels.
- Score 0 means no attempt. Score 30 means beginner. Score 60 means intermediate. Score 85+ means advanced.

Respond in this EXACT JSON format only (no markdown, no explanation):
{"pronunciation": <number>, "fluency": <number>, "coherence": <number>, "overall": <number>, "feedback": "<one sentence in Arabic about their performance>"}`

    // Call Gemini API with audio
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType || 'audio/webm',
                  data: audioBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 300,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', response.status, errorText)
      // Return zero scores on API failure
      return Response.json({
        success: true,
        scores: { pronunciation: 0, fluency: 0, coherence: 0, overall: 0 },
        feedback: 'حدث خطأ في التقييم. سيتم مراجعة تسجيلك يدوياً.',
        fallback: true,
      })
    }

    const data = await response.json()

    // Extract the text response from Gemini
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Parse the JSON from Gemini's response
    let scores = { pronunciation: 0, fluency: 0, coherence: 0, overall: 0 }
    let feedback = ''

    try {
      // Clean the response (remove markdown code blocks if any)
      const cleaned = textResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(cleaned)
      scores = {
        pronunciation: Math.max(0, Math.min(100, parsed.pronunciation || 0)),
        fluency: Math.max(0, Math.min(100, parsed.fluency || 0)),
        coherence: Math.max(0, Math.min(100, parsed.coherence || 0)),
        overall: Math.max(0, Math.min(100, parsed.overall || 0)),
      }
      feedback = parsed.feedback || ''
    } catch (parseErr) {
      console.error('Failed to parse Gemini response:', textResponse)
      // Try to extract numbers from the response
      const numMatches = textResponse.match(/\d+/g)
      if (numMatches && numMatches.length >= 3) {
        scores = {
          pronunciation: Math.min(100, parseInt(numMatches[0]) || 0),
          fluency: Math.min(100, parseInt(numMatches[1]) || 0),
          coherence: Math.min(100, parseInt(numMatches[2]) || 0),
          overall: Math.min(100, parseInt(numMatches[3]) || Math.round((parseInt(numMatches[0]) + parseInt(numMatches[1]) + parseInt(numMatches[2])) / 3)),
        }
      }
    }

    return Response.json({
      success: true,
      scores,
      feedback,
      fallback: false,
    })
  } catch (err) {
    console.error('Speaking evaluation error:', err)
    return Response.json({
      success: true,
      scores: { pronunciation: 0, fluency: 0, coherence: 0, overall: 0 },
      feedback: 'حدث خطأ. سيتم تقييمك يدوياً.',
      fallback: true,
    })
  }
}
