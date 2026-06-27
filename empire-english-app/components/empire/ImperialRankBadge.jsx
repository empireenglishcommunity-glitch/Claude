'use client'

import { motion } from 'framer-motion'

const RANK_CONFIG = {
  L0: { name: 'Recruit', name_ar: 'مجند', emoji: '🗡️', color: '#8b7355' },
  L1: { name: 'Initiate', name_ar: 'مبتدئ', emoji: '⚔️', color: '#cd7f32' },
  L2: { name: 'Warrior', name_ar: 'محارب', emoji: '🛡️', color: '#D4AF37' },
  L3: { name: 'Champion', name_ar: 'بطل', emoji: '👑', color: '#ff6b35' },
}

export default function ImperialRankBadge({ level = 'L0', size = 'md', showLabel = true }) {
  const config = RANK_CONFIG[level] || RANK_CONFIG.L0
  
  const sizes = {
    sm: { badge: 'w-8 h-8', text: 'text-sm', label: 'text-xs' },
    md: { badge: 'w-12 h-12', text: 'text-xl', label: 'text-sm' },
    lg: { badge: 'w-20 h-20', text: 'text-4xl', label: 'text-base' },
  }

  const s = sizes[size] || sizes.md

  return (
    <div className="flex items-center gap-2">
      <motion.div
        className={`${s.badge} rounded-full border-2 flex items-center justify-center`}
        style={{
          borderColor: config.color,
          boxShadow: `0 0 12px ${config.color}30`,
          backgroundColor: `${config.color}10`,
        }}
        animate={{
          boxShadow: [
            `0 0 8px ${config.color}20`,
            `0 0 16px ${config.color}40`,
            `0 0 8px ${config.color}20`,
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className={s.text}>{config.emoji}</span>
      </motion.div>
      {showLabel && (
        <div>
          <p className={`${s.label} font-bold`} style={{ color: config.color }}>{config.name}</p>
          <p className="text-xs text-steel font-arabic">{config.name_ar}</p>
        </div>
      )}
    </div>
  )
}
