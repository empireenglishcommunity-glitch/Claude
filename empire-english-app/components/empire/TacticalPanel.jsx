'use client'

export default function TacticalPanel({ children, accentSide = 'left', accentColor = '#D4AF37', className = '' }) {
  return (
    <div
      className={`relative bg-gradient-to-br from-[#111118] to-[#1a1a2e] border border-[rgba(212,175,55,0.15)] rounded-lg p-5 ${className}`}
      style={{
        [`border${accentSide === 'left' ? 'Left' : 'Right'}Color`]: accentColor,
        [`border${accentSide === 'left' ? 'Left' : 'Right'}Width`]: '3px',
      }}
    >
      {children}
    </div>
  )
}
