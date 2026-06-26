import './globals.css'

export const metadata = {
  title: 'Empire English — Daily Duty',
  description: 'Your daily English learning tasks',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-sovereign-black text-parchment antialiased">
        {children}
      </body>
    </html>
  )
}
