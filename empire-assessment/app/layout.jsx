import './globals.css'

export const metadata = {
  title: 'Empire English — Placement Assessment',
  description: 'The Four Trials: Prove your worth and earn your Imperial Rank in English mastery.',
  icons: { icon: '/logo-sm.png' },
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta name="theme-color" content="#0A0A0F" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  )
}
