'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, SkipForward, ChevronRight, AlertTriangle, Clock } from 'lucide-react'
import { SPEAKING_DATA } from '../../lib/assessment-data'
import { MetallicCard, ImperialButton, GlowingBorder } from '../empire'
import ProgressBar from './ProgressBar'
import { scoreSpeech, createRecognizer, isSpeechRecognitionSupported } from '../../lib/speech-scorer'

const PART_CONFIG = [
  { key: 'read_aloud', icon: '📖', color: '#cd7f32', empireTitle: 'The Voice Trial' },
  { key: 'spontaneous', icon: '💬', color: '#D4AF37', empireTitle: 'The Expression Trial' },
  { key: 'shadowing', icon: '🎭', color: '#ff6b35', empireTitle: 'The Echo Trial' },
]

export default function SpeakingModule({ onComplete }) {
  const [step, setStep] = useState(0)
  const [recordings, setRecordings] = useState([])
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [micError, setMicError] = useState(false)
  const [phase, setPhase] = useState('ready') // 'ready' | 'recording' | 'done'
  const [maxTime, setMaxTime] = useState(0)
  const [evalResult, setEvalResult] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [liveTranscript, setLiveTranscript] = useState('')

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const recognizerRef = useRef(null)
  const transcriptRef = useRef('')

  const parts = [
    SPEAKING_DATA.part_a_read_aloud,
    SPEAKING_DATA.part_b_spontaneous,
    SPEAKING_DATA.part_c_shadowing,
  ]
  const currentPart = parts[step]
  const partConfig = PART_CONFIG[step]
  const totalSteps = parts.length

  useEffect(() => {
    setMaxTime(currentPart.duration_seconds)
  }, [step, currentPart])

  // Auto-stop when max time reached
  useEffect(() => {
    if (isRecording && recordingTime >= maxTime && maxTime > 0) {
      stopRecording()
    }
  }, [recordingTime, maxTime, isRecording])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      transcriptRef.current = ''
      setTranscript('')
      setLiveTranscript('')

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        
        // Stop speech recognition
        if (recognizerRef.current) {
          try { recognizerRef.current.stop() } catch {}
        }

        // Get final transcript
        const finalTranscript = transcriptRef.current.trim()
        setTranscript(finalTranscript)

        // Score using transcript comparison
        let expectedText = ''
        let partType = 'read_aloud'
        if (step === 0) {
          expectedText = currentPart.passage
          partType = 'read_aloud'
        } else if (step === 1) {
          expectedText = currentPart.prompt
          partType = 'spontaneous'
        } else {
          expectedText = currentPart.text_to_repeat
          partType = 'shadowing'
        }

        const scores = scoreSpeech(finalTranscript, expectedText, partType, recordingTime, maxTime)
        
        const newRecordings = [...recordings, { part: step, duration: recordingTime, scores, transcript: finalTranscript, feedback: scores.feedback }]
        setRecordings(newRecordings)
        setEvalResult(scores)
        setPhase('done')

        // Auto-advance after showing result
        setTimeout(() => {
          if (step + 1 < totalSteps) {
            setStep(step + 1)
            setPhase('ready')
            setEvalResult(null)
            setLiveTranscript('')
          } else {
            onComplete(newRecordings)
          }
        }, 3000)
      }

      // Start MediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      setPhase('recording')
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1)
      }, 1000)

      // Start Speech Recognition (runs in parallel with recording)
      if (isSpeechRecognitionSupported()) {
        const recognizer = createRecognizer()
        recognizerRef.current = recognizer

        recognizer.onresult = (event) => {
          let interim = ''
          let final = ''
          for (let i = 0; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript + ' '
            } else {
              interim += event.results[i][0].transcript
            }
          }
          transcriptRef.current = final.trim()
          setLiveTranscript(final + interim)
        }

        recognizer.onerror = (event) => {
          console.warn('Speech recognition error:', event.error)
        }

        recognizer.onend = () => {
          // Restart if still recording (recognition can auto-stop)
          if (isRecording && mediaRecorderRef.current?.state === 'recording') {
            try { recognizer.start() } catch {}
          }
        }

        recognizer.start()
      }
    } catch (err) {
      setMicError(true)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      clearInterval(timerRef.current)
    }
  }

  const skipPart = () => {
    if (step + 1 < totalSteps) {
      setStep(step + 1)
      setPhase('ready')
      setEvalResult(null)
      setLiveTranscript('')
    } else {
      onComplete(recordings)
    }
  }

  const skipAll = () => {
    onComplete(recordings)
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const timerPct = maxTime > 0 ? Math.min(100, (recordingTime / maxTime) * 100) : 0
  const timeWarning = maxTime > 0 && (maxTime - recordingTime) <= 10

  // Mic error state
  if (micError) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto text-center py-8">
        <MetallicCard className="p-8">
          <AlertTriangle className="w-12 h-12 text-fire-glow mx-auto mb-4" />
          <h3 className="text-xl text-parchment font-bold mb-2 font-arabic">لم نتمكن من الوصول للميكروفون</h3>
          <p className="text-steel text-sm mb-6 font-arabic">يمكنك تخطي تجربة الصوت والمتابعة.</p>
          <div className="flex gap-3 justify-center">
            <ImperialButton variant="outline" onClick={() => { setMicError(false) }}>حاول مرة أخرى</ImperialButton>
            <ImperialButton variant="primary" onClick={skipAll}>تخطي وأكمل <ChevronRight className="w-4 h-4 ml-2" /></ImperialButton>
          </div>
        </MetallicCard>
      </motion.div>
    )
  }

  return (
    <motion.div key={`speaking-${step}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
      <ProgressBar current={step} total={totalSteps} label="تجربة الصوت" sublabel="Trial of Voice" />

      {/* Part indicator */}
      <div className="flex gap-1 mb-6">
        {PART_CONFIG.map((config, i) => (
          <div key={config.key} className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: i === step ? config.color : i < step ? `${config.color}60` : 'rgba(139, 145, 154, 0.15)' }} />
        ))}
      </div>

      {/* Part Header */}
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center"
          style={{ borderColor: partConfig.color, boxShadow: `0 0 12px ${partConfig.color}30`, backgroundColor: `${partConfig.color}10` }}>
          <span className="text-xl">{partConfig.icon}</span>
        </div>
        <div>
          <h3 className="text-parchment font-bold">{currentPart.title}</h3>
          <p className="text-xs font-arabic text-muted-gold">{currentPart.title_ar}</p>
        </div>
        <span className="ml-auto px-3 py-1 rounded-full text-[10px] tracking-wider uppercase border"
          style={{ color: partConfig.color, borderColor: `${partConfig.color}40`, backgroundColor: `${partConfig.color}10` }}>
          Part {step + 1}/{totalSteps}
        </span>
      </motion.div>

      {/* Instructions */}
      <MetallicCard className="p-5 mb-5">
        <p className="text-steel text-sm font-arabic leading-relaxed">{currentPart.instructions_ar}</p>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[rgba(212,175,55,0.08)]">
          <Clock className="w-3.5 h-3.5 text-muted-gold" />
          <span className="text-xs text-muted-gold">Max: {currentPart.duration_seconds}s</span>
          {!isSpeechRecognitionSupported() && (
            <span className="text-xs text-fire-glow ml-auto">⚠️ Speech recognition not supported in this browser</span>
          )}
        </div>
      </MetallicCard>

      {/* Content Card */}
      <GlowingBorder intensity={phase === 'recording' ? 'high' : 'low'}
        color={partConfig.color === '#D4AF37' ? 'gold' : partConfig.color === '#cd7f32' ? 'bronze' : 'fire'}>
        <MetallicCard hover={false} glowOnHover={false} className="p-6">
          <div dir="ltr">
            {step === 0 && <p className="text-parchment text-lg leading-relaxed font-body">{currentPart.passage}</p>}
            {step === 1 && (
              <div>
                <p className="text-parchment text-lg font-body mb-3">{currentPart.prompt}</p>
                <p className="text-muted-gold text-base font-arabic" dir="rtl">{currentPart.prompt_ar}</p>
              </div>
            )}
            {step === 2 && (
              <div className="text-center">
                <p className="text-parchment text-xl font-body italic leading-relaxed">&ldquo;{currentPart.text_to_repeat}&rdquo;</p>
                <p className="text-muted-gold text-sm mt-3 font-arabic">استمع ثم كرّر الجملة</p>
              </div>
            )}
          </div>
        </MetallicCard>
      </GlowingBorder>

      {/* Live Transcript (during recording) */}
      {phase === 'recording' && liveTranscript && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-3 bg-[rgba(10,10,15,0.6)] rounded-lg border border-[rgba(212,175,55,0.1)]">
          <p className="text-xs text-muted-gold mb-1">🎤 Detected speech:</p>
          <p className="text-sm text-parchment" dir="ltr">{liveTranscript}</p>
        </motion.div>
      )}

      {/* Recording Controls */}
      <div className="mt-8 flex flex-col items-center gap-4">
        <AnimatePresence mode="wait">
          {phase === 'recording' ? (
            <motion.div key="recording" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center gap-4 w-full">
              {/* Timer */}
              <div className="flex items-center gap-3">
                <motion.div className="w-4 h-4 bg-ember rounded-full" animate={{ opacity: [1, 0.3, 1], scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                <span className={`text-3xl font-bold tabular-nums ${timeWarning ? 'text-ember' : 'text-parchment'}`}>{formatTime(recordingTime)}</span>
                <span className="text-steel text-sm">/ {formatTime(maxTime)}</span>
              </div>

              {/* Timer bar */}
              <div className="w-full max-w-xs h-1.5 bg-midnight-navy rounded-full overflow-hidden">
                <motion.div className={`h-full rounded-full ${timeWarning ? 'bg-ember' : 'bg-imperial-gold'}`} style={{ width: `${timerPct}%` }} transition={{ duration: 0.5 }} />
              </div>

              {/* Visual bars */}
              <div className="flex items-center gap-0.5 h-8">
                {[...Array(25)].map((_, i) => (
                  <motion.div key={i} className="w-1 rounded-full origin-bottom" style={{ backgroundColor: partConfig.color, height: '100%' }}
                    animate={{ scaleY: [0.15, 0.3 + Math.random() * 0.7, 0.15] }}
                    transition={{ duration: 0.3 + Math.random() * 0.3, repeat: Infinity, delay: i * 0.02 }} />
                ))}
              </div>

              {/* Stop button */}
              <ImperialButton variant="danger" size="lg" onClick={stopRecording}>
                <Square className="w-5 h-5 mr-2" /><span className="font-arabic">إيقاف التسجيل</span>
              </ImperialButton>

              {timeWarning && <p className="text-ember text-xs font-arabic animate-pulse">⚠️ الوقت ينفد!</p>}
            </motion.div>
          ) : phase === 'done' ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center gap-4 w-full max-w-xs">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
                className="w-14 h-14 rounded-full bg-[rgba(74,222,128,0.1)] border-2 border-[#4ade80] flex items-center justify-center">
                <span className="text-xl">✓</span>
              </motion.div>

              {/* Scores */}
              {evalResult && (
                <div className="w-full space-y-2 bg-[rgba(10,10,15,0.6)] rounded-lg p-4 border border-[rgba(212,175,55,0.1)]">
                  <div className="flex justify-between text-xs"><span className="text-steel">Pronunciation</span><span className="text-imperial-gold font-bold">{evalResult.pronunciation}%</span></div>
                  <div className="flex justify-between text-xs"><span className="text-steel">Fluency</span><span className="text-imperial-gold font-bold">{evalResult.fluency}%</span></div>
                  <div className="flex justify-between text-xs"><span className="text-steel">Coherence</span><span className="text-imperial-gold font-bold">{evalResult.coherence}%</span></div>
                  <div className="h-px bg-[rgba(212,175,55,0.15)] my-1" />
                  <div className="flex justify-between text-sm"><span className="text-parchment font-bold">Overall</span><span className="text-imperial-gold font-bold">{evalResult.overall}%</span></div>
                  {evalResult.feedback && <p className="text-muted-gold text-xs font-arabic mt-2 text-center">{evalResult.feedback}</p>}
                </div>
              )}

              {/* Show what was detected */}
              {transcript && (
                <div className="w-full text-center">
                  <p className="text-xs text-steel">Detected: <span className="text-parchment" dir="ltr">{transcript.slice(0, 80)}{transcript.length > 80 ? '...' : ''}</span></p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="ready" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <button onClick={startRecording} className="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300"
                  style={{ background: `linear-gradient(135deg, ${partConfig.color}, ${partConfig.color}CC)`, boxShadow: `0 0 20px ${partConfig.color}40, 0 0 40px ${partConfig.color}20` }}>
                  <Mic className="w-8 h-8 text-sovereign-black" />
                </button>
              </motion.div>
              <p className="text-parchment text-sm font-arabic">اضغط لبدء التسجيل</p>
              <button onClick={skipPart} className="flex items-center gap-1.5 text-steel text-sm hover:text-muted-gold transition-colors mt-2">
                <SkipForward className="w-3.5 h-3.5" /><span className="font-arabic">تخطي هذا الجزء</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
