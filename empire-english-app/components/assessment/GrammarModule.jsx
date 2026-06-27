'use client'

import { useState } from 'react'
import { GRAMMAR_DATA } from '../../lib/assessment-data'
import MCQQuestion from './MCQQuestion'
import ProgressBar from './ProgressBar'

export default function GrammarModule({ onComplete }) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState([])

  const questions = GRAMMAR_DATA.questions
  const total = questions.length
  const currentQ = questions[currentIdx]

  const handleAnswer = (selected) => {
    const correct = selected === currentQ.answer
    const newAnswers = [...answers, { id: currentQ.id, selected, correct, level: currentQ.level }]
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
      <ProgressBar current={currentIdx} total={total} label="القواعد" />
      <div className="mb-3 flex gap-2">
        <span className="inline-block px-3 py-1 bg-midnight-navy text-steel text-xs rounded-full">
          {currentQ.level}
        </span>
        <span className="inline-block px-3 py-1 bg-midnight-navy text-steel text-xs rounded-full">
          {currentQ.topic}
        </span>
      </div>
      <MCQQuestion
        question={currentQ.id}
        questionText={currentQ.question}
        options={currentQ.options}
        onAnswer={handleAnswer}
        index={currentIdx}
        total={total}
      />
    </div>
  )
}
