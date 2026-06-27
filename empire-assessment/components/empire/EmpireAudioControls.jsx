'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEmpireAudio } from './EmpireAudioProvider'

export default function EmpireAudioControls() {
  const { isPlaying, isMuted, volume, toggleMute, setVolume } = useEmpireAudio()
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {/* Expanded volume panel */}
      <AnimatePresence>
        {isExpanded && isPlaying && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="mb-2 px-4 py-3 rounded-lg border border-[rgba(212,175,55,0.2)] bg-[rgba(10,10,15,0.92)] backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center gap-3">
              <span className="text-muted-gold text-[10px] tracking-[0.15em] uppercase min-w-[32px]">
                {Math.round(volume * 100)}
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={(e) => setVolume(Number(e.target.value) / 100)}
                className="w-24 h-1 appearance-none cursor-pointer rounded-full"
                style={{
                  background: `linear-gradient(to right, #D4AF37 ${volume * 100}%, rgba(212,175,55,0.15) ${volume * 100}%)`,
                }}
              />
              <span className="text-imperial-gold text-[10px] tracking-[0.1em]">
                VOL
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main control button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          if (!isPlaying) return
          setIsExpanded(!isExpanded)
        }}
        className="relative group"
        aria-label={isMuted ? 'Unmute audio' : 'Audio controls'}
      >
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all duration-300 cursor-pointer ${
            isPlaying
              ? 'border-[rgba(212,175,55,0.3)] bg-[rgba(10,10,15,0.9)] backdrop-blur-md hover:border-[rgba(212,175,55,0.5)]'
              : 'border-[rgba(212,175,55,0.15)] bg-[rgba(10,10,15,0.7)] backdrop-blur-md'
          }`}
        >
          {/* Sound wave animation */}
          {isPlaying && !isMuted && (
            <div className="flex items-center gap-[2px] h-4">
              <motion.span className="w-[2px] bg-imperial-gold rounded-full" animate={{ height: [4, 12, 6, 14, 4] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }} />
              <motion.span className="w-[2px] bg-imperial-gold rounded-full" animate={{ height: [8, 4, 14, 6, 8] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.1 }} />
              <motion.span className="w-[2px] bg-imperial-gold rounded-full" animate={{ height: [6, 14, 4, 10, 6] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }} />
              <motion.span className="w-[2px] bg-imperial-gold rounded-full" animate={{ height: [10, 6, 12, 4, 10] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }} />
            </div>
          )}

          {/* Muted indicator */}
          {isPlaying && isMuted && (
            <div className="flex items-center gap-[2px] h-4">
              <span className="w-[2px] h-[3px] bg-muted-gold rounded-full" />
              <span className="w-[2px] h-[3px] bg-muted-gold rounded-full" />
              <span className="w-[2px] h-[3px] bg-muted-gold rounded-full" />
              <span className="w-[2px] h-[3px] bg-muted-gold rounded-full" />
            </div>
          )}

          {/* Not playing */}
          {!isPlaying && (
            <div className="flex items-center gap-[2px] h-4">
              <span className="w-[2px] h-[3px] bg-[rgba(212,175,55,0.3)] rounded-full" />
              <span className="w-[2px] h-[3px] bg-[rgba(212,175,55,0.3)] rounded-full" />
              <span className="w-[2px] h-[3px] bg-[rgba(212,175,55,0.3)] rounded-full" />
              <span className="w-[2px] h-[3px] bg-[rgba(212,175,55,0.3)] rounded-full" />
            </div>
          )}

          {/* Mute/Unmute button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleMute()
            }}
            className="flex items-center justify-center w-5 h-5 text-imperial-gold hover:text-[#e8d48b] transition-colors"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || !isPlaying ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>
        </div>

        {/* Glow ring when playing */}
        {isPlaying && !isMuted && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            animate={{
              boxShadow: [
                '0 0 8px rgba(212,175,55,0.1)',
                '0 0 16px rgba(212,175,55,0.15)',
                '0 0 8px rgba(212,175,55,0.1)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </motion.button>
    </div>
  )
}
