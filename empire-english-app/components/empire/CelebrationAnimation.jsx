'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const RANK_COLORS = {
  L0: '#8b7355',
  L1: '#cd7f32',
  L2: '#D4AF37',
  L3: '#ff6b35',
}

const RANK_EMOJIS = {
  L0: '🗡️',
  L1: '⚔️',
  L2: '🛡️',
  L3: '👑',
}

export default function CelebrationAnimation({ rankName, rankLevel, onComplete }) {
  const [phase, setPhase] = useState(0) // 0=dark, 1=particles, 2=reveal, 3=message
  const accentColor = RANK_COLORS[rankLevel] || '#D4AF37'
  const emoji = RANK_EMOJIS[rankLevel] || '🏛️'

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 500)
    const t2 = setTimeout(() => setPhase(2), 2000)
    const t3 = setTimeout(() => setPhase(3), 4000)
    const t4 = setTimeout(() => onComplete(), 7000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [onComplete])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center"
        style={{ background: '#0A0A0F' }}
      >
        {/* Central radial glow */}
        {phase >= 1 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 1], opacity: [0, 0.4, 0.15] }}
            transition={{ duration: 2, ease: 'easeOut' }}
            className="absolute"
            style={{
              width: 600,
              height: 600,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${accentColor}40 0%, transparent 70%)`,
            }}
          />
        )}

        {/* Burst particles */}
        {phase >= 1 && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(30)].map((_, i) => {
              const angle = (i / 30) * Math.PI * 2
              const distance = 200 + Math.random() * 200
              return (
                <motion.div
                  key={i}
                  className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
                  style={{ backgroundColor: i % 3 === 0 ? accentColor : i % 3 === 1 ? '#D4AF37' : '#e8d48b' }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: Math.cos(angle) * distance,
                    y: Math.sin(angle) * distance,
                    opacity: [1, 0.8, 0],
                    scale: [1, 0.5, 0],
                  }}
                  transition={{ duration: 2 + Math.random(), delay: 0.5 + Math.random() * 0.5, ease: 'easeOut' }}
                />
              )
            })}
          </div>
        )}

        {/* Falling gold particles */}
        {phase >= 2 && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(25)].map((_, i) => (
              <motion.div
                key={`fall-${i}`}
                className="absolute rounded-full"
                style={{
                  width: 2 + Math.random() * 4,
                  height: 2 + Math.random() * 4,
                  backgroundColor: i % 2 === 0 ? accentColor : '#D4AF37',
                  left: `${Math.random() * 100}%`,
                  top: '-5%',
                }}
                animate={{
                  y: ['0vh', '110vh'],
                  opacity: [0, 0.8, 0.8, 0],
                  rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
                }}
                transition={{
                  duration: 4 + Math.random() * 4,
                  delay: Math.random() * 3,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            ))}
          </div>
        )}

        {/* Main content */}
        <div className="relative z-10 text-center px-6">
          {/* Rank Reveal */}
          {phase >= 2 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 150, damping: 12, duration: 1 }}
            >
              <motion.div
                animate={{
                  boxShadow: [
                    `0 0 30px ${accentColor}30, 0 0 60px ${accentColor}10`,
                    `0 0 60px ${accentColor}50, 0 0 120px ${accentColor}20`,
                    `0 0 30px ${accentColor}30, 0 0 60px ${accentColor}10`,
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-block rounded-full p-6 mb-6"
              >
                <span className="text-6xl sm:text-7xl md:text-8xl">
                  {emoji}
                </span>
              </motion.div>
            </motion.div>
          )}

          {/* Rank Name */}
          {phase >= 2 && (
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-4xl sm:text-5xl md:text-7xl font-bold mb-4"
              style={{ color: accentColor, textShadow: `0 0 30px ${accentColor}50` }}
            >
              {rankName}
            </motion.h1>
          )}

          {/* Judgment Message */}
          {phase >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
            >
              <p className="text-steel text-sm sm:text-base tracking-[0.2em] uppercase mb-3 font-arabic">
                لقد تم الحكم عليك من قبل الإمبراطورية
              </p>
              <p className="text-steel text-sm italic">
                Your trials are complete. Your rank has been sealed.
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
