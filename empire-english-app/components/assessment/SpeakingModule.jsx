'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Square, SkipForward, ChevronRight, AlertTriangle } from 'lucide-react'
import { SPEAKING_DATA } from '../../lib/assessment-data'
import { MetallicCard, ImperialButton, GlowingBorder } from '../empire'
import ProgressBar from './ProgressBar'

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
  const [phase, setPhase] = useState('intro') // 'intro' | 'recording'
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  const parts = [
    SPEAKING_DATA.part_a_read_aloud,
    SPEAKING_DATA.part_b_spontaneous,
    SPEAKING_DATA.part_c_shadowing,
  ]
  const currentPart = parts[step]
  const partConfig = PART_CONFIG[step]
  const totalSteps = parts.length

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const newRecordings = [...recordings, { part: step, blob, duration: recordingTime }]
        setRecordings(newRecordings)
        stream.getTracks().forEach(t => t.stop())

        if (step + 1 < totalSteps) {
          setStep(step + 1)
          setPhase('intro')
        } else {
          onComplete(newRecordings)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1)
      }, 1000)
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
      setPhase('intro')
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

  // Mic error state
  if (micError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto text-center py-8"
      >
        <MetallicCard className="p-8">
          <AlertTriangle className="w-12 h-12 text-fire-glow mx-auto mb-4" />
          <h3 className="text-xl text-parchment font-bold mb-2 font-arabic">
            لم نتمكن من الوصول للميكروفون
          </h3>
          <p className="text-steel text-sm mb-6 font-arabic">
            يمكنك تخطي تجربة الصوت والمتابعة. سيتم تقييم مستواك بناءً على التجارب الأخرى.
          </p>
          <div className="flex gap-3 justify-center">
            <ImperialButton variant="outline" onClick={() => { setMicError(false); startRecording() }}>
              حاول مرة أخرى
            </ImperialButton>
            <ImperialButton variant="primary" onClick={skipAll}>
              تخطي وأكمل
              <ChevronRight className="w-4 h-4 ml-2" />
            </ImperialButton>
          </div>
        </MetallicCard>
      </motion.div>
    )
  }

  return (
    <motion.div
      key={`speaking-${step}-${phase}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <ProgressBar current={step} total={totalSteps} label="تجربة الصوت" sublabel="Trial of Voice" />

      {/* Part indicator */}
      <div className="flex gap-1 mb-6">
        {PART_CONFIG.map((config, i) => (
          <div
            key={config.key}
            className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{
              backgroundColor: i === step
                ? config.color
                : i < step
                  ? `${config.color}60`
                  : 'rgba(139, 145, 154, 0.15)',
            }}
          />
        ))}
      </div>

      {/* Part Header */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <div
          className="w-12 h-12 rounded-full border-2 flex items-center justify-center"
          style={{
            borderColor: partConfig.color,
            boxShadow: `0 0 12px ${partConfig.color}30`,
            backgroundColor: `${partConfig.color}10`,
          }}
        >
          <span className="text-xl">{partConfig.icon}</span>
        </div>
        <div>
          <h3 className="text-parchment font-bold">{currentPart.title}</h3>
          <p className="text-xs font-arabic text-muted-gold">{currentPart.title_ar}</p>
        </div>
        <span
          className="ml-auto px-3 py-1 rounded-full text-[10px] tracking-wider uppercase border"
          style={{
            color: partConfig.color,
            borderColor: `${partConfig.color}40`,
            backgroundColor: `${partConfig.color}10`,
          }}
        >
          {partConfig.empireTitle}
        </span>
      </motion.div>

      {/* Instructions */}
      <MetallicCard className="p-5 mb-5">
        <p className="text-steel text-sm font-arabic leading-relaxed">{currentPart.instructions_ar}</p>
      </MetallicCard>

      {/* Content Card */}
      <GlowingBorder intensity={isRecording ? 'high' : 'low'} color={partConfig.color === '#D4AF37' ? 'gold' : partConfig.color === '#cd7f32' ? 'bronze' : 'fire'}>
        <MetallicCard hover={false} glowOnHover={false} className="p-6">
          <div dir="ltr">
            {step === 0 && (
              <p className="text-parchment text-lg leading-relaxed font-body">{currentPart.passage}</p>
            )}
            {step === 1 && (
              <div>
                <p className="text-parchment text-lg font-body mb-3">{currentPart.prompt}</p>
                <p className="text-muted-gold text-base font-arabic" dir="rtl">{currentPart.prompt_ar}</p>
              </div>
            )}
            {step === 2 && (
              <div className="text-center">
                <p className="text-parchment text-xl font-body italic leading-relaxed">
                  &ldquo;{currentPart.text_to_repeat}&rdquo;
                </p>
                <p className="text-muted-gold text-sm mt-3">Listen carefully, then repeat with the same rhythm.</p>
              </div>
            )}
          </div>
        </MetallicCard>
      </GlowingBorder>

      {/* Recording Controls */}
      <div className="mt-8 flex flex-col items-center gap-4">
        <AnimatePresence mode="wait">
          {isRecording ? (
            <motion.div
              key="recording"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-4"
            >
              {/* Recording indicator */}
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-4 h-4 bg-ember rounded-full"
                  animate={{ opacity: [1, 0.3, 1], scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-3xl font-bold text-parchment tabular-nums">{formatTime(recordingTime)}</span>
              </div>

              {/* Waveform */}
              <div className="flex items-center gap-0.5 h-8">
                {[...Array(30)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 rounded-full"
                    style={{ backgroundColor: partConfig.color }}
                    animate={{ height: [4, 8 + Math.random() * 20, 4] }}
                    transition={{ duration: 0.3 + Math.random() * 0.4, repeat: Infinity, delay: i * 0.02 }}
                  />
                ))}
              </div>

              {/* Stop button */}
              <ImperialButton variant="danger" size="lg" onClick={stopRecording}>
                <Square className="w-5 h-5 mr-2" />
                <span className="font-arabic">إيقاف التسجيل</span>
              </ImperialButton>

              {/* Duration hint */}
              <p className="text-muted-gold text-xs font-arabic">
                المدة المقترحة: {currentPart.duration_seconds} ثانية
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-4"
            >
              {/* Start recording button */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <button
                  onClick={startRecording}
                  className="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${partConfig.color}, ${partConfig.color}CC)`,
                    boxShadow: `0 0 20px ${partConfig.color}40, 0 0 40px ${partConfig.color}20`,
                  }}
                >
                  <Mic className="w-8 h-8 text-sovereign-black" />
                </button>
              </motion.div>
              <p className="text-parchment text-sm font-arabic">اضغط لبدء التسجيل</p>

              {/* Skip option */}
              <button
                onClick={skipPart}
                className="flex items-center gap-1.5 text-steel text-sm hover:text-muted-gold transition-colors mt-2"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span className="font-arabic">تخطي هذا الجزء</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
