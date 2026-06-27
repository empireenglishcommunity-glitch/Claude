/**
 * POST /api/evaluate-speaking
 * Evaluates student's speaking audio using Gemini AI.
 * 
 * ARCHITECTURE:
 * - Receives audio as base64 (WebM/Opus from browser MediaRecorder)
 * - Sends to Gemini 1.5 Flash (better audio multimodal support)
 * - Uses explicit audio MIME type and processing instructions
 * - Returns pronunciation, fluency, coherence scores
 * 
 * KEY FIX: Uses gemini-1.5-flash instead of 2.0-flash for reliable
 * audio understanding. Adds explicit "this is audio" framing to prevent
 * the model from misinterpreting binary data as image.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

// Use 1.5-flash for reliable audio multimodal processing
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

export async function POST(request) {
  try {
    const body = await request.json()
    const { audioBase64, expectedText, partType, mimeType } = body

    if (!audioBase64 || !expectedText) {
      return Response.json({ error: 'Missing audio or expected text' }, { status: 400 })
    }

    if (!GEMINI_API_KEY) {
      return Response.json({
        success: true,
        scores: { pronunciation: 0, fluency: 0, coherence: 0, overall: 0 },
        feedback: 'AI evaluation unavailable. Please contact administrator.',
        fallback: true,
      })
    }

    // Determine the correct MIME type
    // Browser MediaRecorder typically outputs audio/webm;codecs=opus
    // Gemini 1.5 supports: audio/wav, audio/mp3, audio/aiff, audio/aac, audio/ogg, audio/flac, audio/webm
    const audioMimeType = 'audio/webm'

    // Build the evaluation prompt with EXPLICIT audio framing
    // This prevents the model from misinterpreting the binary data as image
    let systemContext = `IMPORTANT: The attached data is an AUDIO RECORDING (speech/voice). 
It is NOT an image. Do NOT describe it visually. Do NOT classify it as a gesture or image.
You must LISTEN to the audio content and evaluate the SPOKEN ENGLISH words.
If you cannot process the audio, respond with all scores as 0 and feedback explaining the issue.

`

    let prompt = ''
    if (partType === 'read_aloud') {
      prompt = systemContext + `You are an expert English pronunciation evaluator for Arabic-speaking students.

TASK: Listen to the attached AUDIO RECORDING of a student reading aloud.

The student was asked to read this text:
"${expectedText}"

Evaluate their SPOKEN PERFORMANCE:
1. PRONUNCIATION (0-100): How correctly they pronounce each English word. Consider: individual phonemes, word stress, vowel quality. Arabic speakers commonly struggle with /p/ vs /b/, /v/ vs /f/, short vs long vowels, /θ/ and /ð/.
2. FLUENCY (0-100): How smoothly they speak. Consider: pace, hesitations, stumbles, restarts. 70+ means mostly smooth with minor pauses.
3. COHERENCE (0-100): How much of the text they actually read correctly and completely. Did they skip words? Read wrong words? Cover most of the passage?

SCORING GUIDE:
- Silent/no speech/noise only → all scores 0
- Speaking Arabic or random words → all scores 5-10  
- Attempted but heavy accent/many errors → 20-40
- Decent pronunciation with some errors → 50-70
- Good pronunciation, clear → 75-90
- Near-native → 90-100`

    } else if (partType === 'spontaneous') {
      prompt = systemContext + `You are an expert English speaking evaluator for Arabic-speaking students.

TASK: Listen to the attached AUDIO RECORDING of a student responding spontaneously.

The student was asked: "${expectedText}"

Evaluate their SPOKEN RESPONSE:
1. PRONUNCIATION (0-100): Clarity of English pronunciation in their response.
2. FLUENCY (0-100): Smoothness, pace, confidence. Natural pauses OK, long silences reduce score.
3. COHERENCE (0-100): Does response make sense? Relevant to question? In English?

SCORING GUIDE:
- Silent/no speech → all scores 0
- Arabic only, no English → coherence 5, others 0
- Very short (few words) → cap fluency at 40
- Clear attempt with errors → 30-60
- Good response → 60-85
- Excellent natural response → 85-100`

    } else {
      prompt = systemContext + `You are an expert English pronunciation evaluator for Arabic-speaking students.

TASK: Listen to the attached AUDIO RECORDING of a student repeating a sentence.

The student was asked to repeat: "${expectedText}"

Evaluate their REPETITION:
1. PRONUNCIATION (0-100): How closely their pronunciation matches correct English.
2. FLUENCY (0-100): Rhythm and flow of their repetition.
3. COHERENCE (0-100): Did they repeat the correct words in the right order?

SCORING GUIDE:
- Silent → all scores 0
- Wrong words entirely → coherence 5-15
- Partial repetition → scores 30-50
- Full correct repetition with accent → 60-80
- Clear accurate repetition → 80-100`
    }

    prompt += `

CRITICAL RULES:
- This is a PLACEMENT TEST — inflated scores harm the student. Be honest.
- You are evaluating AUDIO (speech). NOT an image. NOT a video frame.
- If you see/detect no speech in the audio, give all scores 0.
- Arabic L1 interference is expected. Score the actual performance fairly.

Respond ONLY with this exact JSON (no markdown, no extra text):
{"pronunciation": <0-100>, "fluency": <0-100>, "coherence": <0-100>, "overall": <0-100>, "feedback": "<one sentence in Arabic evaluating their performance>"}`

    // Call Gemini API with audio
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
              {
                inline_data: {
                  mime_type: audioMimeType,
                  data: audioBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 300,
          topP: 0.8,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', response.status, errorText)
      
      // If 1.5-flash fails, try with explicit audio/ogg mime type as fallback
      if (response.status === 400) {
        console.error('Possible MIME type issue. Received status 400.')
      }

      return Response.json({
        success: true,
        scores: { pronunciation: 0, fluency: 0, coherence: 0, overall: 0 },
        feedback: 'حدث خطأ في التقييم. سيتم مراجعة تسجيلك يدوياً.',
        fallback: true,
        error: `API ${response.status}`,
      })
    }

    const data = await response.json()

    // Check for safety blocks or empty responses
    if (!data.candidates || data.candidates.length === 0) {
      console.error('Gemini returned no candidates:', JSON.stringify(data))
      return Response.json({
        success: true,
        scores: { pronunciation: 0, fluency: 0, coherence: 0, overall: 0 },
        feedback: 'لم يتمكن النظام من تقييم التسجيل. حاول مرة أخرى.',
        fallback: true,
      })
    }

    // Check if the model refused or blocked
    const candidate = data.candidates[0]
    if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'BLOCKED') {
      console.error('Gemini blocked the response:', candidate.finishReason)
      return Response.json({
        success: true,
        scores: { pronunciation: 0, fluency: 0, coherence: 0, overall: 0 },
        feedback: 'تم حظر التقييم. حاول التسجيل مرة أخرى.',
        fallback: true,
      })
    }

    const textResponse = candidate.content?.parts?.[0]?.text || ''

    // Detect if the model misinterpreted audio as image
    const imageKeywords = ['image', 'picture', 'photo', 'gesture', 'visual', 'shows', 'depicts', 'appears to be']
    const lowerResponse = textResponse.toLowerCase()
    const isMisinterpreted = imageKeywords.some(kw => lowerResponse.includes(kw))

    if (isMisinterpreted) {
      console.error('Model misinterpreted audio as image. Response:', textResponse)
      return Response.json({
        success: true,
        scores: { pronunciation: 0, fluency: 0, coherence: 0, overall: 0 },
        feedback: 'حدث خطأ تقني في تحليل الصوت. سيتم مراجعة تسجيلك يدوياً.',
        fallback: true,
        debug: 'model_misinterpreted_as_image',
      })
    }

    // Parse the JSON response
    let scores = { pronunciation: 0, fluency: 0, coherence: 0, overall: 0 }
    let feedback = ''

    try {
      const cleaned = textResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(cleaned)
      scores = {
        pronunciation: Math.max(0, Math.min(100, Math.round(parsed.pronunciation) || 0)),
        fluency: Math.max(0, Math.min(100, Math.round(parsed.fluency) || 0)),
        coherence: Math.max(0, Math.min(100, Math.round(parsed.coherence) || 0)),
        overall: Math.max(0, Math.min(100, Math.round(parsed.overall) || 0)),
      }
      feedback = parsed.feedback || ''

      // Sanity check: if overall is 0 but others aren't, recalculate
      if (scores.overall === 0 && (scores.pronunciation > 0 || scores.fluency > 0)) {
        scores.overall = Math.round((scores.pronunciation + scores.fluency + scores.coherence) / 3)
      }
    } catch (parseErr) {
      console.error('Failed to parse Gemini response:', textResponse)
      
      // Try to extract numbers
      const numMatches = textResponse.match(/\d+/g)
      if (numMatches && numMatches.length >= 3) {
        const p = Math.min(100, parseInt(numMatches[0]) || 0)
        const f = Math.min(100, parseInt(numMatches[1]) || 0)
        const c = Math.min(100, parseInt(numMatches[2]) || 0)
        scores = {
          pronunciation: p,
          fluency: f,
          coherence: c,
          overall: numMatches[3] ? Math.min(100, parseInt(numMatches[3])) : Math.round((p + f + c) / 3),
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
