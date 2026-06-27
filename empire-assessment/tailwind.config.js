module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Primary Empire palette
        'imperial-gold': '#D4AF37',
        'sovereign-black': '#0A0A0F',
        'midnight-navy': '#0D1117',
        'parchment': '#F5F0E8',
        'steel': '#8B919A',
        // Extended palette from Z.ai
        'deep-charcoal': '#1a1a2e',
        'dark-metal': '#16213e',
        'bronze': '#cd7f32',
        'fire-glow': '#ff6b35',
        'ember': '#e74c3c',
        'muted-gold': '#8b7355',
        'dark-bronze': '#8b6914',
        'emerald': '#1B5E20',
        'imperial-purple': '#4a0e4e',
        'midnight-blue': '#0c0c24',
      },
      fontFamily: {
        'heading': ['Cinzel', 'serif'],
        'body': ['Inter', 'sans-serif'],
        'arabic': ['Cairo', 'sans-serif'],
      },
      animation: {
        'float': 'float 20s linear infinite',
        'shimmer': 'shimmer 4s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'border-glow': 'border-glow 3s ease-in-out infinite',
        'scale-in': 'scale-in 0.5s ease-out forwards',
        'slide-up': 'slide-up 0.6s ease-out forwards',
      },
      boxShadow: {
        'gold-sm': '0 0 5px rgba(212, 175, 55, 0.2)',
        'gold-md': '0 0 15px rgba(212, 175, 55, 0.3)',
        'gold-lg': '0 0 30px rgba(212, 175, 55, 0.4)',
        'gold-xl': '0 0 50px rgba(212, 175, 55, 0.5)',
        'fire-sm': '0 0 5px rgba(255, 107, 53, 0.2)',
        'fire-md': '0 0 15px rgba(255, 107, 53, 0.3)',
        'bronze-sm': '0 0 5px rgba(205, 127, 50, 0.2)',
        'bronze-md': '0 0 15px rgba(205, 127, 50, 0.3)',
      },
      backgroundImage: {
        'empire-gradient': 'linear-gradient(180deg, #0A0A0F 0%, #0D1117 50%, #0A0A0F 100%)',
        'gold-gradient': 'linear-gradient(135deg, #D4AF37, #cd7f32)',
        'metallic-gradient': 'linear-gradient(to br, #111118, #1a1a2e)',
      },
    },
  },
  plugins: [],
}
