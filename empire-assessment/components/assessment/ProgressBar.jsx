'use client'

import { motion } from 'framer-motion'

export default function ProgressBar({ current, total, label, sublabel }) {
  const pct = Math.round((current / total) * 100)
  
  return (
    <div className="w-full mb-6">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          {label && <span className="text-sm text-parchment font-arabic font-bold">{label}</span>}
          {sublabel && <span className="text-xs text-muted-gold">{sublabel}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-imperial-gold font-bold tabular-nums">{current}/{total}</span>
          <span className="text-xs text-steel">({pct}%)</span>
        </div>
      </div>
      <div className="w-full h-2.5 bg-[#0A0A0F] rounded-full overflow-hidden border border-[rgba(212,175,55,0.1)]">
        <motion.div
          className="h-full bg-gradient-to-r from-imperial-gold to-bronze rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
