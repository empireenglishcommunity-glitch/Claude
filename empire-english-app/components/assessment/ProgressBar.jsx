'use client'

export default function ProgressBar({ current, total, label }) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="w-full mb-6">
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-steel font-arabic">{label}</span>
          <span className="text-sm text-imperial-gold font-bold">{current}/{total}</span>
        </div>
      )}
      <div className="w-full h-2 bg-midnight-navy rounded-full overflow-hidden">
        <div
          className="h-full bg-imperial-gold rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
