'use client'

import { useState } from 'react'
import { VOCABULARY_DATA } from '../../lib/assessment-data'
import MCQQuestion from './MCQQuestion'
import ProgressBar from './ProgressBar'

export default function VocabularyModule({ onComplete }) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState([])

  const questions = VOCABULARY_DATA.questions
  const total = questions.length
  const currentQ = questions[currentIdx]

  const handleAnswer = (selected) => {
    const correct = selected === currentQ.answer
    const newAnswers = [...answers, { id: currentQ.id, selected, correct, band: currentQ.band }]
    setAnswers(newAnswers)

    if (currentIdx + 1 < total) {
      setCurrentIdx(currentIdx + 1)
    } else {
      onComplete(newAnswers)
    }
  }

  if (!currentQ) return null

  // Build the question display: show the sentence with blank
  const questionText = currentQ.sentence

  return (
    <div>
      <ProgressBar current={currentIdx} total={total} label="المفردات" />
      <div className="mb-3">
        <span className="inline-block px-3 py-1 bg-midnight-navy text-steel text-xs rounded-full">
          Band: {currentQ.band}
        </span>
      </div>
      <MCQQuestion
        question={currentQ.id}
        questionText={questionText}
        options={currentQ.options}
        onAnswer={handleAnswer}
        index={currentIdx}
        total={total}
      />
    </div>
  )
}
