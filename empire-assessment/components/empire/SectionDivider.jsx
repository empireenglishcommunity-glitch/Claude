'use client'

export default function SectionDivider({ className = '' }) {
  return (
    <div className={`relative py-4 ${className}`}>
      <div className="flex items-center justify-center gap-4">
        <div className="h-px flex-1 max-w-32 bg-gradient-to-r from-transparent to-[rgba(212,175,55,0.3)]" />
        <div className="w-2 h-2 rotate-45 bg-imperial-gold/40" />
        <div className="h-px flex-1 max-w-32 bg-gradient-to-l from-transparent to-[rgba(212,175,55,0.3)]" />
      </div>
    </div>
  )
}
