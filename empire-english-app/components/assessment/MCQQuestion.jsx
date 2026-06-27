'use client'

import { useState } from 'react'

export default function MCQQuestion({ question, questionText, options, onAnswer, index, total }) {
  const [selected, setSelected] = useState(null)
  const [confirmed, setConfirmed] = useState(false)

  const handleSelect = (option) => {
    if (confirmed) return
    setSelected(option)
  }

  const handleConfirm = () => {
    if (!selected || confirmed) return
    setConfirmed(true)
    // Brief delay for visual feedback before advancing
    setTimeout(() => {
      onAnswer(selected)
      setSelected(null)
      setConfirmed(false)
    }, 300)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-sm text-steel mb-2 font-arabic">
        سؤال {index + 1} من {total}
      </div>
      <h3 className="text-xl text-parchment font-body mb-6 leading-relaxed" dir="ltr">
        {questionText || question}
      </h3>
      <div className="space-y-3">
        {options.map((option, i) => (
          <button
            key={i}
            onClick={() => handleSelect(option)}
            disabled={confirmed}
            className={`w-full text-right p-4 rounded-lg border-2 transition-all duration-200 text-base font-body
              ${selected === option
                ? confirmed
                  ? 'border-imperial-gold bg-imperial-gold/20 text-imperial-gold'
                  : 'border-imperial-gold bg-imperial-gold/10 text-parchment'
                : 'border-midnight-navy bg-midnight-navy/50 text-parchment hover:border-steel/50 hover:bg-midnight-navy/80'
              }
              ${confirmed ? 'cursor-default' : 'cursor-pointer'}
            `}
            dir="ltr"
          >
            <div className="flex items-center gap-3">
              <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0
                ${selected === option ? 'border-imperial-gold bg-imperial-gold text-sovereign-black' : 'border-steel/40 text-steel'}
              `}>
                {String.fromCharCode(65 + i)}
              </span>
              <span>{option}</span>
            </div>
          </button>
        ))}
      </div>
      <button
        onClick={handleConfirm}
        disabled={!selected || confirmed}
        className={`mt-6 w-full py-3 rounded-lg font-bold text-lg transition-all duration-200
          ${selected && !confirmed
            ? 'bg-imperial-gold text-sovereign-black hover:bg-imperial-gold/90 cursor-pointer'
            : 'bg-midnight-navy text-steel/50 cursor-not-allowed'
          }
        `}
      >
        {confirmed ? '...' : 'تأكيد الإجابة'}
      </button>
    </div>
  )
}
