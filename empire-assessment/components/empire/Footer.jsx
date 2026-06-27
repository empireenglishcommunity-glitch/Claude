'use client'

export default function Footer() {
  return (
    <footer className="border-t border-[rgba(212,175,55,0.1)] bg-[rgba(10,10,15,0.9)] mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <img src="/logo-sm.png" alt="Empire English" className="w-6 h-6 object-contain" />
            <span className="font-heading font-bold text-imperial-gold tracking-wider text-sm">
              EMPIRE ENGLISH
            </span>
          </div>

          {/* Tagline + Sponsor */}
          <div className="text-center">
            <p className="text-muted-gold text-xs italic">
              Forged in Language. Crowned in Mastery.
            </p>
            <p className="text-[10px] text-steel/50 mt-1">
              Empire English Community is sponsored by MACAL Empire
            </p>
          </div>

          {/* Copyright */}
          <div className="text-center md:text-right">
            <p className="text-steel/60 text-[10px]">
              &copy; {new Date().getFullYear()} MACAL EMPIRE. All rights reserved.
            </p>
            <p className="text-[9px] text-steel/40 mt-0.5">
              Protected proprietary content. Unauthorized redistribution prohibited.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
