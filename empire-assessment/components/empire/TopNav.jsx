'use client'

import { User, BarChart3 } from 'lucide-react'

/**
 * TopNav — Persistent navigation bar visible on all pages.
 * Provides access to profile/results from anywhere.
 */
export default function TopNav({ user, onProfileClick }) {
  if (!user) return null

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || ''
  const avatarUrl = user?.user_metadata?.avatar_url || null

  return (
    <div className="fixed top-0 left-0 right-0 z-30 px-4 py-2">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Profile button (left) */}
        <button
          onClick={onProfileClick}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(212,175,55,0.2)] bg-[rgba(10,10,15,0.8)] backdrop-blur-sm hover:border-[rgba(212,175,55,0.4)] transition-all"
        >
          <div className="w-7 h-7 rounded-full border border-imperial-gold/50 overflow-hidden flex items-center justify-center bg-[rgba(212,175,55,0.1)]">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-3.5 h-3.5 text-imperial-gold" />
            )}
          </div>
          <span className="text-xs text-parchment font-arabic hidden sm:inline">{userName}</span>
        </button>

        {/* Results link (right) */}
        <a
          href="/profile"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[rgba(212,175,55,0.2)] bg-[rgba(10,10,15,0.8)] backdrop-blur-sm hover:border-[rgba(212,175,55,0.4)] transition-all"
        >
          <BarChart3 className="w-3.5 h-3.5 text-imperial-gold" />
          <span className="text-xs text-imperial-gold font-arabic">نتائجي</span>
        </a>
      </div>
    </div>
  )
}
