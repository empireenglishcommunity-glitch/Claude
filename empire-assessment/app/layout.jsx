import './globals.css'

export const metadata = {
  title: 'Empire English — Placement Assessment',
  description: 'The Four Trials: Prove your worth and earn your Imperial Rank in English mastery.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased">{children}</body>
    </html>
  )
}
