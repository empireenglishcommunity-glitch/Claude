'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { LogIn, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'البريد أو كلمة المرور غير صحيحة'
        : error.message)
    } else {
      window.location.href = '/'
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen empire-bg flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo-sm.png" alt="Empire English" className="w-16 h-16 mx-auto mb-4 object-contain" />
          <h1 className="font-heading text-2xl text-imperial-gold font-bold mb-2">Empire English</h1>
          <p className="font-arabic text-steel">ادخل إلى إمبراطوريتك</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block font-arabic text-sm text-steel mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-midnight-navy border border-steel/20 rounded-lg text-parchment focus:border-imperial-gold/50 focus:outline-none"
              placeholder="you@example.com"
              dir="ltr"
              required
            />
          </div>
          <div>
            <label className="block font-arabic text-sm text-steel mb-1">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-midnight-navy border border-steel/20 rounded-lg text-parchment focus:border-imperial-gold/50 focus:outline-none"
              placeholder="••••••••"
              dir="ltr"
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm font-arabic text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-imperial-gold to-bronze text-sovereign-black font-bold text-lg rounded-lg hover:shadow-gold-md transition-all disabled:opacity-50"
          >
            {loading ? '...' : <span className="font-arabic flex items-center justify-center gap-2"><LogIn className="w-5 h-5" /> تسجيل الدخول</span>}
          </button>
        </form>

        <p className="text-center mt-6 text-steel text-sm font-arabic">
          ليس لديك حساب؟{' '}
          <a href="/signup" className="text-imperial-gold hover:underline">إنشاء حساب</a>
        </p>

        <a href="/" className="flex items-center justify-center gap-1 mt-4 text-steel text-xs hover:text-muted-gold transition-colors">
          <ArrowLeft className="w-3 h-3" />
          <span>Back to assessment</span>
        </a>
      </motion.div>
    </div>
  )
}
