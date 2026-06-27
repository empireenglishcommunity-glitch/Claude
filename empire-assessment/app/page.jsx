'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, Headphones, BookOpen, Shield, ChevronRight, Crown, Lock, CheckCircle, LogIn, User } from 'lucide-react'
import { 
  ParticleBackground, MetallicCard, GlowingBorder, ImperialButton, SectionDivider,
  EmpireAudioProvider, EmpireAudioOverlay, EmpireAudioControls,
  ProfileSidebar, detectGender, THEMES, ProgressGuard, Footer
} from '../components/empire'
import ListeningModule from '../components/assessment/ListeningModule'
import VocabularyModule from '../components/assessment/VocabularyModule'
import GrammarModule from '../components/assessment/GrammarModule'
import SpeakingModule from '../components/assessment/SpeakingModule'
import AssessmentResults from '../components/assessment/AssessmentResults'
import { scoreListening, scoreVocabulary, scoreGrammar, scoreSpeaking, calculatePlacement } from '../lib/scoring'
import { supabase } from '../lib/supabase'

// ─── Sequential Trial Order (FIXED — no user choice) ─────

const TRIAL_ORDER = ['listening', 'vocabulary', 'grammar', 'speaking']

const MODULES = {
  listening: {
    name: 'Trial of the Ear',
    name_ar: 'تجربة السمع',
    empireTitle: 'The Perception Trial',
    icon: Headphones,
    color: '#D4AF37',
    description: 'Demonstrate your ability to understand spoken English at varying speeds.',
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
    questions: 3,
    duration: '10 min',
  },
}

// ─── Auth Gate Component ─────────────────────────────────

function AuthGate({ onAuthenticated }) {
  const [checking, setChecking] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        onAuthenticated(user)
      }
      setChecking(false)
    }
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        onAuthenticated(session.user)
      } else {
        setUser(null)
      }
    })

    return () => subscription?.unsubscribe()
  }, [onAuthenticated])

  if (checking) {
    return (
      <div className="min-h-screen empire-bg flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Crown className="w-12 h-12 text-imperial-gold mx-auto" />
          </motion.div>
          <p className="text-muted-gold text-sm font-arabic">جارٍ التحقق من هويتك...</p>
        </motion.div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen empire-bg flex items-center justify-center px-4">
        <ParticleBackground count={20} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-md w-full"
        >
          <GlowingBorder intensity="medium" className="rounded-lg">
            <MetallicCard hover={false} glowOnHover={false} className="p-8 text-center">
              {/* Logo */}
              <img src="/logo-sm.png" alt="Empire English" className="w-16 h-16 mx-auto mb-4 object-contain" />
              
              <h2 className="font-heading text-2xl text-imperial-gold mb-2 font-arabic">
                سجّل دخولك أولاً
              </h2>
              <p className="text-muted-gold text-sm mb-6 font-arabic leading-relaxed">
                يجب تسجيل الدخول لبدء التجارب الأربع. نتائجك ستُحفظ في ملفك الشخصي.
              </p>

              <div className="space-y-3">
                <a href="/login" className="block">
                  <ImperialButton variant="primary" size="lg" className="w-full">
                    <LogIn className="w-5 h-5 mr-2" />
                    <span className="font-arabic">تسجيل الدخول</span>
                  </ImperialButton>
                </a>
                <a href="/signup" className="block">
                  <ImperialButton variant="outline" size="md" className="w-full">
                    <span className="font-arabic">إنشاء حساب جديد</span>
                  </ImperialButton>
                </a>
              </div>

              <p className="text-steel text-xs mt-4 font-arabic">
                حسابك يتتبع تقدمك ويحفظ رتبتك الإمبراطورية
              </p>
            </MetallicCard>
          </GlowingBorder>
        </motion.div>
      </div>
    )
  }

  return null // User is authenticated, parent handles rendering
}

// ─── Step Indicator (sequential progress) ────────────────

function StepIndicator({ currentStep, completedModules }) {
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-20 glass-panel px-4 py-3"
    >
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex gap-2">
          {TRIAL_ORDER.map((key) => {
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
                  <CheckCircle className="w-4 h-4 text-imperial-gold" />
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

// ─── Sequential Trial List (locked/unlocked) ─────────────

function SequentialTrialList({ completedModules, onBegin }) {
  const nextTrial = TRIAL_ORDER.find(key => !completedModules.includes(key))

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {TRIAL_ORDER.map((key, index) => {
        const mod = MODULES[key]
        const Icon = mod.icon
        const isCompleted = completedModules.includes(key)
        const isNext = key === nextTrial
        const isLocked = !isCompleted && !isNext

        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <MetallicCard
              className={`p-5 ${isLocked ? 'opacity-50' : ''}`}
              hover={isNext}
              glowOnHover={isNext}
            >
              <div className="flex items-center gap-4">
                {/* Step number + icon */}
                <div
                  className="w-12 h-12 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{
                    borderColor: isCompleted ? '#4ade80' : isNext ? mod.color : '#8B919A30',
                    backgroundColor: isCompleted ? 'rgba(74,222,128,0.1)' : isNext ? `${mod.color}10` : 'transparent',
                  }}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-[#4ade80]" />
                  ) : isLocked ? (
                    <Lock className="w-5 h-5 text-steel/50" />
                  ) : (
                    <Icon className="w-5 h-5" style={{ color: mod.color }} />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-parchment font-bold text-sm">{mod.name}</h3>
                    <span className="text-xs text-muted-gold font-arabic">{mod.name_ar}</span>
                  </div>
                  <p className="text-steel text-xs mt-0.5">
                    {mod.questions} questions • {mod.duration}
                  </p>
                </div>

                {/* Status / Action */}
                <div className="shrink-0">
                  {isCompleted ? (
                    <span className="text-xs text-[#4ade80] border border-[rgba(74,222,128,0.3)] bg-[rgba(74,222,128,0.1)] px-3 py-1 rounded-full">
                      ✓ Complete
                    </span>
                  ) : isNext ? (
                    <ImperialButton variant="primary" size="sm" onClick={() => onBegin(key)}>
                      <span className="font-arabic">ابدأ</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </ImperialButton>
                  ) : (
                    <span className="text-xs text-steel/50 border border-steel/20 px-3 py-1 rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Locked
                    </span>
                  )}
                </div>
              </div>
            </MetallicCard>
          </motion.div>
        )
      })}
    </div>
  )
}

// ─── Main Assessment Page ────────────────────────────────

function AssessmentContent() {
  const [currentStep, setCurrentStep] = useState('intro')
  const [moduleResults, setModuleResults] = useState({})
  const [placementResult, setPlacementResult] = useState(null)
  const [completedModules, setCompletedModules] = useState([])
  const [user, setUser] = useState(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState(THEMES.male)

  const handleAuthenticated = useCallback((u) => {
    setUser(u)
    setAuthenticated(true)
    // Auto-detect theme from name
    const name = u.user_metadata?.name || u.email?.split('@')[0] || ''
    const gender = detectGender(name)
    setTheme(THEMES[gender])
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', gender)
  }, [])

  const goToStep = (step) => setCurrentStep(step)

  const handleBeginTrial = (moduleKey) => {
    goToStep(moduleKey)
  }

  const handleListeningComplete = (answers) => {
    setModuleResults(prev => ({ ...prev, listening: answers }))
    setCompletedModules(prev => [...prev, 'listening'])
    goToStep('intro') // Return to trial list
  }

  const handleVocabularyComplete = (answers) => {
    setModuleResults(prev => ({ ...prev, vocabulary: answers }))
    setCompletedModules(prev => [...prev, 'vocabulary'])
    goToStep('intro')
  }

  const handleGrammarComplete = (answers) => {
    setModuleResults(prev => ({ ...prev, grammar: answers }))
    setCompletedModules(prev => [...prev, 'grammar'])
    goToStep('intro')
  }

  const handleSpeakingComplete = useCallback((recordings) => {
    const allResults = { ...moduleResults, speaking: recordings }
    setModuleResults(allResults)
    setCompletedModules(prev => [...prev, 'speaking'])

    // All trials complete — calculate scores
    const scores = {
      listening: scoreListening(allResults.listening || []),
      vocabulary: scoreVocabulary(allResults.vocabulary || []),
      grammar: scoreGrammar(allResults.grammar || []),
      speaking: scoreSpeaking(allResults.speaking || []),
    }

    const result = calculatePlacement(scores)
    setPlacementResult(result)

    // Save to localStorage for persistent profile history
    const assessmentRecord = {
      scores,
      result,
      timestamp: new Date().toISOString(),
      userId: user?.id,
      email: user?.email,
    }
    try {
      const existing = JSON.parse(localStorage.getItem(`assessments_${user?.id}`) || '[]')
      existing.unshift(assessmentRecord) // newest first
      localStorage.setItem(`assessments_${user?.id}`, JSON.stringify(existing.slice(0, 20))) // keep last 20
    } catch {}

    // Save results to API (Telegram notification + logging)
    fetch('/api/assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assessmentRecord),
    }).catch(() => {})

    goToStep('results')
  }, [moduleResults, user])

  // Auth gate
  if (!authenticated) {
    return <AuthGate onAuthenticated={handleAuthenticated} />
  }

  const isInTrial = currentStep !== 'intro' && currentStep !== 'results'

  return (
    <div className="min-h-screen empire-bg flex flex-col" data-theme={theme.id} style={{ '--accent': theme.accent, '--accent-light': theme.accentLight }}>
      <ParticleBackground count={30} />
      <EmpireAudioControls />
      <ProgressGuard active={isInTrial} />

      {/* Profile Button (top-left) */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-30 w-10 h-10 rounded-full border-2 flex items-center justify-center overflow-hidden transition-all hover:scale-105"
        style={{ 
          borderColor: theme.accent,
          backgroundColor: `${theme.accent}15`,
        }}
      >
        {user?.user_metadata?.avatar_url ? (
          <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <User className="w-5 h-5" style={{ color: theme.accent }} />
        )}
      </button>

      {/* Profile Sidebar */}
      <ProfileSidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentTheme={theme}
        onThemeChange={(themeId) => setTheme(THEMES[themeId])}
      />

      {/* Step Indicator during trials */}
      {isInTrial && (
        <StepIndicator currentStep={currentStep} completedModules={completedModules} />
      )}

      <AnimatePresence mode="wait">
        {/* ═══ INTRO: Sequential Trial Hub ═══ */}
        {currentStep === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            {/* Hero Section with Logo */}
            <section className="relative flex flex-col items-center justify-center text-center px-4 pt-12 pb-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="relative z-10 max-w-4xl mx-auto"
              >
                {/* Empire Logo */}
                <motion.div
                  className="mb-5"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <img
                    src="/logo.png"
                    alt="Empire English Community"
                    className="w-24 h-24 mx-auto object-contain"
                  />
                </motion.div>

                <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-wider mb-3">
                  <span className="gold-shimmer">التجارب الأربع</span>
                </h1>
                <h2 className="font-heading text-base sm:text-lg text-muted-gold tracking-[0.15em] mb-3">
                  The Four Trials
                </h2>
                <p className="text-steel text-sm max-w-lg mx-auto font-arabic leading-relaxed">
                  أكمل التجارب بالترتيب لتحصل على رتبتك الإمبراطورية. كل تجربة تفتح بعد إكمال السابقة.
                </p>

                {/* User badge */}
                {user && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(212,175,55,0.2)] bg-[rgba(212,175,55,0.05)]"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#4ade80]" />
                    <span className="text-xs text-muted-gold">{user.email}</span>
                  </motion.div>
                )}
              </motion.div>
            </section>

            <SectionDivider />

            {/* Progress Summary */}
            <section className="relative z-10 px-4 py-4">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-imperial-gold font-heading">Your Progress</span>
                  <span className="text-xs text-steel">
                    {completedModules.length}/{TRIAL_ORDER.length} trials complete
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 bg-midnight-navy rounded-full overflow-hidden border border-[rgba(212,175,55,0.1)]">
                  <motion.div
                    className="h-full bg-gradient-to-r from-imperial-gold to-bronze rounded-full"
                    animate={{ width: `${(completedModules.length / TRIAL_ORDER.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </section>

            {/* Sequential Trial List */}
            <section className="relative z-10 px-4 py-6">
              <SequentialTrialList
                completedModules={completedModules}
                onBegin={handleBeginTrial}
              />
            </section>

            <SectionDivider />

            {/* Journey Steps */}
            <section className="relative z-10 px-4 py-8">
              <div className="max-w-3xl mx-auto">
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { step: 1, title: 'استمع', icon: '👂', active: !completedModules.includes('listening') },
                    { step: 2, title: 'اقرأ', icon: '📖', active: completedModules.includes('listening') && !completedModules.includes('vocabulary') },
                    { step: 3, title: 'أجب', icon: '✍️', active: completedModules.includes('vocabulary') && !completedModules.includes('grammar') },
                    { step: 4, title: 'تكلّم', icon: '🎙️', active: completedModules.includes('grammar') && !completedModules.includes('speaking') },
                  ].map((item) => (
                    <motion.div
                      key={item.step}
                      className={`text-center ${item.active ? '' : 'opacity-40'}`}
                      animate={item.active ? { scale: [1, 1.05, 1] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <div className="text-2xl mb-1">{item.icon}</div>
                      <p className="text-xs text-parchment font-arabic">{item.title}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
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

// ─── Wrapped with Audio Provider ─────────────────────────

export default function AssessmentPage() {
  return (
    <EmpireAudioProvider>
      <EmpireAudioOverlay />
      <AssessmentContent />
      <Footer />
    </EmpireAudioProvider>
  )
}
