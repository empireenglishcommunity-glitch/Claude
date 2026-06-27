'use client'

import { motion } from 'framer-motion'

export default function ImperialProgress({ value, max = 100, label, sublabel, color = '#D4AF37', size = 'md', showPercentage = true }) {
  const pct = Math.round((value / max) * 100)
  
  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          <div>
            {label && <span className="text-sm text-parchment font-arabic">{label}</span>}
            {sublabel && <span className="text-xs text-steel ml-2">{sublabel}</span>}
          </div>
          {showPercentage && (
            <span className="text-sm font-bold" style={{ color }}>{pct}%</span>
          )}
        </div>
      )}
      <div className={`w-full ${heights[size]} bg-[#0A0A0F] rounded-full overflow-hidden border border-[rgba(212,175,55,0.1)]`}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
