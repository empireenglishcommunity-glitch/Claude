'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, Headphones, BookOpen, Shield, Mic, Volume2, ChevronRight, Crown } from 'lucide-react'
import { ParticleBackground, MetallicCard, GlowingBorder, ImperialButton, SectionDivider } from '../../components/empire'
import ListeningModule from '../../components/assessment/ListeningModule'
import VocabularyModule from '../../components/assessment/VocabularyModule'
import GrammarModule from '../../components/assessment/GrammarModule'
import SpeakingModule from '../../components/assessment/SpeakingModule'
import AssessmentResults from '../../components/assessment/AssessmentResults'
import { scoreListening, scoreVocabulary, scoreGrammar, scoreSpeaking, calculatePlacement } from '../../lib/scoring'

// ─── Module Configuration ─────────────────────────────────

const MODULES = {
  listening: {
    name: 'Trial of the Ear',
    name_ar: 'تجربة السمع',
    empireTitle: 'The Perception Trial',
    icon: Headphones,
    color: '#D4AF37',
    description: 'Demonstrate your ability to understand spoken English at varying speeds.',
    trialDescription: 'Listen to passages at three speeds — Slow March, Steady Pace, and Battle Speed. Answer questions that test comprehension, inference, and detail recognition.',
    requiresMic: false,
    requiresAudio: true,
    questions: 15,
    duration: '10 min',
  },
  vocabulary: {
    name: 'Trial of Words',
    name_ar: 'تجربة الكلمات',
    empireTitle: 'The Lexicon Trial',
    icon: BookOpen,
    color: '#cd7f32',
    description: 'Show the breadth of your lexical knowledge across frequency bands.',
    trialDescription: 'Face 40 questions across five frequency bands — from Foundation Words to Elite Words. Each correct answer reveals the true breadth of your lexical command.',
    requiresMic: false,
    requiresAudio: false,
    questions: 40,
    duration: '10 min',
  },
  grammar: {
    name: 'Trial of Structure',
    name_ar: 'تجربة القواعد',
    empireTitle: 'The Foundation Trial',
    icon: Shield,
    color: '#ff6b35',
    description: 'Prove your mastery of the structural foundations of English.',
    trialDescription: 'Complete sentences, identify errors, and transform structures across eight grammar topics. Tenses, conditionals, passive voice — master them all.',
    requiresMic: false,
    requiresAudio: false,
    questions: 25,
    duration: '10 min',
  },
  speaking: {
    name: 'Trial of Voice',
    name_ar: 'تجربة الصوت',
    empireTitle: 'The Oratory Trial',
    icon: Swords,
    color: '#e74c3c',
    description: 'Prove your spoken command of the language.',
    trialDescription: 'Record responses to prompts that test your pronunciation, fluency, and confidence. Your voice reveals your true level.',
    requiresMic: true,
    requiresAudio: false,
    questions: 3,
    duration: '10 min',
  },
}

const STEPS = ['intro', 'listening', 'vocabulary', 'grammar', 'speaking', 'results']

// ─── Animation Variants ──────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: 'easeOut' },
  }),
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
}

// ─── Trial Card Component ────────────────────────────────

function TrialCard({ moduleKey, data, index, isActive, isCompleted, onBegin }) {
  const Icon = data.icon

  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="h-full"
    >
      <MetallicCard
        className={`p-6 sm:p-8 h-full flex flex-col ${isCompleted ? 'opacity-70' : ''}`}
        hover={!isCompleted}
        glowOnHover={!isCompleted}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div
            className="w-14 h-14 rounded-full border-2 flex items-center justify-center"
            style={{
              borderColor: data.color,
              boxShadow: `0 0 20px ${data.color}30, inset 0 0 12px ${data.color}15`,
            }}
          >
            <Icon className="w-6 h-6" style={{ color: data.color }} />
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs tracking-wider uppercase border
              ${isCompleted 
                ? 'text-[#4ade80] border-[rgba(74,222,128,0.3)] bg-[rgba(74,222,128,0.1)]' 
                : 'text-imperial-gold border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.1)]'
              }`}
          >
            {isCompleted ? '✓ Completed' : 'Available'}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-heading text-xl sm:text-2xl font-bold text-parchment mb-1">
          {data.name}
        </h3>
        <span className="text-sm tracking-[0.12em] uppercase mb-3" style={{ color: data.color }}>
          {data.empireTitle}
        </span>

        {/* Description */}
        <p className="text-steel text-sm leading-relaxed mb-4">
          {data.description}
        </p>

        {/* Trial Details Box */}
        <div className="bg-[rgba(10,10,15,0.5)] rounded-md p-4 mb-4 border border-[rgba(212,175,55,0.1)]">
          <p className="text-muted-gold text-xs leading-relaxed italic">
            {data.trialDescription}
          </p>
        </div>

        {/* Requirements */}
        <div className="flex flex-wrap gap-2 mb-5">
          {data.requiresMic && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] tracking-wider uppercase border border-[rgba(231,76,60,0.3)] text-ember bg-[rgba(231,76,60,0.08)]">
              <Mic className="w-3 h-3" />
              Microphone
            </span>
          )}
          {data.requiresAudio && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] tracking-wider uppercase border border-[rgba(212,175,55,0.3)] text-imperial-gold bg-[rgba(212,175,55,0.08)]">
              <Volume2 className="w-3 h-3" />
              Audio
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] tracking-wider uppercase border border-[rgba(139,145,154,0.3)] text-steel bg-[rgba(139,145,154,0.08)]">
            {data.questions} Q • {data.duration}
          </span>
        </div>

        <div className="mt-auto" />

        {/* CTA */}
        <div className="mt-4">
          {isCompleted ? (
            <ImperialButton variant="outline" size="md" className="w-full" disabled>
              Trial Completed ✓
            </ImperialButton>
          ) : (
            <GlowingBorder intensity={isActive ? 'high' : 'medium'} color={data.color === '#D4AF37' ? 'gold' : data.color === '#cd7f32' ? 'bronze' : 'fire'}>
              <ImperialButton variant="primary" size="md" className="w-full" onClick={() => onBegin(moduleKey)}>
                Begin Trial
                <ChevronRight className="w-4 h-4 ml-2" />
              </ImperialButton>
            </GlowingBorder>
          )}
        </div>
      </MetallicCard>
    </motion.div>
  )
}

// ─── Step Indicator (during trial) ───────────────────────

function StepIndicator({ currentStep, completedModules }) {
  const moduleKeys = ['listening', 'vocabulary', 'grammar', 'speaking']
  const stepIndex = STEPS.indexOf(currentStep)

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-20 glass-panel px-4 py-3"
    >
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex gap-2">
          {moduleKeys.map((key) => {
            const mod = MODULES[key]
            const Icon = mod.icon
            const isCompleted = completedModules.includes(key)
            const isCurrent = key === currentStep

            return (
              <motion.div
                key={key}
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all
                  ${isCompleted ? 'border-imperial-gold bg-imperial-gold/20' : ''}
                  ${isCurrent ? 'border-imperial-gold bg-imperial-gold/10 pulse-glow' : ''}
                  ${!isCompleted && !isCurrent ? 'border-steel/30 bg-midnight-navy' : ''}
                `}
                animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {isCompleted ? (
                  <span className="text-imperial-gold text-sm">✓</span>
                ) : (
                  <Icon className="w-4 h-4" style={{ color: isCurrent ? mod.color : '#8B919A' }} />
                )}
              </motion.div>
            )
          })}
        </div>
        <div className="text-right">
          <span className="text-sm text-imperial-gold font-heading">
            {MODULES[currentStep]?.name || ''}
          </span>
          <p className="text-xs text-steel font-arabic">
            {MODULES[currentStep]?.name_ar || ''}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Assessment Page ────────────────────────────────

export default function AssessmentPage() {
  const [currentStep, setCurrentStep] = useState('intro')
  const [moduleResults, setModuleResults] = useState({})
  const [placementResult, setPlacementResult] = useState(null)
  const [completedModules, setCompletedModules] = useState([])

  const goToStep = (step) => setCurrentStep(step)

  const handleBeginTrial = (moduleKey) => {
    goToStep(moduleKey)
  }

  const handleListeningComplete = (answers) => {
    setModuleResults(prev => ({ ...prev, listening: answers }))
    setCompletedModules(prev => [...prev, 'listening'])
    goToStep('vocabulary')
  }

  const handleVocabularyComplete = (answers) => {
    setModuleResults(prev => ({ ...prev, vocabulary: answers }))
    setCompletedModules(prev => [...prev, 'vocabulary'])
    goToStep('grammar')
  }

  const handleGrammarComplete = (answers) => {
    setModuleResults(prev => ({ ...prev, grammar: answers }))
    setCompletedModules(prev => [...prev, 'grammar'])
    goToStep('speaking')
  }

  const handleSpeakingComplete = useCallback((recordings) => {
    const allResults = { ...moduleResults, speaking: recordings }
    setModuleResults(allResults)
    setCompletedModules(prev => [...prev, 'speaking'])

    // Calculate scores
    const scores = {
      listening: scoreListening(allResults.listening || []),
      vocabulary: scoreVocabulary(allResults.vocabulary || []),
      grammar: scoreGrammar(allResults.grammar || []),
      speaking: scoreSpeaking(allResults.speaking || []),
    }

    const result = calculatePlacement(scores)
    setPlacementResult(result)

    // Save results
    fetch('/api/assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scores, result, timestamp: new Date().toISOString() }),
    }).catch(() => {})

    goToStep('results')
  }, [moduleResults])

  const isInTrial = currentStep !== 'intro' && currentStep !== 'results'

  return (
    <div className="min-h-screen empire-bg">
      <ParticleBackground count={30} />

      {/* Step Indicator during trials */}
      {isInTrial && (
        <StepIndicator currentStep={currentStep} completedModules={completedModules} />
      )}

      {/* ═══ INTRO: The Four Trials ═══ */}
      <AnimatePresence mode="wait">
        {currentStep === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            {/* Hero Section */}
            <section className="relative flex flex-col items-center justify-center text-center px-4 pt-16 pb-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="relative z-10 max-w-4xl mx-auto"
              >
                {/* Floating Crown */}
                <motion.div
                  className="mb-6"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Crown className="w-16 h-16 text-imperial-gold mx-auto" strokeWidth={1.5} />
                </motion.div>

                <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-wider mb-4">
                  <span className="gold-shimmer">التجارب الأربع</span>
                </h1>
                <h2 className="font-heading text-lg sm:text-xl md:text-2xl text-muted-gold tracking-[0.15em] mb-4">
                  The Four Trials
                </h2>
                <p className="text-steel text-base sm:text-lg italic max-w-2xl mx-auto font-arabic leading-relaxed">
                  كل مجند يجب أن يواجه التجارب الأربع. كل تجربة تختبر جانبًا مختلفًا من إتقانك للغة الإنجليزية. أكمل الأربع لتحصل على رتبتك الإمبراطورية.
                </p>
              </motion.div>

              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0A0A0F] to-transparent" />
            </section>

            <SectionDivider />

            {/* Narrative Quote */}
            <section className="relative z-10 px-4 py-8">
              <div className="max-w-3xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="text-center"
                >
                  <p className="text-muted-gold text-base sm:text-lg leading-relaxed italic font-arabic">
                    &ldquo;أثبت قيمتك. اربح رتبتك الإمبراطورية. الاختبار يأخذ ٣٠-٤٥ دقيقة.&rdquo;
                  </p>
                  <div className="mt-6 flex items-center justify-center gap-3">
                    <div className="h-px w-12 bg-gradient-to-r from-transparent to-[rgba(212,175,55,0.4)]" />
                    <span className="text-imperial-gold text-xs tracking-widest uppercase">
                      Choose Your Trial
                    </span>
                    <div className="h-px w-12 bg-gradient-to-l from-transparent to-[rgba(212,175,55,0.4)]" />
                  </div>
                </motion.div>
              </div>
            </section>

            <SectionDivider />

            {/* Trial Cards Grid */}
            <section className="relative z-10 px-4 py-8">
              <div className="max-w-6xl mx-auto">
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {Object.entries(MODULES).map(([key, data], i) => (
                    <TrialCard
                      key={key}
                      moduleKey={key}
                      data={data}
                      index={i}
                      isActive={i === 0}
                      isCompleted={completedModules.includes(key)}
                      onBegin={handleBeginTrial}
                    />
                  ))}
                </motion.div>
              </div>
            </section>

            <SectionDivider />

            {/* Journey Steps */}
            <section className="relative z-10 px-4 py-12">
              <div className="max-w-4xl mx-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-center mb-10"
                >
                  <h2 className="font-heading text-2xl sm:text-3xl font-bold text-imperial-gold text-glow mb-3">
                    رحلتك
                  </h2>
                  <p className="text-muted-gold text-sm italic font-arabic">
                    مسارك عبر التجارب سيكشف رتبتك الحقيقية
                  </p>
                </motion.div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  {[
                    { step: 1, title: 'اختر', titleEn: 'Choose', desc: 'اختر التجربة', icon: '⚔️' },
                    { step: 2, title: 'واجه', titleEn: 'Endure', desc: 'أكمل التحديات', icon: '🛡️' },
                    { step: 3, title: 'تأمل', titleEn: 'Reflect', desc: 'راجع أداءك', icon: '📜' },
                    { step: 4, title: 'ارتقِ', titleEn: 'Ascend', desc: 'احصل على رتبتك', icon: '👑' },
                  ].map((item, i) => (
                    <motion.div
                      key={item.step}
                      custom={i}
                      variants={fadeUp}
                      initial="hidden"
                      animate="visible"
                      className="text-center"
                    >
                      <div className="text-3xl mb-3">{item.icon}</div>
                      <div className="text-imperial-gold text-xs tracking-widest mb-1">
                        STEP {item.step}
                      </div>
                      <h3 className="text-parchment text-lg font-bold mb-1 font-arabic">
                        {item.title}
                      </h3>
                      <p className="text-muted-gold text-xs italic font-arabic">
                        {item.desc}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            <SectionDivider />

            {/* Begin CTA */}
            <section className="relative z-10 px-4 py-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="max-w-2xl mx-auto text-center"
              >
                <GlowingBorder intensity="high" className="rounded-lg">
                  <MetallicCard hover={false} glowOnHover={false} className="p-10 sm:p-14">
                    <h2 className="font-heading text-2xl sm:text-3xl font-bold text-imperial-gold text-glow mb-4 font-arabic">
                      مستعد لإثبات قيمتك؟
                    </h2>
                    <p className="text-muted-gold text-base italic mb-8 font-arabic">
                      ابدأ بالتجربة الأولى — تجربة السمع. الإمبراطورية بانتظارك.
                    </p>
                    <ImperialButton variant="primary" size="xl" onClick={() => goToStep('listening')}>
                      <span className="font-arabic">ابدأ التجارب</span>
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </ImperialButton>
                  </MetallicCard>
                </GlowingBorder>
              </motion.div>
            </section>
          </motion.div>
        )}

        {/* ═══ TRIAL MODULES ═══ */}
        {currentStep === 'listening' && (
          <motion.div
            key="listening"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 max-w-3xl mx-auto px-4 py-8"
          >
            <ListeningModule onComplete={handleListeningComplete} />
          </motion.div>
        )}

        {currentStep === 'vocabulary' && (
          <motion.div
            key="vocabulary"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 max-w-3xl mx-auto px-4 py-8"
          >
            <VocabularyModule onComplete={handleVocabularyComplete} />
          </motion.div>
        )}

        {currentStep === 'grammar' && (
          <motion.div
            key="grammar"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 max-w-3xl mx-auto px-4 py-8"
          >
            <GrammarModule onComplete={handleGrammarComplete} />
          </motion.div>
        )}

        {currentStep === 'speaking' && (
          <motion.div
            key="speaking"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 max-w-3xl mx-auto px-4 py-8"
          >
            <SpeakingModule onComplete={handleSpeakingComplete} />
          </motion.div>
        )}

        {/* ═══ RESULTS ═══ */}
        {currentStep === 'results' && placementResult && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="relative z-10"
          >
            <AssessmentResults result={placementResult} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
