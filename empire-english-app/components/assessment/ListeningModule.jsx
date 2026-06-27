'use client'

import { useState } from 'react'
import { LISTENING_DATA } from '../../lib/assessment-data'
import MCQQuestion from './MCQQuestion'
import ProgressBar from './ProgressBar'

export default function ListeningModule({ onComplete }) {
  const [sectionIdx, setSectionIdx] = useState(0)
  const [questionIdx, setQuestionIdx] = useState(0)
  const [answers, setAnswers] = useState([])
  const [showTranscript, setShowTranscript] = useState(true)
  const [readingDone, setReadingDone] = useState(false)

  const allQuestions = LISTENING_DATA.sections.flatMap(s => s.questions)
  const totalQ = allQuestions.length
  const currentSection = LISTENING_DATA.sections[sectionIdx]
  const currentQ = currentSection?.questions[questionIdx]

  // Calculate overall progress
  let overallIdx = 0
  for (let s = 0; s < sectionIdx; s++) {
    overallIdx += LISTENING_DATA.sections[s].questions.length
  }
  overallIdx += questionIdx

  const handleAnswer = (selected) => {
    const correct = selected === currentQ.answer
    const newAnswers = [...answers, { id: currentQ.id, selected, correct }]
    setAnswers(newAnswers)

    // Move to next question
    if (questionIdx + 1 < currentSection.questions.length) {
      setQuestionIdx(questionIdx + 1)
    } else if (sectionIdx + 1 < LISTENING_DATA.sections.length) {
      // Move to next section
      setSectionIdx(sectionIdx + 1)
      setQuestionIdx(0)
      setShowTranscript(true)
      setReadingDone(false)
    } else {
      // All done
      onComplete(newAnswers)
    }
  }

  // Show transcript reading phase
  if (showTranscript && !readingDone) {
    return (
      <div className="max-w-2xl mx-auto">
        <ProgressBar current={overallIdx} total={totalQ} label="الاستماع" />
        
        <div className="mb-4">
          <span className="inline-block px-3 py-1 bg-imperial-gold/10 text-imperial-gold text-sm rounded-full font-bold">
            {currentSection.label} — {currentSection.speed}
          </span>
        </div>

        <div className="bg-midnight-navy/80 border border-steel/20 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-emerald rounded-full animate-pulse" />
            <span className="text-sm text-steel">Audio Playing...</span>
          </div>
          <p className="text-parchment leading-relaxed text-lg font-body" dir="ltr">
            {currentSection.transcript}
          </p>
        </div>

        <p className="text-steel text-sm font-arabic mb-4">
          اقرأ النص أعلاه (يُحاكي المقطع الصوتي). عندما تكون مستعدًا، اضغط للبدء في الإجابة على الأسئلة.
        </p>

        <button
          onClick={() => { setShowTranscript(false); setReadingDone(true) }}
          className="w-full py-3 bg-imperial-gold text-sovereign-black font-bold text-lg rounded-lg hover:bg-imperial-gold/90 transition-colors"
        >
          مستعد — ابدأ الأسئلة
        </button>
      </div>
    )
  }

  if (!currentQ) return null

  return (
    <div>
      <ProgressBar current={overallIdx} total={totalQ} label="الاستماع" />
      <div className="mb-4">
        <span className="inline-block px-3 py-1 bg-imperial-gold/10 text-imperial-gold text-xs rounded-full font-bold">
          {currentSection.label}
        </span>
      </div>
      <MCQQuestion
        question={currentQ.question}
        questionText={currentQ.question}
        options={currentQ.options}
        onAnswer={handleAnswer}
        index={overallIdx}
        total={totalQ}
      />
    </div>
  )
}
