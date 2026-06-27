/**
 * Empire English — Certificate & Rank Card Generator
 * Generates shareable images using HTML Canvas.
 */

const RANK_CONFIG = {
  L0: { name: 'Recruit', emoji: '🗡️', color: '#8b7355', bg: '#1a1510' },
  L1: { name: 'Initiate', emoji: '⚔️', color: '#cd7f32', bg: '#1a1208' },
  L2: { name: 'Warrior', emoji: '🛡️', color: '#D4AF37', bg: '#1a1808' },
  L3: { name: 'Champion', emoji: '👑', color: '#ff6b35', bg: '#1a0f08' },
}

/**
 * Generate a shareable rank card (Instagram story format: 1080x1920)
 * Returns a data URL (image/png)
 */
export function generateRankCard(studentName, level, scores) {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920
  const ctx = canvas.getContext('2d')
  const rank = RANK_CONFIG[level] || RANK_CONFIG.L0

  // Background
  ctx.fillStyle = '#0A0A0F'
  ctx.fillRect(0, 0, 1080, 1920)

  // Radial glow
  const gradient = ctx.createRadialGradient(540, 700, 0, 540, 700, 600)
  gradient.addColorStop(0, `${rank.color}15`)
  gradient.addColorStop(1, 'transparent')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1080, 1920)

  // Top border accent
  ctx.fillStyle = rank.color
  ctx.fillRect(0, 0, 1080, 4)

  // Brand header
  ctx.fillStyle = '#8b7355'
  ctx.font = '600 24px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('EMPIRE ENGLISH COMMUNITY', 540, 120)

  ctx.fillStyle = '#5a4a3a'
  ctx.font = '16px "Inter", sans-serif'
  ctx.fillText('Sponsored by MACAL Empire', 540, 155)

  // Divider
  ctx.strokeStyle = `${rank.color}40`
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(340, 200)
  ctx.lineTo(740, 200)
  ctx.stroke()

  // Title
  ctx.fillStyle = rank.color
  ctx.font = '700 48px "Inter", sans-serif'
  ctx.fillText('PLACEMENT RESULTS', 540, 310)

  ctx.fillStyle = '#8b7355'
  ctx.font = 'italic 28px "Inter", sans-serif'
  ctx.fillText('The Four Trials — Complete', 540, 360)

  // Rank badge area
  ctx.fillStyle = `${rank.color}10`
  ctx.beginPath()
  ctx.arc(540, 560, 120, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = `${rank.color}60`
  ctx.lineWidth = 3
  ctx.stroke()

  // Rank emoji (as text)
  ctx.font = '100px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(rank.emoji, 540, 595)

  // Rank name
  ctx.fillStyle = rank.color
  ctx.font = '700 64px "Inter", sans-serif'
  ctx.fillText(rank.name.toUpperCase(), 540, 760)

  // Level label
  ctx.fillStyle = '#8b7355'
  ctx.font = '28px "Inter", sans-serif'
  ctx.fillText(`Imperial Level: ${level}`, 540, 810)

  // Student name
  ctx.fillStyle = '#F5F0E8'
  ctx.font = '600 36px "Inter", sans-serif'
  ctx.fillText(studentName || 'Student', 540, 920)

  // Divider
  ctx.strokeStyle = `${rank.color}30`
  ctx.beginPath()
  ctx.moveTo(240, 980)
  ctx.lineTo(840, 980)
  ctx.stroke()

  // Scores
  const scoreItems = [
    { label: 'Listening', score: scores.listening },
    { label: 'Vocabulary', score: scores.vocabulary },
    { label: 'Grammar', score: scores.grammar },
    { label: 'Speaking', score: scores.speaking },
  ]

  scoreItems.forEach((item, i) => {
    const y = 1060 + i * 100

    // Label
    ctx.fillStyle = '#8b7355'
    ctx.font = '24px "Inter", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(item.label, 240, y)

    // Score
    ctx.fillStyle = item.score >= 70 ? '#D4AF37' : item.score >= 40 ? '#cd7f32' : '#8b7355'
    ctx.font = '700 32px "Inter", sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`${item.score}%`, 840, y)

    // Bar background
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(240, y + 15, 600, 8)

    // Bar fill
    ctx.fillStyle = item.score >= 70 ? '#D4AF37' : item.score >= 40 ? '#cd7f32' : '#8b7355'
    ctx.fillRect(240, y + 15, (item.score / 100) * 600, 8)
  })

  // Bottom section
  ctx.textAlign = 'center'

  // Date
  ctx.fillStyle = '#5a4a3a'
  ctx.font = '20px "Inter", sans-serif'
  ctx.fillText(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), 540, 1580)

  // Tagline
  ctx.fillStyle = '#8b7355'
  ctx.font = 'italic 22px "Inter", sans-serif'
  ctx.fillText('Forged in Language. Crowned in Mastery.', 540, 1680)

  // Copyright
  ctx.fillStyle = '#5a4a3a'
  ctx.font = '16px "Inter", sans-serif'
  ctx.fillText(`© ${new Date().getFullYear()} MACAL EMPIRE. All rights reserved.`, 540, 1750)

  // Bottom accent
  ctx.fillStyle = rank.color
  ctx.fillRect(0, 1916, 1080, 4)

  return canvas.toDataURL('image/png')
}

/**
 * Generate a compact certificate (landscape: 1200x800)
 * Returns a data URL (image/png)
 */
export function generateCertificate(studentName, level, scores, date) {
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 800
  const ctx = canvas.getContext('2d')
  const rank = RANK_CONFIG[level] || RANK_CONFIG.L0

  // Background
  ctx.fillStyle = '#0A0A0F'
  ctx.fillRect(0, 0, 1200, 800)

  // Border
  ctx.strokeStyle = `${rank.color}40`
  ctx.lineWidth = 2
  ctx.strokeRect(30, 30, 1140, 740)

  // Inner border
  ctx.strokeStyle = `${rank.color}20`
  ctx.lineWidth = 1
  ctx.strokeRect(40, 40, 1120, 720)

  // Corner decorations
  const corners = [[50, 50], [1140, 50], [50, 740], [1140, 740]]
  corners.forEach(([x, y]) => {
    ctx.fillStyle = rank.color
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fill()
  })

  // Header
  ctx.textAlign = 'center'
  ctx.fillStyle = rank.color
  ctx.font = '700 18px "Inter", sans-serif'
  ctx.fillText('EMPIRE ENGLISH COMMUNITY', 600, 100)

  ctx.fillStyle = '#8b7355'
  ctx.font = 'italic 14px "Inter", sans-serif'
  ctx.fillText('Placement Assessment Certificate', 600, 130)

  // Main title
  ctx.fillStyle = '#F5F0E8'
  ctx.font = '700 32px "Inter", sans-serif'
  ctx.fillText('IMPERIAL PLACEMENT CERTIFICATE', 600, 200)

  // Divider
  ctx.strokeStyle = `${rank.color}40`
  ctx.beginPath()
  ctx.moveTo(350, 230)
  ctx.lineTo(850, 230)
  ctx.stroke()

  // "This certifies that"
  ctx.fillStyle = '#8b7355'
  ctx.font = 'italic 18px "Inter", sans-serif'
  ctx.fillText('This certifies that', 600, 280)

  // Student name
  ctx.fillStyle = '#F5F0E8'
  ctx.font = '700 40px "Inter", sans-serif'
  ctx.fillText(studentName || 'Student', 600, 330)

  // "has achieved the rank of"
  ctx.fillStyle = '#8b7355'
  ctx.font = 'italic 18px "Inter", sans-serif'
  ctx.fillText('has achieved the Imperial Rank of', 600, 380)

  // Rank
  ctx.fillStyle = rank.color
  ctx.font = '700 52px "Inter", sans-serif'
  ctx.fillText(`${rank.emoji} ${rank.name.toUpperCase()}`, 600, 450)

  ctx.fillStyle = '#8b7355'
  ctx.font = '18px "Inter", sans-serif'
  ctx.fillText(`Level ${level} — ${rank.name} Path`, 600, 490)

  // Scores row
  const avgScore = Math.round((scores.listening + scores.vocabulary + scores.grammar + scores.speaking) / 4)
  ctx.fillStyle = '#F5F0E8'
  ctx.font = '16px "Inter", sans-serif'
  ctx.fillText(`Listening: ${scores.listening}%  |  Vocabulary: ${scores.vocabulary}%  |  Grammar: ${scores.grammar}%  |  Speaking: ${scores.speaking}%`, 600, 560)

  ctx.fillStyle = rank.color
  ctx.font = '700 20px "Inter", sans-serif'
  ctx.fillText(`Overall: ${avgScore}%`, 600, 595)

  // Date
  ctx.fillStyle = '#5a4a3a'
  ctx.font = '14px "Inter", sans-serif'
  ctx.fillText(`Issued: ${date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, 600, 660)

  // Footer
  ctx.fillStyle = '#5a4a3a'
  ctx.font = '12px "Inter", sans-serif'
  ctx.fillText('Forged in Language. Crowned in Mastery.  |  Sponsored by MACAL Empire', 600, 720)
  ctx.fillText(`© ${new Date().getFullYear()} MACAL EMPIRE. All rights reserved.`, 600, 745)

  return canvas.toDataURL('image/png')
}

/**
 * Download a data URL as a file
 */
export function downloadImage(dataUrl, filename) {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

/**
 * Share image using Web Share API (mobile) or fallback to download
 */
export async function shareImage(dataUrl, title, text) {
  // Convert data URL to blob for sharing
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  const file = new File([blob], 'empire-rank-card.png', { type: 'image/png' })

  if (navigator.share && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ title, text, files: [file] })
      return true
    } catch {
      // User cancelled or error — fall through to download
    }
  }

  // Fallback: download
  downloadImage(dataUrl, 'empire-rank-card.png')
  return false
}
