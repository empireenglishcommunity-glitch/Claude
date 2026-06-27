'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'
import { GRAMMAR_DATA } from '../../lib/assessment-data'
import MCQQuestion from './MCQQuestion'
import ProgressBar from './ProgressBar'

// Level display config
const LEVEL_CONFIG = {
  L0: { label: 'Foundation', label_ar: 'أساسي', color: '#8b7355', desc: 'Basic structures' },
  L1: { label: 'Initiate', label_ar: 'مبتدئ', color: '#cd7f32', desc: 'Intermediate grammar' },
  L2: { label: 'Warrior', label_ar: 'محارب', color: '#D4AF37', desc: 'Advanced structures' },
  L3: { label: 'Champion', label_ar: 'بطل', color: '#ff6b35', desc: 'Complex mastery' },
}

// Topic badge display
const TOPIC_DISPLAY = {
  'SVO order': 'Word Order',
  'To be': 'Verb To Be',
  'Present simple': 'Present Simple',
  'Negation': 'Negation',
  'Questions': 'Questions',
  'Present continuous': 'Present Continuous',
  'Past simple': 'Past Simple',
  'Future': 'Future Tenses',
  'Articles': 'Articles',
  'Prepositions': 'Prepositions',
  'Comparatives': 'Comparatives',
  'Count/uncount': 'Count/Uncount',
  'Present perfect': 'Present Perfect',
  'Present perfect vs past': 'Perf. vs Past',
  'Passive voice': 'Passive Voice',
  'Reported speech': 'Reported Speech',
  'Conditionals (1st)': '1st Conditional',
  'Relative clauses': 'Relative Clauses',
  'Modal verbs': 'Modal Verbs',
  'Gerund vs infinitive': 'Gerund/Infinitive',
  'Conditionals (2nd)': '2nd Conditional',
  'Conditionals (3rd)': '3rd Conditional',
  'Inversion': 'Inversion',
  'Subjunctive': 'Subjunctive',
  'Complex passive': 'Complex Passive',
}

// Simple seeded shuffle
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

// Shuffle options within a question
function shuffleOptions(question, seed) {
  const originalOptions = [...question.options]
  const shuffled = shuffleWithSeed(originalOptions, seed)
  return { ...question, options: shuffled }
}

export default function GrammarModule({ onComplete }) {
  const sessionSeed = useMemo(() => Math.floor(Math.random() * 1000000), [])

  // Shuffle questions within each level group, preserve level progression
  const questions = useMemo(() => {
    const levels = { L0: [], L1: [], L2: [], L3: [] }
    GRAMMAR_DATA.questions.forEach(q => {
      if (levels[q.level]) levels[q.level].push(q)
    })

    let result = []
    Object.entries(levels).forEach(([level, qs], levelIdx) => {
      const shuffled = shuffleWithSeed(qs, sessionSeed + levelIdx * 11)
      result = result.concat(shuffled.map((q, qi) => shuffleOptions(q, sessionSeed + qi * 17 + levelIdx)))
    })
    return result
  }, [sessionSeed])

  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState([])

  const total = questions.length
  const currentQ = questions[currentIdx]
  const levelConfig = LEVEL_CONFIG[currentQ?.level] || { label: 'Unknown', color: '#8B919A' }

  // Track level progress
  const currentLevelQuestions = questions.filter(q => q.level === currentQ?.level)
  const levelProgress = currentLevelQuestions.indexOf(currentQ) + 1
  const levelTotal = currentLevelQuestions.length

  const handleAnswer = (selected, elapsed) => {
    const correct = selected === currentQ.answer
    const newAnswers = [...answers, { 
      id: currentQ.id, 
      selected, 
      correct, 
      level: currentQ.level,
      topic: currentQ.topic,
      elapsed,
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
        <ProgressBar current={currentIdx} total={total} label="تجربة القواعد" sublabel="Trial of Structure" />
      </motion.div>

      {/* Level + Topic Indicators */}
      <motion.div
        key={`${currentQ.level}-${currentQ.topic}`}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-4 flex flex-wrap items-center gap-2"
      >
        {/* Level badge */}
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold tracking-wider uppercase border"
          style={{
            color: levelConfig.color,
            borderColor: `${levelConfig.color}40`,
            backgroundColor: `${levelConfig.color}10`,
          }}
        >
          <Shield className="w-3 h-3" />
          {levelConfig.label}
        </span>

        {/* Topic badge */}
        <span className="px-2.5 py-1 rounded-md text-[11px] text-parchment border border-steel/20 bg-midnight-navy font-body">
          {TOPIC_DISPLAY[currentQ.topic] || currentQ.topic}
        </span>

        {/* Level progress */}
        <span className="text-xs text-muted-gold ml-auto">
          Level {levelProgress}/{levelTotal}
        </span>
      </motion.div>

      {/* Difficulty progression bar */}
      <div className="flex gap-1 mb-6">
        {Object.entries(LEVEL_CONFIG).map(([level, config]) => (
          <div
            key={level}
            className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{
              backgroundColor: level === currentQ.level
                ? config.color
                : 'rgba(139, 145, 154, 0.15)',
            }}
          />
        ))}
      </div>

      {/* Question */}
      <MCQQuestion
        question={currentQ.id}
        questionText={currentQ.question}
        options={currentQ.options}
        onAnswer={handleAnswer}
        index={currentIdx}
        total={total}
        timeLimit={40}
      />
    </div>
  )
}
