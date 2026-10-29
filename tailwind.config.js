/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Obsidian base with a blue undertone so glass surfaces read as cool, not muddy.
        ink: {
          950: '#04040a',
          900: '#07070f',
          850: '#0a0a15',
          800: '#0e0e1b',
          750: '#131322',
          700: '#1a1a2d',
          600: '#252540',
          500: '#383856',
        },
        slate: {
          text: '#f1f2fa',
          muted: '#a6abc9',
          faint: '#787d9f',
        },
        accent: {
          DEFAULT: '#7b6bff',
          soft: '#b7adff',
          deep: '#5a41f5',
          dim: 'rgba(123, 107, 255, 0.14)',
          glow: 'rgba(123, 107, 255, 0.45)',
        },
        aqua: {
          DEFAULT: '#3fdcff',
          soft: '#8fe9ff',
        },
        lime: {
          DEFAULT: '#c6f24e',
          soft: '#e0ffa1',
        },
        warm: {
          DEFAULT: '#ffb184',
        },
        ok: '#4ade9b',
        warn: '#ffc663',
        danger: '#ff7a90',
      },
      fontFamily: {
        sans: [
          'InterVar',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        display: [
          'InterVar',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'Segoe UI',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        '3xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        xl2: '1.125rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        panel:
          '0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 40px -28px rgba(0,0,0,0.95)',
        lift: '0 30px 70px -32px rgba(0,0,0,0.98), 0 0 0 1px rgba(255,255,255,0.04)',
        glow: '0 18px 50px -22px rgba(123,107,255,0.55)',
        'glow-sm': '0 10px 30px -14px rgba(123,107,255,0.5)',
        'glow-aqua': '0 18px 50px -22px rgba(63,220,255,0.45)',
        focus: '0 0 0 3px rgba(123,107,255,0.35)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
        snap: 'cubic-bezier(0.22, 1.4, 0.4, 1)',
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(112deg, #7b6bff 0%, #3fdcff 100%)',
        'accent-gradient-soft': 'linear-gradient(112deg, rgba(123,107,255,0.22) 0%, rgba(63,220,255,0.16) 100%)',
        'glass-sheen':
          'linear-gradient(160deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.012) 42%, rgba(255,255,255,0) 100%)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'scale(0.965)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(14px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        aurora: {
          '0%, 100%': { transform: 'translate3d(-3%, -2%, 0) scale(1)' },
          '33%': { transform: 'translate3d(4%, 3%, 0) scale(1.08)' },
          '66%': { transform: 'translate3d(-2%, 5%, 0) scale(0.96)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-7px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.45' },
          '50%': { opacity: '0.9' },
        },
        wave: {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%': { transform: 'scaleY(1)' },
        },
        sheen: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(220%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 460ms cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fade-in 300ms ease-out both',
        'pop-in': 'pop-in 240ms cubic-bezier(0.22,1.4,0.4,1) both',
        'slide-in-right': 'slide-in-right 320ms cubic-bezier(0.22,1,0.36,1) both',
        aurora: 'aurora 28s ease-in-out infinite',
        float: 'float 7s ease-in-out infinite',
        wave: 'wave 1.2s ease-in-out infinite',
        'gradient-pan': 'gradient-pan 9s ease-in-out infinite',
        glow: 'glow-pulse 4s ease-in-out infinite',
        sheen: 'sheen 1.4s ease',
      },
    },
  },
  plugins: [],
};
