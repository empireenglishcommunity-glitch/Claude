'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Headphones, BookOpen, Shield, Swords, Crown, Star, Target, 
  CheckCircle2, XCircle, Zap, ArrowRight, AlertTriangle, User,
  Download, Share2, TrendingUp, TrendingDown
} from 'lucide-react'
import { 
  MetallicCard, GlowingBorder, ImperialButton, SectionDivider, 
  ImperialProgress, TacticalPanel, ImperialRankBadge, CelebrationAnimation, ParticleBackground 
} from '../empire'
import { getStudyPlan } from '../../lib/scoring'
import { IMPERIAL_RANKS, IMPERIAL_RANK_DESCRIPTIONS, IMPERIAL_TRAINING_PATHS } from '../../lib/scoring-engine'
import { generateRankCard, generateCertificate, downloadImage, shareImage } from '../../lib/certificate-generator'
import { getRetakeComparison, formatDiff } from '../../lib/retake-comparison'

// ─── Module Display Config ──────────────────────────────────

const MODULE_CARDS = [
  { key: 'listening', icon: Headphones, label: 'Listening', label_ar: 'الاستماع', empireTitle: 'Trial of the Ear' },
  { key: 'vocabulary', icon: BookOpen, label: 'Vocabulary', label_ar: 'المفردات', empireTitle: 'Trial of Words' },
  { key: 'grammar', icon: Shield, label: 'Grammar', label_ar: 'القواعد', empireTitle: 'Trial of Structure' },
  { key: 'speaking', icon: Swords, label: 'Speaking', label_ar: 'التحدث', empireTitle: 'Trial of Voice' },
]

const LEVEL_COLORS = {
  L0: '#8b7355',
  L1: '#cd7f32',
  L2: '#D4AF37',
  L3: '#ff6b35',
}

// ─── Animation Variants ──────────────────────────────────

const ceremonyVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 1.5, ease: 'easeOut' } },
}

const rankRevealVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 200, damping: 15, delay: 0.5 } },
}

const rankNameVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 1.0 } },
}

const moduleCardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: 1.5 + i * 0.15 } }),
}

const strengthsVariants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, delay: 2.5 } },
}

const weaknessesVariants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, delay: 2.7 } },
}

const pathVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 3.2 } },
}

const planVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 3.8 } },
}

// ─── Main Results Component ──────────────────────────────

export default function AssessmentResults({ result, user }) {
  const { level, levels_by_module, scores, flag, flag_reason, level_info } = result
  const plan = getStudyPlan(level)

  const [showCelebration, setShowCelebration] = useState(true)
  const [showCeremony, setShowCeremony] = useState(false)

  const rankConfig = IMPERIAL_RANKS[level] || IMPERIAL_RANKS.L0
  const rankColor = LEVEL_COLORS[level] || '#8b7355'
  const studentName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Student'

  // Retake comparison
  const { comparison } = getRetakeComparison(user?.id, scores)

  const handleCelebrationComplete = useCallback(() => {
    setShowCelebration(false)
    setShowCeremony(true)
  }, [])

  // Determine strengths and weaknesses based on SCORE PERFORMANCE
  // A weakness is any module where the student scored below the average or below 50%
  // A strength is any module scoring above average or above 70%
  const moduleScores = Object.entries(scores).map(([key, score]) => ({
    key,
    score,
    level: levels_by_module[key],
  }))
  const avgScore = moduleScores.reduce((sum, m) => sum + m.score, 0) / moduleScores.length
  const sorted = [...moduleScores].sort((a, b) => b.score - a.score)
  
  // Weaknesses: below 50% OR significantly below average (15+ points below)
  const weaknesses = sorted.filter(m => m.score < 50 || (m.score < avgScore - 15))
  // Strengths: above 70% OR significantly above average
  const strengths = sorted.filter(m => m.score >= 70 || (m.score >= avgScore + 10 && m.score >= 50))

  return (
    <div className="min-h-screen empire-bg relative">
      <ParticleBackground count={40} />

      {/* Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <CelebrationAnimation
            rankName={rankConfig.name}
            rankLevel={level}
            onComplete={handleCelebrationComplete}
          />
        )}
      </AnimatePresence>

      {/* Main Ceremony Content */}
      <AnimatePresence>
        {showCeremony && (
          <motion.div
            initial="hidden"
            animate="visible"
            className="relative z-10 max-w-5xl mx-auto px-4 py-12 space-y-10"
          >
            {/* ═══ Ceremony Header ═══ */}
            <motion.section variants={ceremonyVariants} className="text-center space-y-3">
              <p className="text-muted-gold text-sm tracking-[0.3em] uppercase">
                The Imperial Decree
              </p>
              <motion.h1
                className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight"
                animate={{
                  textShadow: [
                    '0 0 20px rgba(212,175,55,0.3), 0 0 40px rgba(212,175,55,0.1)',
                    '0 0 40px rgba(212,175,55,0.6), 0 0 80px rgba(212,175,55,0.2)',
                    '0 0 20px rgba(212,175,55,0.3), 0 0 40px rgba(212,175,55,0.1)',
                  ],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span className="gold-shimmer">الإمبراطورية تكلمت</span>
              </motion.h1>
              <p className="text-muted-gold text-base italic max-w-lg mx-auto font-arabic">
                من خلال النار والتجارب، تم قياس قيمتك. ها هي رتبتك.
              </p>
            </motion.section>

            {/* ═══ Rank Reveal ═══ */}
            <motion.section className="flex flex-col items-center gap-6 py-8">
              {/* Glow burst */}
              <motion.div
                className="absolute"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 2, 1.5], opacity: [0, 0.4, 0] }}
                transition={{ duration: 1.5, delay: 0.3 }}
                style={{
                  width: 200,
                  height: 200,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${rankColor}60, transparent 70%)`,
                  pointerEvents: 'none',
                }}
              />

              {/* Rank Badge */}
              <motion.div variants={rankRevealVariants}>
                <motion.div
                  animate={{
                    boxShadow: [
                      `0 0 20px ${rankColor}30, 0 0 40px ${rankColor}15`,
                      `0 0 40px ${rankColor}60, 0 0 80px ${rankColor}30`,
                      `0 0 20px ${rankColor}30, 0 0 40px ${rankColor}15`,
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="rounded-full p-3"
                >
                  <ImperialRankBadge level={level} size="lg" showLabel={false} />
                </motion.div>
              </motion.div>

              {/* Rank Name */}
              <motion.div variants={rankNameVariants} className="text-center space-y-2">
                <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold" style={{ color: rankColor }}>
                  {rankConfig.name}
                </h2>
                <p className="text-xl font-arabic font-bold" style={{ color: rankColor }}>
                  {rankConfig.name_ar}
                </p>
                <p className="text-muted-gold text-sm max-w-md mx-auto italic">
                  {IMPERIAL_RANK_DESCRIPTIONS[level]}
                </p>
              </motion.div>
            </motion.section>

            <SectionDivider />

            {/* ═══ Module Breakdown ═══ */}
            <motion.section className="space-y-6">
              <h2 className="font-heading text-2xl text-imperial-gold text-center text-glow font-arabic">
                التجارب الأربع — تفاصيل الأداء
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {MODULE_CARDS.map((mod, i) => {
                  const score = scores[mod.key] || 0
                  const moduleLevel = levels_by_module[mod.key] || 'L0'
                  const levelColor = LEVEL_COLORS[moduleLevel] || '#8b7355'
                  const isStrength = strengths.some(s => s.key === mod.key)
                  const isWeakness = weaknesses.some(w => w.key === mod.key)
                  const Icon = mod.icon

                  return (
                    <motion.div key={mod.key} custom={i} variants={moduleCardVariants}>
                      <MetallicCard className="p-5 h-full flex flex-col">
                        {/* Module header */}
                        <div className="flex items-center gap-3 mb-4">
                          <div
                            className="w-10 h-10 rounded-full border flex items-center justify-center"
                            style={{
                              borderColor: `${levelColor}50`,
                              backgroundColor: `${levelColor}10`,
                            }}
                          >
                            <Icon className="w-5 h-5" style={{ color: levelColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-parchment text-sm font-bold truncate">{mod.label}</h3>
                            <p className="text-muted-gold text-xs truncate">{mod.empireTitle}</p>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-muted-gold text-xs">Score</span>
                            <span className="text-sm font-bold" style={{ color: levelColor }}>
                              {score}%
                            </span>
                          </div>
                          <ImperialProgress value={score} max={100} showPercentage={false} color={levelColor} size="sm" />
                        </div>

                        {/* Level */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-muted-gold text-xs">Rank</span>
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full border"
                            style={{
                              color: levelColor,
                              borderColor: `${levelColor}30`,
                              backgroundColor: `${levelColor}10`,
                            }}
                          >
                            {IMPERIAL_RANKS[moduleLevel]?.name || 'Recruit'}
                          </span>
                        </div>

                        {/* Assessment label */}
                        <div className="mt-auto pt-3 border-t border-[rgba(212,175,55,0.1)]">
                          {isStrength ? (
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-imperial-gold" />
                              <span className="text-imperial-gold text-xs">Strength</span>
                            </div>
                          ) : isWeakness ? (
                            <div className="flex items-center gap-1.5">
                              <XCircle className="w-3.5 h-3.5 text-muted-gold" />
                              <span className="text-muted-gold text-xs">Needs Work</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Star className="w-3.5 h-3.5 text-muted-gold" />
                              <span className="text-muted-gold text-xs">On Track</span>
                            </div>
                          )}
                        </div>
                      </MetallicCard>
                    </motion.div>
                  )
                })}
              </div>
            </motion.section>

            <SectionDivider />

            {/* ═══ Strengths & Weaknesses ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Strengths */}
              <motion.section variants={strengthsVariants} className="space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-imperial-gold" />
                  <h2 className="font-heading text-xl text-imperial-gold font-arabic">نقاط القوة</h2>
                </div>
                <TacticalPanel accentSide="left" accentColor={rankColor}>
                  {strengths.length > 0 ? (
                    <div className="space-y-3">
                      {strengths.map((s, i) => {
                        const mod = MODULE_CARDS.find(m => m.key === s.key)
                        return (
                          <motion.div
                            key={s.key}
                            initial={{ opacity: 0, x: -15 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 2.8 + i * 0.1 }}
                            className="flex items-start gap-3 py-2 border-b border-[rgba(212,175,55,0.08)] last:border-b-0"
                          >
                            <CheckCircle2 className="w-4 h-4 text-imperial-gold mt-0.5 shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-parchment text-sm">{mod?.label_ar || s.key}</span>
                                <span
                                  className="text-[10px] px-2 py-0.5 rounded-full border"
                                  style={{
                                    color: LEVEL_COLORS[s.level],
                                    borderColor: `${LEVEL_COLORS[s.level]}30`,
                                    backgroundColor: `${LEVEL_COLORS[s.level]}10`,
                                  }}
                                >
                                  {IMPERIAL_RANKS[s.level]?.name}
                                </span>
                              </div>
                              <p className="text-muted-gold text-xs mt-0.5">
                                {s.score}% — Performing at or above your overall level
                              </p>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-gold text-sm italic font-arabic">
                      استمر في التدريب لتطوير نقاط قوتك.
                    </p>
                  )}
                </TacticalPanel>
              </motion.section>

              {/* Weaknesses */}
              <motion.section variants={weaknessesVariants} className="space-y-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-muted-gold" />
                  <h2 className="font-heading text-xl text-muted-gold font-arabic">مجالات التحسين</h2>
                </div>
                <TacticalPanel accentSide="left" accentColor="#8b7355">
                  {weaknesses.length > 0 ? (
                    <div className="space-y-3">
                      {weaknesses.map((w, i) => {
                        const mod = MODULE_CARDS.find(m => m.key === w.key)
                        return (
                          <motion.div
                            key={w.key}
                            initial={{ opacity: 0, x: 15 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 3.0 + i * 0.1 }}
                            className="flex items-start gap-3 py-2 border-b border-[rgba(212,175,55,0.08)] last:border-b-0"
                          >
                            <XCircle className="w-4 h-4 text-muted-gold mt-0.5 shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-parchment text-sm">{mod?.label_ar || w.key}</span>
                                <span
                                  className="text-[10px] px-2 py-0.5 rounded-full border"
                                  style={{
                                    color: LEVEL_COLORS[w.level],
                                    borderColor: `${LEVEL_COLORS[w.level]}30`,
                                    backgroundColor: `${LEVEL_COLORS[w.level]}10`,
                                  }}
                                >
                                  {IMPERIAL_RANKS[w.level]?.name}
                                </span>
                              </div>
                              <p className="text-muted-gold text-xs mt-0.5">
                                {w.score}% — Focus additional practice here
                              </p>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 py-2">
                      <CheckCircle2 className="w-5 h-5 text-imperial-gold" />
                      <div>
                        <p className="text-imperial-gold text-sm font-arabic">لا توجد نقاط ضعف!</p>
                        <p className="text-muted-gold text-xs">All modules at or above your Imperial Level.</p>
                      </div>
                    </div>
                  )}
                </TacticalPanel>
              </motion.section>
            </div>

            <SectionDivider />

            {/* ═══ Flag Notice ═══ */}
            {flag && (
              <motion.section
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 3.0 }}
              >
                <GlowingBorder color="fire" intensity="high" className="rounded-lg">
                  <MetallicCard hover={false} glowOnHover={false} className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full border-2 border-fire-glow flex items-center justify-center bg-[rgba(255,107,53,0.1)] shrink-0">
                        <AlertTriangle className="w-6 h-6 text-fire-glow" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-fire-glow text-lg font-bold mb-1 font-arabic">
                          مطلوب مراجعة إمبراطورية
                        </h3>
                        <p className="text-parchment text-sm mb-2 font-arabic">
                          نتائجك تظهر تباينًا كبيرًا بين المهارات. سيراجع المؤسس أداءك خلال 48 ساعة.
                        </p>
                        <p className="text-muted-gold text-xs italic border-l-2 border-[rgba(255,107,53,0.3)] pl-3" dir="ltr">
                          {flag_reason}
                        </p>
                      </div>
                    </div>
                  </MetallicCard>
                </GlowingBorder>
              </motion.section>
            )}

            {/* ═══ Training Path ═══ */}
            <motion.section variants={pathVariants} className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-bronze" />
                <h2 className="font-heading text-xl text-bronze font-arabic">مسار التدريب الإمبراطوري</h2>
              </div>
              <TacticalPanel accentSide="left" accentColor={rankColor}>
                <div className="space-y-4">
                  {/* Rank & Path Name */}
                  <div className="flex items-center gap-3">
                    <ImperialRankBadge level={level} size="sm" />
                    <div>
                      <p className="text-sm font-bold" style={{ color: rankColor }}>
                        {rankConfig.name} — {level === 'L0' ? 'Foundation' : level === 'L1' ? 'Initiate' : level === 'L2' ? 'Warrior' : 'Champion'} Path
                      </p>
                    </div>
                  </div>

                  <div className="h-px bg-[rgba(212,175,55,0.1)]" />

                  {/* Path Description */}
                  <p className="text-parchment text-sm leading-relaxed">
                    {IMPERIAL_TRAINING_PATHS[level]}
                  </p>

                  <div className="h-px bg-[rgba(212,175,55,0.1)]" />

                  {/* Next Rank */}
                  {level !== 'L3' && (
                    <div className="flex items-start gap-3">
                      <ArrowRight className="w-4 h-4 text-bronze mt-0.5 shrink-0" />
                      <div>
                        <p className="text-bronze text-sm">
                          Next Rank: {IMPERIAL_RANKS[`L${parseInt(level[1]) + 1}`]?.name}
                        </p>
                        <p className="text-muted-gold text-xs mt-0.5 font-arabic">
                          ركّز على نقاط الضعف للتقدم إلى الرتبة التالية.
                        </p>
                      </div>
                    </div>
                  )}

                  {level === 'L3' && (
                    <div className="flex items-start gap-3">
                      <Crown className="w-4 h-4 text-fire-glow mt-0.5 shrink-0" />
                      <div>
                        <p className="text-fire-glow text-sm font-bold">Maximum Rank Achieved</p>
                        <p className="text-muted-gold text-xs mt-0.5 font-arabic">
                          أنت من أفضل محاربي الإمبراطورية. استمر في صقل مهاراتك.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </TacticalPanel>
            </motion.section>

            <SectionDivider />

            {/* ═══ Study Plan ═══ */}
            <motion.section variants={planVariants} className="space-y-4">
              <h2 className="font-heading text-2xl text-imperial-gold text-center text-glow font-arabic">
                خطتك المخصصة
              </h2>

              <MetallicCard className="p-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  {[
                    { value: plan.daily_minutes, label: 'دقيقة/يوم', icon: '⏱️' },
                    { value: plan.duration, label: 'المدة المتوقعة', icon: '📅' },
                    { value: plan.vocab_target, label: 'هدف المفردات', icon: '📖' },
                    { value: plan.tasks_per_day, label: 'مهام يومية', icon: '✅' },
                  ].map((stat, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 4.0 + i * 0.1 }}
                      className="bg-[rgba(10,10,15,0.6)] rounded-lg p-4 text-center border border-[rgba(212,175,55,0.08)]"
                    >
                      <div className="text-lg mb-1">{stat.icon}</div>
                      <p className="text-xl font-bold text-imperial-gold">{stat.value}</p>
                      <p className="text-xs text-steel font-arabic">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Focus Areas */}
                <h4 className="text-sm font-bold text-parchment mb-3 font-arabic">مجالات التركيز:</h4>
                <ul className="space-y-2">
                  {plan.focus_areas.map((area, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 4.2 + i * 0.08 }}
                      className="flex items-start gap-2 text-sm text-steel"
                      dir="ltr"
                    >
                      <span className="text-imperial-gold mt-0.5 shrink-0">▸</span>
                      <span>{area}</span>
                    </motion.li>
                  ))}
                </ul>
              </MetallicCard>
            </motion.section>

            <SectionDivider />

            {/* ═══ Retake Comparison ═══ */}
            {comparison && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 4.0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  {comparison.improved ? <TrendingUp className="w-5 h-5 text-[#4ade80]" /> : <TrendingDown className="w-5 h-5 text-[#ef4444]" />}
                  <h2 className="font-heading text-xl font-arabic" style={{ color: comparison.improved ? '#4ade80' : '#ef4444' }}>
                    {comparison.improved ? 'تحسن منذ آخر اختبار!' : 'مقارنة بآخر اختبار'}
                  </h2>
                </div>
                <MetallicCard className="p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
                    {[
                      { label: 'Listening', diff: comparison.listening },
                      { label: 'Vocabulary', diff: comparison.vocabulary },
                      { label: 'Grammar', diff: comparison.grammar },
                      { label: 'Speaking', diff: comparison.speaking },
                      { label: 'Overall', diff: comparison.overall },
                    ].map((item) => {
                      const f = formatDiff(item.diff)
                      return (
                        <div key={item.label}>
                          <p className="text-xs text-steel">{item.label}</p>
                          <p className="text-lg font-bold" style={{ color: f.color }}>{f.text}</p>
                          <span className="text-sm">{f.emoji}</span>
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-center text-xs text-muted-gold mt-3">
                    Compared to {new Date(comparison.previousDate).toLocaleDateString('ar-EG')} ({IMPERIAL_RANKS[comparison.previousLevel]?.name})
                  </p>
                </MetallicCard>
              </motion.section>
            )}

            <SectionDivider />

            {/* ═══ Share & Download ═══ */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 4.3 }}
              className="space-y-4"
            >
              <h2 className="font-heading text-xl text-imperial-gold text-center font-arabic">شارك إنجازك</h2>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <ImperialButton
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    const card = generateRankCard(studentName, level, scores)
                    shareImage(card, 'Empire English — My Rank', `I achieved ${rankConfig.name} rank!`)
                  }}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  <span className="font-arabic">شارك بطاقة الرتبة</span>
                </ImperialButton>
                <ImperialButton
                  variant="outline"
                  size="md"
                  onClick={() => {
                    const cert = generateCertificate(studentName, level, scores)
                    downloadImage(cert, `empire-certificate-${level}.png`)
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  <span className="font-arabic">تحميل الشهادة</span>
                </ImperialButton>
              </div>
            </motion.section>

            <SectionDivider />

            {/* ═══ CTA ═══ */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 4.5 }}
              className="text-center pb-8 space-y-4"
            >
              <GlowingBorder intensity="medium" className="rounded-lg inline-block">
                <a href="/profile" className="block">
                  <ImperialButton variant="primary" size="xl">
                    <span className="font-arabic">عرض ملفي الشخصي</span>
                    <User className="w-5 h-5 ml-2" />
                  </ImperialButton>
                </a>
              </GlowingBorder>
              <p className="text-steel text-xs font-arabic">
                نتائجك محفوظة في ملفك الشخصي ويمكنك الرجوع إليها في أي وقت.
              </p>
              <div className="flex justify-center gap-3 mt-4">
                <a href="/" className="text-muted-gold text-xs hover:text-imperial-gold transition-colors font-arabic">
                  إعادة الاختبار
                </a>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
