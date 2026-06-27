'use client'

import { useState, useRef } from 'react'
import { SPEAKING_DATA } from '../../lib/assessment-data'
import ProgressBar from './ProgressBar'

export default function SpeakingModule({ onComplete }) {
  const [step, setStep] = useState(0) // 0=read aloud, 1=spontaneous, 2=shadowing
  const [recordings, setRecordings] = useState([])
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  const parts = [
    SPEAKING_DATA.part_a_read_aloud,
    SPEAKING_DATA.part_b_spontaneous,
    SPEAKING_DATA.part_c_shadowing,
  ]
  const currentPart = parts[step]
  const totalSteps = parts.length

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const newRecordings = [...recordings, { part: step, blob, duration: recordingTime }]
        setRecordings(newRecordings)
        stream.getTracks().forEach(t => t.stop())

        // Auto-advance to next part or complete
        if (step + 1 < totalSteps) {
          setStep(step + 1)
        } else {
          onComplete(newRecordings)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1)
      }, 1000)
    } catch (err) {
      // Microphone not available — skip speaking module
      alert('لم نتمكن من الوصول للميكروفون. سيتم تخطي هذا الجزء.')
      onComplete([])
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      clearInterval(timerRef.current)
    }
  }

  const skipPart = () => {
    if (step + 1 < totalSteps) {
      setStep(step + 1)
    } else {
      onComplete(recordings)
    }
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="max-w-2xl mx-auto">
      <ProgressBar current={step} total={totalSteps} label="التحدث" />

      <div className="bg-midnight-navy/80 border border-steel/20 rounded-xl p-6 mb-6">
        <h3 className="text-xl text-imperial-gold font-bold mb-2">{currentPart.title}</h3>
        <p className="text-parchment font-arabic mb-1">{currentPart.title_ar}</p>
        <p className="text-steel text-sm mt-4 font-arabic">{currentPart.instructions_ar}</p>
      </div>

      {/* Content to read/respond to */}
      <div className="bg-sovereign-black border border-imperial-gold/20 rounded-xl p-6 mb-6" dir="ltr">
        {step === 0 && (
          <p className="text-parchment text-lg leading-relaxed font-body">{currentPart.passage}</p>
        )}
        {step === 1 && (
          <div>
            <p className="text-parchment text-lg font-body mb-3">{currentPart.prompt}</p>
            <p className="text-steel text-base font-arabic" dir="rtl">{currentPart.prompt_ar}</p>
          </div>
        )}
        {step === 2 && (
          <div>
            <p className="text-parchment text-lg font-body italic">&ldquo;{currentPart.text_to_repeat}&rdquo;</p>
            <p className="text-steel text-sm mt-2">Listen, then repeat this sentence.</p>
          </div>
        )}
      </div>

      {/* Recording controls */}
      <div className="flex flex-col items-center gap-4">
        {isRecording ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
              <span className="text-2xl font-bold text-parchment font-mono">{formatTime(recordingTime)}</span>
            </div>
            <button
              onClick={stopRecording}
              className="px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors text-lg"
            >
              ⏹ إيقاف التسجيل
            </button>
          </>
        ) : (
          <>
            <button
              onClick={startRecording}
              className="px-8 py-4 bg-imperial-gold text-sovereign-black font-bold rounded-lg hover:bg-imperial-gold/90 transition-colors text-lg"
            >
              🎙️ ابدأ التسجيل
            </button>
            <button
              onClick={skipPart}
              className="text-steel text-sm hover:text-parchment transition-colors"
            >
              تخطي هذا الجزء ←
            </button>
          </>
        )}
      </div>

      {/* Duration hint */}
      <p className="text-center text-steel text-xs mt-4 font-arabic">
        المدة المقترحة: {currentPart.duration_seconds} ثانية
      </p>
    </div>
  )
}
