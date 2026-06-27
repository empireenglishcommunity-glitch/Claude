'use client'

import { useEffect } from 'react'

/**
 * ProgressGuard — prevents accidental navigation/refresh during assessment.
 * Shows browser's native "Leave site?" confirmation dialog.
 * 
 * Props:
 * - active: boolean — whether to show the warning (true during active trial)
 * - message: string — custom message (browsers may override with default)
 */
export default function ProgressGuard({ active = false, message = 'لديك اختبار قيد التنفيذ. هل أنت متأكد أنك تريد المغادرة؟' }) {
  useEffect(() => {
    if (!active) return

    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = message
      return message
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [active, message])

  return null // This component renders nothing — it just adds the event listener
}
