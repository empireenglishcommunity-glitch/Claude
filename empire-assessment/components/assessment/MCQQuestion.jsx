'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, CheckCircle, XCircle } from 'lucide-react'

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function MCQQuestion({ 
  question, 
  questionText, 
  options, 
  onAnswer, 
  index, 
  total, 
  timeLimit = 45, // seconds per question, 0 = no timer
  showFeedback = false, // show correct/incorrect briefly
  correctAnswer = null, // index of correct answer (for feedback mode)
}) {
  const [selected, setSelected] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [feedbackShown, setFeedbackShown] = useState(false)
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [startTime] = useState(Date.now())
  const timerRef = useRef(null)

  // Timer countdown
  useEffect(() => {
    if (timeLimit <= 0) return
    setTimeLeft(timeLimit)

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          // Auto-submit with no answer on timeout
          handleAutoSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [index, timeLimit])

  const handleAutoSubmit = () => {
    if (!confirmed) {
      setConfirmed(true)
      const elapsed = Math.round((Date.now() - startTime) / 1000)
      setTimeout(() => {
        onAnswer(null, elapsed)
        resetState()
      }, 300)
    }
  }

  const resetState = () => {
    setSelected(null)
    setConfirmed(false)
    setFeedbackShown(false)
  }

  const handleSelect = (option) => {
    if (confirmed) return
    setSelected(option)
  }

  const handleConfirm = () => {
    if (!selected || confirmed) return
    setConfirmed(true)
    clearInterval(timerRef.current)

    const elapsed = Math.round((Date.now() - startTime) / 1000)

    if (showFeedback && correctAnswer !== null) {
      setFeedbackShown(true)
      setTimeout(() => {
        onAnswer(selected, elapsed)
        resetState()
      }, 1200)
    } else {
      setTimeout(() => {
        onAnswer(selected, elapsed)
        resetState()
      }, 300)
    }
  }

  // Timer color/state
  const timerIsWarning = timeLimit > 0 && timeLeft <= 10
  const timerIsCritical = timeLimit > 0 && timeLeft <= 5
  const timerPct = timeLimit > 0 ? (timeLeft / timeLimit) * 100 : 100

  // Determine option state for styling
  const getOptionState = (option, optionIndex) => {
    if (feedbackShown) {
      if (optionIndex === correctAnswer) return 'correct'
      if (option === selected && optionIndex !== correctAnswer) return 'incorrect'
      return 'idle'
    }
    if (option === selected) return confirmed ? 'confirmed' : 'selected'
    return 'idle'
  }

  const optionStyles = {
    idle: 'border-[rgba(13,17,23,0.8)] bg-[rgba(13,17,23,0.5)] hover:border-[rgba(212,175,55,0.3)] hover:bg-[rgba(13,17,23,0.8)]',
    selected: 'border-[rgba(212,175,55,0.6)] bg-[rgba(212,175,55,0.1)] shadow-gold-sm',
    confirmed: 'border-imperial-gold bg-[rgba(212,175,55,0.15)] shadow-gold-md',
    correct: 'border-[rgba(74,222,128,0.6)] bg-[rgba(74,222,128,0.1)]',
    incorrect: 'border-[rgba(231,76,60,0.6)] bg-[rgba(231,76,60,0.1)]',
  }

  return (
    <motion.div
      key={`q-${index}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="max-w-2xl mx-auto"
    >
      {/* Header: Question number + Timer */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-steel font-arabic">
          سؤال {index + 1} من {total}
        </span>
        
        {timeLimit > 0 && (
          <motion.div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${
              timerIsCritical 
                ? 'border-ember/50 bg-ember/10' 
                : timerIsWarning 
                  ? 'border-fire-glow/50 bg-fire-glow/10' 
                  : 'border-steel/30 bg-midnight-navy'
            }`}
            animate={timerIsCritical ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.5, repeat: timerIsCritical ? Infinity : 0 }}
          >
            <Clock className={`w-3.5 h-3.5 ${timerIsCritical ? 'text-ember' : timerIsWarning ? 'text-fire-glow' : 'text-steel'}`} />
            <span className={`text-sm font-bold tabular-nums ${timerIsCritical ? 'text-ember' : timerIsWarning ? 'text-fire-glow' : 'text-steel'}`}>
              {timeLeft}s
            </span>
          </motion.div>
        )}
      </div>

      {/* Timer bar */}
      {timeLimit > 0 && (
        <div className="w-full h-1 bg-midnight-navy rounded-full overflow-hidden mb-6">
          <motion.div
            className={`h-full rounded-full transition-colors duration-500 ${
              timerIsCritical ? 'bg-ember' : timerIsWarning ? 'bg-fire-glow' : 'bg-imperial-gold/60'
            }`}
            initial={{ width: '100%' }}
            animate={{ width: `${timerPct}%` }}
            transition={{ duration: 0.5, ease: 'linear' }}
          />
        </div>
      )}

      {/* Question Text */}
      <motion.h3 
        className="text-xl sm:text-2xl text-parchment font-body mb-8 leading-relaxed" 
        dir="ltr"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {questionText || question}
      </motion.h3>

      {/* Options */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {options.map((option, i) => {
            const state = getOptionState(option, i)
            return (
              <motion.button
                key={`${index}-opt-${i}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.08, duration: 0.3 }}
                onClick={() => handleSelect(option)}
                disabled={confirmed}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 text-base font-body metallic-sheen
                  ${optionStyles[state]}
                  ${confirmed && state === 'idle' ? 'opacity-50 cursor-default' : ''}
                  ${!confirmed ? 'cursor-pointer' : 'cursor-default'}
                `}
                dir="ltr"
                whileHover={!confirmed ? { scale: 1.01, x: 4 } : {}}
                whileTap={!confirmed ? { scale: 0.99 } : {}}
              >
                <div className="flex items-center gap-3">
                  {/* Letter badge */}
                  <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0 transition-all
                    ${state === 'selected' || state === 'confirmed' 
                      ? 'border-imperial-gold bg-imperial-gold text-sovereign-black' 
                      : state === 'correct'
                        ? 'border-[#4ade80] bg-[#4ade80] text-sovereign-black'
                        : state === 'incorrect'
                          ? 'border-ember bg-ember text-white'
                          : 'border-steel/40 text-steel'
                    }
                  `}>
                    {state === 'correct' ? <CheckCircle className="w-4 h-4" /> : 
                     state === 'incorrect' ? <XCircle className="w-4 h-4" /> :
                     OPTION_LETTERS[i]}
                  </span>

                  {/* Option text */}
                  <span className={`flex-1 ${
                    state === 'selected' || state === 'confirmed' ? 'text-parchment' :
                    state === 'correct' ? 'text-[#4ade80]' :
                    state === 'incorrect' ? 'text-ember' :
                    'text-parchment'
                  }`}>
                    {option}
                  </span>
                </div>
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Confirm Button */}
      <motion.button
        onClick={handleConfirm}
        disabled={!selected || confirmed}
        className={`mt-8 w-full py-3.5 rounded-lg font-bold text-lg transition-all duration-300
          ${selected && !confirmed
            ? 'bg-gradient-to-r from-imperial-gold to-bronze text-sovereign-black hover:shadow-gold-md cursor-pointer'
            : 'bg-midnight-navy text-steel/40 cursor-not-allowed border border-steel/10'
          }
        `}
        whileHover={selected && !confirmed ? { scale: 1.01 } : {}}
        whileTap={selected && !confirmed ? { scale: 0.99 } : {}}
      >
        {confirmed ? (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-steel/40 border-t-imperial-gold rounded-full"
            />
          </motion.span>
        ) : (
          <span className="font-arabic">تأكيد الإجابة</span>
        )}
      </motion.button>
    </motion.div>
  )
}
