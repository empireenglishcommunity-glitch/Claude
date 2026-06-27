'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { BookOpen } from 'lucide-react'
import { VOCABULARY_DATA } from '../../lib/assessment-data'
import MCQQuestion from './MCQQuestion'
import ProgressBar from './ProgressBar'

// Band display config
const BAND_CONFIG = {
  '1-500': { label: 'Foundation Words', label_ar: 'كلمات أساسية', color: '#8b7355', level: 'L0' },
  '500-1000': { label: 'Common Words', label_ar: 'كلمات شائعة', color: '#cd7f32', level: 'L0-L1' },
  '1000-1500': { label: 'Intermediate Words', label_ar: 'كلمات متوسطة', color: '#D4AF37', level: 'L1' },
  '1500-2000': { label: 'Intermediate+', label_ar: 'متوسط متقدم', color: '#D4AF37', level: 'L1-L2' },
  '2000-2500': { label: 'Advanced Words', label_ar: 'كلمات متقدمة', color: '#ff6b35', level: 'L2' },
  '2500-3000': { label: 'Advanced+', label_ar: 'متقدم عالي', color: '#ff6b35', level: 'L2-L3' },
  '3000-4000': { label: 'Elite Words', label_ar: 'كلمات النخبة', color: '#e74c3c', level: 'L3' },
  '4000-5000': { label: 'Master Words', label_ar: 'كلمات التمكن', color: '#e74c3c', level: 'L3+' },
}

// Simple seeded shuffle for question order
function shuffleWithSeed(array, seed) {
  const result = [...array]
  let s = seed
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const j = ((s >>> 0) % (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Shuffle options within a question (keep answer mapping)
function shuffleOptions(question, seed) {
  const originalOptions = [...question.options]
  const shuffled = shuffleWithSeed(originalOptions, seed)
  return {
    ...question,
    options: shuffled,
    // answer stays the same (it's matched by value, not index)
  }
}

export default function VocabularyModule({ onComplete }) {
  // Generate a session seed on mount (prevents refresh exploit)
  const sessionSeed = useMemo(() => Math.floor(Math.random() * 1000000), [])
  
  // Shuffle questions within bands (preserving band order progression)
  const questions = useMemo(() => {
    const bands = {}
    VOCABULARY_DATA.questions.forEach(q => {
      if (!bands[q.band]) bands[q.band] = []
      bands[q.band].push(q)
    })
    
    // Shuffle within each band, then concatenate in band order
    const bandOrder = Object.keys(BAND_CONFIG)
    let result = []
    bandOrder.forEach((band, bandIdx) => {
      if (bands[band]) {
        const shuffledBand = shuffleWithSeed(bands[band], sessionSeed + bandIdx * 7)
        // Shuffle options for each question
        result = result.concat(shuffledBand.map((q, qi) => shuffleOptions(q, sessionSeed + qi * 13)))
      }
    })
    return result
  }, [sessionSeed])

  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState([])

  const total = questions.length
  const currentQ = questions[currentIdx]
  const bandConfig = BAND_CONFIG[currentQ?.band] || { label: 'Unknown', color: '#8B919A' }

  // Track which band we're in for UI
  const currentBandQuestions = questions.filter(q => q.band === currentQ?.band)
  const bandProgress = currentBandQuestions.indexOf(currentQ) + 1
  const bandTotal = currentBandQuestions.length

  const handleAnswer = (selected, elapsed) => {
    const correct = selected === currentQ.answer
    const newAnswers = [...answers, { 
      id: currentQ.id, 
      selected, 
      correct, 
      band: currentQ.band,
      elapsed,
      word: currentQ.word,
    }]
    setAnswers(newAnswers)

    if (currentIdx + 1 < total) {
      setCurrentIdx(currentIdx + 1)
    } else {
      onComplete(newAnswers)
    }
  }

  if (!currentQ) return null

  return (
    <div>
      {/* Module Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <ProgressBar current={currentIdx} total={total} label="تجربة الكلمات" sublabel="Trial of Words" />
      </motion.div>

      {/* Band Indicator */}
      <motion.div
        key={currentQ.band}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-4 flex flex-wrap items-center gap-2"
      >
        {/* Band badge */}
        <span 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold tracking-wider uppercase border"
          style={{ 
            color: bandConfig.color, 
            borderColor: `${bandConfig.color}40`,
            backgroundColor: `${bandConfig.color}10`,
          }}
        >
          <BookOpen className="w-3 h-3" />
          {bandConfig.label}
        </span>

        {/* Level indicator */}
        <span className="px-2 py-1 rounded text-[10px] text-steel border border-steel/20 bg-midnight-navy">
          {bandConfig.level}
        </span>

        {/* Band progress */}
        <span className="text-xs text-muted-gold ml-auto">
          Band {bandProgress}/{bandTotal}
        </span>
      </motion.div>

      {/* Difficulty visual */}
      <div className="flex gap-1 mb-6">
        {Object.keys(BAND_CONFIG).map((band) => (
          <div
            key={band}
            className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{
              backgroundColor: band === currentQ.band 
                ? BAND_CONFIG[band].color 
                : 'rgba(139, 145, 154, 0.15)',
            }}
          />
        ))}
      </div>

      {/* Question */}
      <MCQQuestion
        question={currentQ.id}
        questionText={currentQ.sentence}
        options={currentQ.options}
        onAnswer={handleAnswer}
        index={currentIdx}
        total={total}
        timeLimit={30}
      />
    </div>
  )
}
