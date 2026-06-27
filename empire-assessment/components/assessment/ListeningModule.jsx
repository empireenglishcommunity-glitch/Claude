'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Headphones, Play, Pause, Volume2, ChevronRight, RotateCcw } from 'lucide-react'
import { LISTENING_DATA } from '../../lib/assessment-data'
import { MetallicCard, ImperialButton, GlowingBorder } from '../empire'
import MCQQuestion from './MCQQuestion'
import ProgressBar from './ProgressBar'

// Speed config
const SPEED_CONFIG = {
  slow: { label: 'Slow March', label_ar: 'المسيرة البطيئة', color: '#8b7355', icon: '🐢', rate: 0.75 },
  natural: { label: 'Steady Pace', label_ar: 'الإيقاع الثابت', color: '#D4AF37', icon: '🏃', rate: 1.0 },
  rapid: { label: 'Battle Speed', label_ar: 'سرعة المعركة', color: '#ff6b35', icon: '⚡', rate: 1.3 },
}

export default function ListeningModule({ onComplete }) {
  const [sectionIdx, setSectionIdx] = useState(0)
  const [questionIdx, setQuestionIdx] = useState(0)
  const [answers, setAnswers] = useState([])
  const [phase, setPhase] = useState('listen') // 'listen' | 'questions'

  // Audio states
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasPlayed, setHasPlayed] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const [speechSupported, setSpeechSupported] = useState(true)
  const utteranceRef = useRef(null)
  const progressIntervalRef = useRef(null)

  const allQuestions = LISTENING_DATA.sections.flatMap(s => s.questions)
  const totalQ = allQuestions.length
  const currentSection = LISTENING_DATA.sections[sectionIdx]
  const currentQ = currentSection?.questions[questionIdx]
  const speedConfig = SPEED_CONFIG[currentSection?.id] || SPEED_CONFIG.slow

  // Check Speech Synthesis support
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.speechSynthesis) {
      setSpeechSupported(false)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  // Calculate overall progress
  let overallIdx = 0
  for (let s = 0; s < sectionIdx; s++) {
    overallIdx += LISTENING_DATA.sections[s].questions.length
  }
  overallIdx += questionIdx

  const playAudio = useCallback(() => {
    if (!window.speechSynthesis) {
      setSpeechSupported(false)
      return
    }

    // Cancel any previous speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(currentSection.transcript)
    utterance.rate = speedConfig.rate
    utterance.pitch = 1.0
    utterance.lang = 'en-US'

    // Try to find a good English voice
    const voices = window.speechSynthesis.getVoices()
    const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
                         voices.find(v => v.lang.startsWith('en-US')) ||
                         voices.find(v => v.lang.startsWith('en'))
    if (englishVoice) {
      utterance.voice = englishVoice
    }

    // Estimate duration for progress bar (rough: ~150 words/min at rate 1.0)
    const wordCount = currentSection.transcript.split(' ').length
    const estimatedDuration = (wordCount / 150) * 60 * (1 / speedConfig.rate) * 1000
    const startTime = Date.now()

    utterance.onstart = () => {
      setIsPlaying(true)
      setAudioProgress(0)
      // Progress tracker
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(100, (elapsed / estimatedDuration) * 100)
        setAudioProgress(progress)
      }, 100)
    }

    utterance.onend = () => {
      setIsPlaying(false)
      setHasPlayed(true)
      setAudioProgress(100)
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }

    utterance.onerror = () => {
      setIsPlaying(false)
      setHasPlayed(true)
      setAudioProgress(100)
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [currentSection, speedConfig])

  const pauseAudio = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.pause()
      setIsPlaying(false)
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }

  const resumeAudio = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.resume()
      setIsPlaying(true)
    }
  }

  const replayAudio = () => {
    setAudioProgress(0)
    setHasPlayed(false)
    playAudio()
  }

  const handleAnswer = (selected, elapsed) => {
    const correct = selected === currentQ.answer
    const newAnswers = [...answers, { id: currentQ.id, selected, correct, elapsed }]
    setAnswers(newAnswers)

    if (questionIdx + 1 < currentSection.questions.length) {
      setQuestionIdx(questionIdx + 1)
    } else if (sectionIdx + 1 < LISTENING_DATA.sections.length) {
      setSectionIdx(sectionIdx + 1)
      setQuestionIdx(0)
      setPhase('listen')
      setHasPlayed(false)
      setAudioProgress(0)
      setIsPlaying(false)
    } else {
      onComplete(newAnswers)
    }
  }

  // Listening phase
  if (phase === 'listen') {
    return (
      <motion.div
        key={`listen-${sectionIdx}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="max-w-2xl mx-auto"
      >
        <ProgressBar current={overallIdx} total={totalQ} label="تجربة السمع" sublabel="Trial of the Ear" />

        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <div
            className="w-10 h-10 rounded-full border-2 flex items-center justify-center"
            style={{
              borderColor: speedConfig.color,
              boxShadow: `0 0 12px ${speedConfig.color}30`,
              backgroundColor: `${speedConfig.color}10`,
            }}
          >
            <span className="text-lg">{speedConfig.icon}</span>
          </div>
          <div>
            <h3 className="text-parchment font-bold text-sm">{currentSection.label}</h3>
            <p className="text-xs" style={{ color: speedConfig.color }}>{speedConfig.label} — {currentSection.speed}</p>
          </div>
          <span className="ml-auto px-2 py-1 rounded text-[10px] text-steel border border-steel/20 bg-midnight-navy">
            {currentSection.level_target}
          </span>
        </motion.div>

        {/* Speed progression */}
        <div className="flex gap-1 mb-6">
          {LISTENING_DATA.sections.map((section, i) => (
            <div
              key={section.id}
              className="flex-1 h-1 rounded-full transition-all duration-300"
              style={{
                backgroundColor: i === sectionIdx
                  ? SPEED_CONFIG[section.id]?.color || '#8B919A'
                  : i < sectionIdx
                    ? `${SPEED_CONFIG[section.id]?.color || '#8B919A'}60`
                    : 'rgba(139, 145, 154, 0.15)',
              }}
            />
          ))}
        </div>

        {/* Audio Card */}
        <GlowingBorder intensity={isPlaying ? 'medium' : 'low'} color={speedConfig.color === '#D4AF37' ? 'gold' : speedConfig.color === '#ff6b35' ? 'fire' : 'bronze'}>
          <MetallicCard hover={false} glowOnHover={false} className="p-6">
            {/* Audio Controls */}
            <div className="flex items-center gap-4 mb-5">
              {/* Play/Pause Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (!hasPlayed && !isPlaying) {
                    playAudio()
                  } else if (isPlaying) {
                    pauseAudio()
                  } else {
                    resumeAudio()
                  }
                }}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all shrink-0"
                style={{
                  backgroundColor: isPlaying ? `${speedConfig.color}30` : speedConfig.color,
                  border: `2px solid ${speedConfig.color}`,
                }}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" style={{ color: speedConfig.color }} />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" style={{ color: isPlaying ? speedConfig.color : '#0A0A0F' }} />
                )}
              </motion.button>

              <div className="flex-1">
                {/* Status text */}
                <div className="flex items-center gap-2 mb-2">
                  {isPlaying && (
                    <motion.div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: speedConfig.color }}
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                  <span className="text-sm text-parchment">
                    {!hasPlayed && !isPlaying ? 'Press play to listen' : 
                     isPlaying ? 'Listening...' : 
                     'Audio complete'}
                  </span>
                  {hasPlayed && !isPlaying && (
                    <button
                      onClick={replayAudio}
                      className="ml-auto flex items-center gap-1 text-xs text-muted-gold hover:text-imperial-gold transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Replay
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-[rgba(10,10,15,0.6)] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: speedConfig.color }}
                    animate={{ width: `${audioProgress}%` }}
                    transition={{ duration: 0.1, ease: 'linear' }}
                  />
                </div>
              </div>
            </div>

            {/* Waveform - only shows when playing */}
            {isPlaying && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-center gap-0.5 mb-4 py-2"
              >
                {[...Array(40)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 rounded-full"
                    style={{ backgroundColor: speedConfig.color }}
                    animate={{ height: [3, 6 + Math.random() * 14, 3] }}
                    transition={{ duration: 0.4 + Math.random() * 0.4, repeat: Infinity, delay: i * 0.03 }}
                  />
                ))}
              </motion.div>
            )}

            {/* Transcript (hidden during playback if speech is supported, shown as fallback) */}
            {(!speechSupported || hasPlayed) && (
              <div className="bg-[rgba(10,10,15,0.6)] rounded-lg p-5 border border-[rgba(212,175,55,0.08)]">
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="w-3.5 h-3.5 text-muted-gold" />
                  <span className="text-xs text-muted-gold uppercase tracking-wider">Transcript</span>
                </div>
                <p className="text-parchment leading-relaxed text-base font-body" dir="ltr">
                  {currentSection.transcript}
                </p>
              </div>
            )}

            {/* Fallback message if no speech synthesis */}
            {!speechSupported && (
              <div className="mt-4 p-3 rounded-lg bg-[rgba(212,175,55,0.05)] border border-[rgba(212,175,55,0.15)]">
                <p className="text-muted-gold text-xs font-arabic text-center">
                  متصفحك لا يدعم الصوت. اقرأ النص أعلاه بتركيز كأنك تسمعه بسرعة "{speedConfig.label_ar}".
                </p>
              </div>
            )}

            {/* Instructions */}
            <p className="text-muted-gold text-sm font-arabic mt-4 text-center">
              {!hasPlayed && speechSupported
                ? 'اضغط زر التشغيل للاستماع. لن تتمكن من رؤية النص أثناء الاستماع.'
                : 'عندما تكون مستعدًا، اضغط للانتقال للأسئلة.'}
            </p>
          </MetallicCard>
        </GlowingBorder>

        {/* Continue button - enabled after audio plays (or immediately if no speech support) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6"
        >
          <ImperialButton
            variant="primary"
            size="lg"
            className="w-full"
            disabled={speechSupported && !hasPlayed && !isPlaying}
            onClick={() => {
              // Stop any playing audio
              if (window.speechSynthesis) {
                window.speechSynthesis.cancel()
              }
              setIsPlaying(false)
              setPhase('questions')
            }}
          >
            <span className="font-arabic">
              {speechSupported && !hasPlayed ? 'استمع أولاً ثم أكمل' : 'مستعد — ابدأ الأسئلة'}
            </span>
            <ChevronRight className="w-5 h-5 ml-2" />
          </ImperialButton>
        </motion.div>
      </motion.div>
    )
  }

  // Questions phase
  if (!currentQ) return null

  return (
    <motion.div
      key={`q-${overallIdx}`}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <ProgressBar current={overallIdx} total={totalQ} label="تجربة السمع" sublabel="Trial of the Ear" />

      {/* Section context */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 mb-4"
      >
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold tracking-wider uppercase border"
          style={{
            color: speedConfig.color,
            borderColor: `${speedConfig.color}40`,
            backgroundColor: `${speedConfig.color}10`,
          }}
        >
          <Headphones className="w-3 h-3" />
          {speedConfig.label}
        </span>
        <span className="text-xs text-steel">
          Q{questionIdx + 1}/{currentSection.questions.length}
        </span>
      </motion.div>

      <MCQQuestion
        question={currentQ.question}
        questionText={currentQ.question}
        options={currentQ.options}
        onAnswer={handleAnswer}
        index={overallIdx}
        total={totalQ}
        timeLimit={35}
      />
    </motion.div>
  )
}
