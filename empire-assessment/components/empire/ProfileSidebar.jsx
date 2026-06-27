'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, X, Camera, LogOut, Award, Clock, Palette } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import ImperialButton from './ImperialButton'

// Common Arabic female names for auto-detection
const FEMALE_INDICATORS = [
  'فاطمة', 'عائشة', 'مريم', 'نور', 'سارة', 'هدى', 'ليلى', 'أمل', 'دانا', 'ريم',
  'لمى', 'هيا', 'منى', 'رنا', 'دلال', 'غادة', 'سلمى', 'ياسمين', 'زينب', 'خديجة',
  'fatima', 'aisha', 'maryam', 'noor', 'sara', 'sarah', 'huda', 'layla', 'amal', 'dana',
  'reem', 'lama', 'haya', 'mona', 'rana', 'dalal', 'ghada', 'salma', 'yasmin', 'zainab',
  'khadija', 'mariam', 'noura', 'hessa', 'latifa', 'amina', 'halima', 'sumaya', 'lubna',
]

export function detectGender(name) {
  if (!name) return 'male'
  const lower = name.toLowerCase().trim()
  const firstName = lower.split(' ')[0]
  
  // Check against known female names
  if (FEMALE_INDICATORS.some(n => firstName === n || firstName.startsWith(n))) {
    return 'female'
  }
  
  // Arabic female name patterns (ends with ة or اء)
  if (firstName.endsWith('ة') || firstName.endsWith('اء') || firstName.endsWith('ى')) {
    return 'female'
  }
  
  // English patterns
  if (firstName.endsWith('a') || firstName.endsWith('ah') || firstName.endsWith('een') || firstName.endsWith('ina')) {
    return 'female'
  }
  
  return 'male'
}

export const THEMES = {
  male: {
    id: 'male',
    name: 'Imperial Gold',
    name_ar: 'الذهب الإمبراطوري',
    accent: '#D4AF37',
    accentLight: '#e8d48b',
    bg: '#0A0A0F',
    card: '#111118',
  },
  female: {
    id: 'female',
    name: 'Rose Empire',
    name_ar: 'إمبراطورية الورد',
    accent: '#E8A0BF',
    accentLight: '#f2c4d8',
    bg: '#0F0A10',
    card: '#16111a',
  },
}

export default function ProfileSidebar({ user, isOpen, onClose, currentTheme, onThemeChange }) {
  const [profilePic, setProfilePic] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [userName, setUserName] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (user) {
      const name = user.user_metadata?.name || user.email?.split('@')[0] || ''
      setUserName(name)
      
      // Load profile picture from user metadata
      const pic = user.user_metadata?.avatar_url || null
      setProfilePic(pic)
    }
  }, [user])

  const handlePictureUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      // Convert to base64 data URL for simplicity (stored in user metadata)
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result

        // Update user metadata with avatar
        const { error } = await supabase.auth.updateUser({
          data: { avatar_url: base64 }
        })

        if (!error) {
          setProfilePic(base64)
        }
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error('Upload failed:', err)
      setUploading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const detectedGender = detectGender(userName)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-80 max-w-[85vw] z-[90] overflow-y-auto"
            style={{ backgroundColor: currentTheme?.card || '#111118' }}
          >
            {/* Header */}
            <div className="p-6 border-b border-[rgba(212,175,55,0.1)]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold font-arabic" style={{ color: currentTheme?.accent || '#D4AF37' }}>
                  ملفي الشخصي
                </h2>
                <button onClick={onClose} className="text-steel hover:text-parchment transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Profile Picture */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div
                    className="w-20 h-20 rounded-full border-2 overflow-hidden flex items-center justify-center"
                    style={{ 
                      borderColor: currentTheme?.accent || '#D4AF37',
                      backgroundColor: `${currentTheme?.accent || '#D4AF37'}10`,
                    }}
                  >
                    {profilePic ? (
                      <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8" style={{ color: currentTheme?.accent || '#D4AF37' }} />
                    )}
                  </div>
                  {/* Upload button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110"
                    style={{ 
                      backgroundColor: currentTheme?.accent || '#D4AF37',
                      borderColor: currentTheme?.card || '#111118',
                    }}
                  >
                    <Camera className="w-3.5 h-3.5 text-sovereign-black" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePictureUpload}
                    className="hidden"
                  />
                </div>

                {uploading && (
                  <p className="text-xs" style={{ color: currentTheme?.accent }}>جاري الرفع...</p>
                )}

                <div className="text-center">
                  <p className="text-parchment font-bold font-arabic">{userName || 'Student'}</p>
                  <p className="text-steel text-xs">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Theme Selection */}
            <div className="p-6 border-b border-[rgba(212,175,55,0.1)]">
              <div className="flex items-center gap-2 mb-4">
                <Palette className="w-4 h-4" style={{ color: currentTheme?.accent }} />
                <h3 className="text-sm font-bold text-parchment font-arabic">المظهر</h3>
                <span className="text-xs text-steel ml-auto">
                  Auto: {detectedGender === 'female' ? '♀' : '♂'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {Object.values(THEMES).map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => onThemeChange(theme.id)}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      currentTheme?.id === theme.id 
                        ? 'border-opacity-100' 
                        : 'border-opacity-30 hover:border-opacity-60'
                    }`}
                    style={{ 
                      borderColor: theme.accent,
                      backgroundColor: theme.card,
                      opacity: currentTheme?.id === theme.id ? 1 : 0.7,
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-full mx-auto mb-2"
                      style={{ backgroundColor: theme.accent }}
                    />
                    <p className="text-xs text-parchment font-arabic">{theme.name_ar}</p>
                    <p className="text-[10px] text-steel">{theme.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="p-6 border-b border-[rgba(212,175,55,0.1)]">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-4 h-4" style={{ color: currentTheme?.accent }} />
                <h3 className="text-sm font-bold text-parchment font-arabic">إحصائياتي</h3>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-steel font-arabic">الرتبة الحالية</span>
                  <span className="text-xs font-bold" style={{ color: currentTheme?.accent }}>—</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-steel font-arabic">التجارب المكتملة</span>
                  <span className="text-xs font-bold text-parchment">0 / 4</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-steel font-arabic">تاريخ التسجيل</span>
                  <span className="text-xs text-steel">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('ar-EG') : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-arabic">تسجيل الخروج</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
