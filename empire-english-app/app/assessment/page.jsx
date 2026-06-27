'use client'

import { useState } from 'react'
import ListeningModule from '../../components/assessment/ListeningModule'
import VocabularyModule from '../../components/assessment/VocabularyModule'
import GrammarModule from '../../components/assessment/GrammarModule'
import SpeakingModule from '../../components/assessment/SpeakingModule'
import AssessmentResults from '../../components/assessment/AssessmentResults'
import { scoreListening, scoreVocabulary, scoreGrammar, scoreSpeaking, calculatePlacement } from '../../lib/scoring'

const STEPS = ['intro', 'listening', 'vocabulary', 'grammar', 'speaking', 'results']

const STEP_INFO = {
  listening: { name: 'Listening', name_ar: 'الاستماع', icon: '👂', duration: '10 min', questions: 15 },
  vocabulary: { name: 'Vocabulary', name_ar: 'المفردات', icon: '📖', duration: '10 min', questions: 40 },
  grammar: { name: 'Grammar', name_ar: 'القواعد', icon: '✍️', duration: '10 min', questions: 25 },
  speaking: { name: 'Speaking', name_ar: 'التحدث', icon: '🎙️', duration: '10 min', questions: 3 },
}

export default function AssessmentPage() {
  const [currentStep, setCurrentStep] = useState('intro')
  const [moduleResults, setModuleResults] = useState({})
  const [placementResult, setPlacementResult] = useState(null)

  const goToStep = (step) => setCurrentStep(step)

  const handleListeningComplete = (answers) => {
    setModuleResults(prev => ({ ...prev, listening: answers }))
    goToStep('vocabulary')
  }

  const handleVocabularyComplete = (answers) => {
    setModuleResults(prev => ({ ...prev, vocabulary: answers }))
    goToStep('grammar')
  }

  const handleGrammarComplete = (answers) => {
    setModuleResults(prev => ({ ...prev, grammar: answers }))
    goToStep('speaking')
  }

  const handleSpeakingComplete = (recordings) => {
    const allResults = { ...moduleResults, speaking: recordings }
    setModuleResults(allResults)

    // Calculate scores
    const scores = {
      listening: scoreListening(allResults.listening || []),
      vocabulary: scoreVocabulary(allResults.vocabulary || []),
      grammar: scoreGrammar(allResults.grammar || []),
      speaking: scoreSpeaking(allResults.speaking || []),
    }

    // Run the placement algorithm
    const result = calculatePlacement(scores)
    setPlacementResult(result)

    // Save results (fire and forget)
    fetch('/api/assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scores, result, timestamp: new Date().toISOString() }),
    }).catch(() => {})

    goToStep('results')
  }

  // Step indicator
  const stepIndex = STEPS.indexOf(currentStep)

  return (
    <div className="min-h-screen bg-sovereign-black">
      {/* Step indicator (except on intro and results) */}
      {currentStep !== 'intro' && currentStep !== 'results' && (
        <div className="sticky top-0 z-10 bg-sovereign-black/95 backdrop-blur-sm border-b border-steel/10 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex gap-2">
              {['listening', 'vocabulary', 'grammar', 'speaking'].map((step, i) => (
                <div
                  key={step}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm
                    ${STEPS.indexOf(step) < stepIndex ? 'bg-imperial-gold text-sovereign-black' : ''}
                    ${step === currentStep ? 'bg-imperial-gold/20 border-2 border-imperial-gold text-imperial-gold' : ''}
                    ${STEPS.indexOf(step) > stepIndex ? 'bg-midnight-navy text-steel' : ''}
                  `}
                >
                  {STEPS.indexOf(step) < stepIndex ? '✓' : STEP_INFO[step].icon}
                </div>
              ))}
            </div>
            <span className="text-sm text-steel font-arabic">
              {STEP_INFO[currentStep]?.name_ar}
            </span>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* INTRO */}
        {currentStep === 'intro' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-6">🏛️</div>
            <h1 className="text-3xl font-bold text-imperial-gold mb-3 font-arabic">
              اختبار تحديد المستوى
            </h1>
            <p className="text-xl text-parchment mb-2">Placement Assessment</p>
            <p className="text-steel max-w-md mx-auto mb-8 font-arabic leading-relaxed">
              هذا الاختبار يحدد مستواك الحقيقي في الإنجليزي ويصمم لك خطة مخصصة. يأخذ حوالي ٣٠-٤٥ دقيقة.
            </p>

            {/* Module cards */}
            <div className="grid grid-cols-2 gap-3 mb-8 max-w-md mx-auto">
              {Object.entries(STEP_INFO).map(([key, info]) => (
                <div key={key} className="bg-midnight-navy/80 border border-steel/20 rounded-lg p-4 text-center">
                  <div className="text-2xl mb-1">{info.icon}</div>
                  <p className="text-sm text-parchment font-bold">{info.name_ar}</p>
                  <p className="text-xs text-steel">{info.duration} • {info.questions} {key === 'speaking' ? 'parts' : 'Q'}</p>
                </div>
              ))}
            </div>

            {/* Instructions */}
            <div className="bg-midnight-navy/50 border border-steel/10 rounded-xl p-5 mb-8 text-right max-w-md mx-auto">
              <h3 className="text-sm font-bold text-imperial-gold mb-3 font-arabic">تعليمات مهمة:</h3>
              <ul className="text-sm text-steel space-y-2 font-arabic">
                <li>• لا تستخدم مترجم أو مساعد — النتيجة لك أنت</li>
                <li>• لا بأس إذا ما عرفت الإجابة — اختر أقرب شي</li>
                <li>• جزء التحدث يحتاج ميكروفون (يمكن تخطيه)</li>
                <li>• النتيجة تظهر فورًا بعد الانتهاء</li>
              </ul>
            </div>

            <button
              onClick={() => goToStep('listening')}
              className="px-12 py-4 bg-imperial-gold text-sovereign-black font-bold text-xl rounded-lg hover:bg-imperial-gold/90 transition-colors"
            >
              ابدأ الاختبار
            </button>
          </div>
        )}

        {/* MODULES */}
        {currentStep === 'listening' && <ListeningModule onComplete={handleListeningComplete} />}
        {currentStep === 'vocabulary' && <VocabularyModule onComplete={handleVocabularyComplete} />}
        {currentStep === 'grammar' && <GrammarModule onComplete={handleGrammarComplete} />}
        {currentStep === 'speaking' && <SpeakingModule onComplete={handleSpeakingComplete} />}

        {/* RESULTS */}
        {currentStep === 'results' && placementResult && (
          <AssessmentResults result={placementResult} />
        )}
      </div>
    </div>
  )
}
