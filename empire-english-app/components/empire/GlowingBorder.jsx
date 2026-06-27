'use client'

import { motion } from 'framer-motion'

export default function GlowingBorder({ children, className = '', color = 'gold', intensity = 'medium' }) {
  const colorMap = {
    gold: { border: 'rgba(212, 175, 55, VAR)', shadow: 'rgba(212, 175, 55, VAR)' },
    bronze: { border: 'rgba(205, 127, 50, VAR)', shadow: 'rgba(205, 127, 50, VAR)' },
    fire: { border: 'rgba(255, 107, 53, VAR)', shadow: 'rgba(255, 107, 53, VAR)' },
    emerald: { border: 'rgba(27, 94, 32, VAR)', shadow: 'rgba(27, 94, 32, VAR)' },
  }

  const intensityMap = {
    low: { base: 0.15, pulse: 0.25, shadow: 5 },
    medium: { base: 0.25, pulse: 0.45, shadow: 10 },
    high: { base: 0.4, pulse: 0.7, shadow: 20 },
  }

  const c = colorMap[color] || colorMap.gold
  const i = intensityMap[intensity]

  return (
    <motion.div
      className={`relative rounded-lg ${className}`}
      animate={{
        boxShadow: [
          `0 0 ${i.shadow}px ${c.shadow.replace('VAR', String(i.base))}, inset 0 0 ${i.shadow / 2}px ${c.shadow.replace('VAR', String(i.base / 2))}`,
          `0 0 ${i.shadow * 2}px ${c.shadow.replace('VAR', String(i.pulse))}, inset 0 0 ${i.shadow}px ${c.shadow.replace('VAR', String(i.pulse / 2))}`,
          `0 0 ${i.shadow}px ${c.shadow.replace('VAR', String(i.base))}, inset 0 0 ${i.shadow / 2}px ${c.shadow.replace('VAR', String(i.base / 2))}`,
        ],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}
