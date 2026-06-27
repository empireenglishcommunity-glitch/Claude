'use client'

import { motion } from 'framer-motion'

export default function MetallicCard({ children, className = '', hover = true, glowOnHover = true }) {
  return (
    <motion.div
      className={`relative overflow-hidden rounded-lg border border-[rgba(212,175,55,0.2)] bg-gradient-to-br from-[#111118] to-[#1a1a2e] ${className}`}
      whileHover={hover ? {
        borderColor: 'rgba(212, 175, 55, 0.4)',
        boxShadow: glowOnHover ? '0 4px 30px rgba(0,0,0,0.6), 0 0 15px rgba(212,175,55,0.1)' : undefined,
        y: -2,
      } : undefined}
      transition={{ duration: 0.3 }}
    >
      {/* Metallic sheen overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[rgba(212,175,55,0.05)] via-transparent to-transparent" />
      {/* Top edge highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(212,175,55,0.3)] to-transparent" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}
