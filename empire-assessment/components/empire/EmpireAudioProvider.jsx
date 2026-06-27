'use client'

import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'

const EmpireAudioContext = createContext(null)

export function useEmpireAudio() {
  const ctx = useContext(EmpireAudioContext)
  if (!ctx) throw new Error('useEmpireAudio must be used within EmpireAudioProvider')
  return ctx
}

/**
 * EmpireAudioProvider — Intelligent background music management.
 * 
 * Behavior:
 * - Shows activation overlay on first visit (browser autoplay policy)
 * - Plays music during intro/hub and results pages
 * - Automatically fades OUT when a trial begins (no distraction)
 * - Automatically fades IN when returning to hub or reaching results
 * - All transitions are smooth (no abrupt cuts)
 * - No manual controls needed — fully automatic
 */
export default function EmpireAudioProvider({ children }) {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(0)
  const [isActivated, setIsActivated] = useState(false)
  const [showOverlay, setShowOverlay] = useState(true)
  const fadeIntervalRef = useRef(null)
  const targetVolumeRef = useRef(0.12) // Default comfortable volume

  // Initialize audio element once
  useEffect(() => {
    const audio = new Audio('/empire-soundtrack.mp3')
    audio.loop = true
    audio.volume = 0
    audio.preload = 'auto'
    audioRef.current = audio

    return () => {
      audio.pause()
      audio.src = ''
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current)
    }
  }, [])

  // Smooth fade to a target volume
  const fadeTo = useCallback((targetVol, duration = 2000) => {
    const audio = audioRef.current
    if (!audio) return

    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current)

    const steps = 30
    const stepTime = duration / steps
    const currentVol = audio.volume
    const diff = targetVol - currentVol
    const volStep = diff / steps
    let step = 0

    fadeIntervalRef.current = setInterval(() => {
      step++
      const newVol = currentVol + volStep * step

      if (step >= steps) {
        audio.volume = targetVol
        setVolumeState(targetVol)
        if (targetVol === 0) {
          audio.pause()
          setIsPlaying(false)
        }
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current)
        return
      }

      audio.volume = Math.max(0, Math.min(1, newVol))
      setVolumeState(Math.max(0, Math.min(1, newVol)))
    }, stepTime)
  }, [])

  // Activate audio (called from overlay — required by browser autoplay policy)
  const activate = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return

    try {
      audio.volume = 0
      await audio.play()
      setIsPlaying(true)
      setIsActivated(true)
      setShowOverlay(false)
      // Smooth fade in
      fadeTo(targetVolumeRef.current, 2500)
    } catch (err) {
      console.warn('Audio activation failed:', err)
      setShowOverlay(false)
      setIsActivated(true)
    }
  }, [fadeTo])

  // Skip activation (enter silently — no music at all)
  const skipActivation = useCallback(() => {
    setShowOverlay(false)
    setIsActivated(true)
    // Mark as "user chose no music"
    targetVolumeRef.current = 0
  }, [])

  // Fade out music (called when trial begins)
  const fadeOut = useCallback((duration = 1500) => {
    if (!isActivated || targetVolumeRef.current === 0) return
    fadeTo(0, duration)
  }, [isActivated, fadeTo])

  // Fade in music (called when returning to hub or reaching results)
  const fadeIn = useCallback((duration = 2000) => {
    const audio = audioRef.current
    if (!audio || !isActivated || targetVolumeRef.current === 0) return

    // Resume playback if paused
    if (audio.paused) {
      audio.volume = 0
      audio.play().then(() => {
        setIsPlaying(true)
        fadeTo(targetVolumeRef.current, duration)
      }).catch(() => {})
    } else {
      fadeTo(targetVolumeRef.current, duration)
    }
  }, [isActivated, fadeTo])

  return (
    <EmpireAudioContext.Provider
      value={{
        isPlaying,
        volume,
        isActivated,
        showOverlay,
        activate,
        skipActivation,
        fadeOut,
        fadeIn,
      }}
    >
      {children}
    </EmpireAudioContext.Provider>
  )
}
