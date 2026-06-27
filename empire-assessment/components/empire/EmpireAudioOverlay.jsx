'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEmpireAudio } from './EmpireAudioProvider'

export default function EmpireAudioOverlay() {
  const { showOverlay, activate, skipActivation } = useEmpireAudio()

  return (
    <AnimatePresence>
      {showOverlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-[#0A0A0F]" />

          {/* Atmospheric layers */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[radial-gradient(ellipse,rgba(212,175,55,0.08)_0%,rgba(212,175,55,0.02)_40%,transparent_70%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.7)_100%)]" />
          </div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
            className="relative z-10 text-center px-6 max-w-lg"
          >
            {/* Decorative top line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.2, delay: 0.5 }}
              className="w-32 h-px mx-auto mb-8 bg-gradient-to-r from-transparent via-imperial-gold to-transparent"
            />

            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mb-6"
            >
              <img
                src="/logo-sm.png"
                alt="Empire English"
                className="w-20 h-20 mx-auto object-contain"
              />
            </motion.div>

            {/* Main heading */}
            <motion.h2
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-wider mb-3"
            >
              <span className="gold-shimmer">ادخل الإمبراطورية</span>
            </motion.h2>

            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9 }}
              className="font-heading text-lg sm:text-xl text-imperial-gold tracking-[0.15em] mb-4"
            >
              ENTER THE EMPIRE
            </motion.h3>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.0 }}
              className="text-muted-gold text-sm sm:text-base italic mb-10 font-arabic"
            >
              فعّل التجربة السينمائية مع الموسيقى الإمبراطورية
            </motion.p>

            {/* Activation Button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
              whileHover={{ scale: 1.03, boxShadow: '0 0 40px rgba(212,175,55,0.3)' }}
              whileTap={{ scale: 0.97 }}
              onClick={activate}
              className="relative px-10 py-4 rounded-md font-bold text-base sm:text-lg tracking-wider text-sovereign-black bg-gradient-to-r from-imperial-gold to-bronze cursor-pointer transition-all duration-300 hover:from-[#e0c04c] hover:to-[#d48f42] shadow-gold-md"
            >
              <div className="absolute inset-0 rounded-md border border-[rgba(232,212,139,0.3)] pointer-events-none" />
              <span className="font-arabic">🎵 فعّل التجربة</span>
            </motion.button>

            {/* Skip link */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ duration: 0.6, delay: 2.0 }}
              whileHover={{ opacity: 0.8 }}
              onClick={skipActivation}
              className="block mx-auto mt-6 text-muted-gold text-xs tracking-[0.2em] uppercase cursor-pointer bg-transparent border-none hover:text-imperial-gold transition-colors"
            >
              <span className="font-arabic">ادخل بصمت</span>
              <span className="mx-2">•</span>
              <span>Enter silently</span>
            </motion.button>

            {/* Decorative bottom line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.2, delay: 1.5 }}
              className="w-32 h-px mx-auto mt-8 bg-gradient-to-r from-transparent via-imperial-gold to-transparent"
            />
          </motion.div>

          {/* Floating particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-imperial-gold"
                style={{
                  left: `${10 + Math.random() * 80}%`,
                  top: `${10 + Math.random() * 80}%`,
                }}
                animate={{
                  opacity: [0, 0.4, 0],
                  y: [0, -30 - Math.random() * 50],
                  x: [0, (Math.random() - 0.5) * 20],
                }}
                transition={{
                  duration: 3 + Math.random() * 3,
                  repeat: Infinity,
                  delay: Math.random() * 4,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
