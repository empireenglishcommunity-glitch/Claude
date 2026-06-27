'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Headphones, Play, Volume2, ChevronRight } from 'lucide-react'
import { LISTENING_DATA } from '../../lib/assessment-data'
import { MetallicCard, ImperialButton, GlowingBorder } from '../empire'
import MCQQuestion from './MCQQuestion'
import ProgressBar from './ProgressBar'

// Speed config for visual indicators
const SPEED_CONFIG = {
  slow: { label: 'Slow March', label_ar: 'المسيرة البطيئة', color: '#8b7355', icon: '🐢' },
  natural: { label: 'Steady Pace', label_ar: 'الإيقاع الثابت', color: '#D4AF37', icon: '🏃' },
  rapid: { label: 'Battle Speed', label_ar: 'سرعة المعركة', color: '#ff6b35', icon: '⚡' },
}

export default function ListeningModule({ onComplete }) {
  const [sectionIdx, setSectionIdx] = useState(0)
  const [questionIdx, setQuestionIdx] = useState(0)
  const [answers, setAnswers] = useState([])
  const [phase, setPhase] = useState('listen') // 'listen' | 'questions'

  const allQuestions = LISTENING_DATA.sections.flatMap(s => s.questions)
  const totalQ = allQuestions.length
  const currentSection = LISTENING_DATA.sections[sectionIdx]
  const currentQ = currentSection?.questions[questionIdx]
  const speedConfig = SPEED_CONFIG[currentSection?.id] || SPEED_CONFIG.slow

  // Calculate overall progress
  let overallIdx = 0
  for (let s = 0; s < sectionIdx; s++) {
    overallIdx += LISTENING_DATA.sections[s].questions.length
  }
  overallIdx += questionIdx

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
    } else {
      onComplete(newAnswers)
    }
  }

  // Listening phase - show transcript (simulating audio)
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

        {/* Audio simulation card */}
        <GlowingBorder intensity="low" color={speedConfig.color === '#D4AF37' ? 'gold' : speedConfig.color === '#ff6b35' ? 'fire' : 'bronze'}>
          <MetallicCard hover={false} glowOnHover={false} className="p-6">
            {/* Playback indicator */}
            <div className="flex items-center gap-3 mb-5">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${speedConfig.color}20`, border: `2px solid ${speedConfig.color}` }}
              >
                <Volume2 className="w-5 h-5" style={{ color: speedConfig.color }} />
              </motion.div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <motion.div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: speedConfig.color }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <span className="text-sm text-parchment">Audio Playing...</span>
                </div>
                {/* Fake waveform */}
                <div className="flex items-center gap-0.5 mt-2">
                  {[...Array(40)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1 rounded-full"
                      style={{ backgroundColor: speedConfig.color }}
                      animate={{ height: [4, 8 + Math.random() * 12, 4] }}
                      transition={{ duration: 0.5 + Math.random() * 0.5, repeat: Infinity, delay: i * 0.05 }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Transcript */}
            <div className="bg-[rgba(10,10,15,0.6)] rounded-lg p-5 border border-[rgba(212,175,55,0.08)]">
              <p className="text-parchment leading-relaxed text-base font-body" dir="ltr">
                {currentSection.transcript}
              </p>
            </div>

            {/* Arabic instruction */}
            <p className="text-muted-gold text-sm font-arabic mt-4 text-center">
              اقرأ النص أعلاه بتركيز (يُحاكي مقطعًا صوتيًا). عندما تكون مستعدًا، اضغط للانتقال للأسئلة.
            </p>
          </MetallicCard>
        </GlowingBorder>

        {/* CTA */}
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
            onClick={() => setPhase('questions')}
          >
            <span className="font-arabic">مستعد — ابدأ الأسئلة</span>
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
