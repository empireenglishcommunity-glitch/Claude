'use client'

import { motion } from 'framer-motion'

export default function ImperialButton({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '', 
  disabled = false,
  onClick,
  ...props 
}) {
  const variants = {
    primary: 'bg-gradient-to-r from-[#D4AF37] to-[#cd7f32] text-[#0A0A0F] hover:from-[#e0c04c] hover:to-[#d48f42] shadow-[0_0_15px_rgba(212,175,55,0.3)]',
    secondary: 'bg-[#1a1a2e] text-[#D4AF37] border border-[rgba(212,175,55,0.3)] hover:bg-[#222240] hover:border-[rgba(212,175,55,0.5)]',
    outline: 'bg-transparent text-[#D4AF37] border border-[rgba(212,175,55,0.3)] hover:bg-[rgba(212,175,55,0.1)] hover:border-[rgba(212,175,55,0.5)]',
    ghost: 'bg-transparent text-[#D4AF37] hover:bg-[rgba(212,175,55,0.1)]',
    danger: 'bg-gradient-to-r from-[#e74c3c] to-[#c0392b] text-white shadow-[0_0_15px_rgba(231,76,60,0.3)]',
  }

  const sizes = {
    sm: 'px-4 py-1.5 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-8 py-3.5 text-lg',
    xl: 'px-10 py-4 text-xl',
  }

  return (
    <motion.button
      className={`font-bold rounded-md transition-all duration-300 cursor-pointer inline-flex items-center justify-center
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${className}
      `}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  )
}
