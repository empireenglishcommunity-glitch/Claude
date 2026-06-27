'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Award, Clock, ArrowLeft, Trophy, BarChart3 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { MetallicCard, ImperialButton, ImperialRankBadge, ImperialProgress, SectionDivider, ParticleBackground } from '../../components/empire'
import { IMPERIAL_RANKS } from '../../lib/scoring-engine'

const LEVEL_COLORS = { L0: '#8b7355', L1: '#cd7f32', L2: '#D4AF37', L3: '#ff6b35' }

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [assessments, setAssessments] = useState([])

  useEffect(() => {
    const init = async () => {
      // Use getSession first (reads from localStorage, no network call)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setUser(session.user)
        // Load assessment history
        const saved = localStorage.getItem(`assessments_${session.user.id}`)
        if (saved) {
          try { setAssessments(JSON.parse(saved)) } catch {}
        }
        setLoading(false)
      } else {
        // No session — try getUser as fallback (network call)
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          setUser(authUser)
          const saved = localStorage.getItem(`assessments_${authUser.id}`)
          if (saved) {
            try { setAssessments(JSON.parse(saved)) } catch {}
          }
          setLoading(false)
        } else {
          // Truly not authenticated — redirect to login
          window.location.href = '/login?redirect=/profile'
        }
      }
    }
    init()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        const saved = localStorage.getItem(`assessments_${session.user.id}`)
        if (saved) {
          try { setAssessments(JSON.parse(saved)) } catch {}
        }
        setLoading(false)
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen empire-bg flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <Trophy className="w-10 h-10 text-imperial-gold" />
        </motion.div>
      </div>
    )
  }

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Student'
  const profilePic = user?.user_metadata?.avatar_url || null
  const latestAssessment = assessments[0] || null
  const latestLevel = latestAssessment?.result?.level || null
  const rankConfig = latestLevel ? IMPERIAL_RANKS[latestLevel] : null

  return (
    <div className="min-h-screen empire-bg">
      <ParticleBackground count={20} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        {/* Back button */}
        <a href="/" className="inline-flex items-center gap-2 text-muted-gold text-sm mb-6 hover:text-imperial-gold transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-arabic">العودة للاختبار</span>
        </a>

        {/* Profile Header */}
        <MetallicCard className="p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-imperial-gold overflow-hidden flex items-center justify-center bg-[rgba(212,175,55,0.1)]">
              {profilePic ? (
                <img src={profilePic} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-7 h-7 text-imperial-gold" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-xl text-parchment font-bold font-arabic">{userName}</h1>
              <p className="text-sm text-steel">{user?.email}</p>
              {rankConfig && (
                <div className="flex items-center gap-2 mt-1">
                  <ImperialRankBadge level={latestLevel} size="sm" />
                </div>
              )}
            </div>
          </div>
        </MetallicCard>

        <SectionDivider />

        {/* Assessment History */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-imperial-gold" />
            <h2 className="text-lg text-imperial-gold font-bold font-arabic">سجل الاختبارات</h2>
          </div>

          {assessments.length === 0 ? (
            <MetallicCard className="p-8 text-center">
              <Trophy className="w-10 h-10 text-muted-gold mx-auto mb-3 opacity-50" />
              <p className="text-muted-gold font-arabic mb-4">لم تكمل أي اختبار بعد</p>
              <a href="/">
                <ImperialButton variant="primary" size="md">
                  <span className="font-arabic">ابدأ الاختبار الآن</span>
                </ImperialButton>
              </a>
            </MetallicCard>
          ) : (
            <div className="space-y-4">
              {assessments.map((assessment, idx) => {
                const { scores, result, timestamp } = assessment
                const level = result?.level || 'L0'
                const levelColor = LEVEL_COLORS[level]
                const rank = IMPERIAL_RANKS[level]

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <MetallicCard className="p-5">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full border-2 flex items-center justify-center"
                            style={{ borderColor: levelColor, backgroundColor: `${levelColor}15` }}
                          >
                            <span className="text-lg">{rank?.emoji || '🗡️'}</span>
                          </div>
                          <div>
                            <p className="text-parchment font-bold text-sm">{rank?.name || 'Recruit'}</p>
                            <p className="text-xs text-steel">
                              {new Date(timestamp).toLocaleDateString('ar-EG', { 
                                year: 'numeric', month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        <span
                          className="text-xs font-bold px-3 py-1 rounded-full border"
                          style={{ color: levelColor, borderColor: `${levelColor}40`, backgroundColor: `${levelColor}10` }}
                        >
                          {level}
                        </span>
                      </div>

                      {/* Scores */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: 'Listening', label_ar: 'استماع', score: scores?.listening },
                          { label: 'Vocabulary', label_ar: 'مفردات', score: scores?.vocabulary },
                          { label: 'Grammar', label_ar: 'قواعد', score: scores?.grammar },
                          { label: 'Speaking', label_ar: 'تحدث', score: scores?.speaking },
                        ].map((item) => (
                          <div key={item.label} className="text-center">
                            <p className="text-xs text-steel font-arabic">{item.label_ar}</p>
                            <p className="text-lg font-bold" style={{ color: (item.score || 0) >= 60 ? '#D4AF37' : (item.score || 0) >= 35 ? '#cd7f32' : '#8b7355' }}>
                              {item.score || 0}%
                            </p>
                            <ImperialProgress
                              value={item.score || 0}
                              max={100}
                              showPercentage={false}
                              size="sm"
                              color={(item.score || 0) >= 60 ? '#D4AF37' : (item.score || 0) >= 35 ? '#cd7f32' : '#8b7355'}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Flag */}
                      {result?.flag && (
                        <div className="mt-3 pt-3 border-t border-[rgba(212,175,55,0.08)]">
                          <p className="text-xs text-fire-glow">⚠️ Flagged for review</p>
                        </div>
                      )}
                    </MetallicCard>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        <SectionDivider />

        {/* Retake CTA */}
        <div className="text-center pb-8">
          <a href="/">
            <ImperialButton variant="outline" size="md">
              <span className="font-arabic">إعادة الاختبار</span>
            </ImperialButton>
          </a>
        </div>
      </div>
    </div>
  )
}
