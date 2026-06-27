'use client'

import { motion } from 'framer-motion'
import { useEmpireAudio } from './EmpireAudioProvider'

/**
 * Minimal audio indicator — shows when music is playing.
 * No interactive controls needed since music is fully automatic.
 */
export default function EmpireAudioControls() {
  const { isPlaying, volume } = useEmpireAudio()

  // Only show when music is actually playing
  if (!isPlaying || volume <= 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed bottom-4 right-4 z-40"
    >
      <div className="flex items-center gap-[2px] px-2.5 py-1.5 rounded-full border border-[rgba(212,175,55,0.2)] bg-[rgba(10,10,15,0.85)] backdrop-blur-sm">
        <motion.span className="w-[2px] bg-imperial-gold rounded-full" animate={{ height: [3, 10, 5, 12, 3] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.span className="w-[2px] bg-imperial-gold rounded-full" animate={{ height: [6, 3, 12, 5, 6] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: 0.1 }} />
        <motion.span className="w-[2px] bg-imperial-gold rounded-full" animate={{ height: [4, 12, 3, 8, 4] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }} />
        <motion.span className="w-[2px] bg-imperial-gold rounded-full" animate={{ height: [8, 5, 10, 3, 8] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }} />
      </div>
    </motion.div>
  )
}
