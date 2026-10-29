/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#08080b',
          900: '#0c0c11',
          850: '#101017',
          800: '#14141c',
          750: '#191922',
          700: '#20202b',
          600: '#2b2b38',
          500: '#3a3a4a',
        },
        slate: {
          text: '#e8e8ef',
          muted: '#a3a3b8',
          faint: '#7c7c92',
        },
        accent: {
          DEFAULT: '#a78bfa',
          soft: '#c4b5fd',
          deep: '#7c5cf5',
          dim: 'rgba(167, 139, 250, 0.12)',
        },
        warm: {
          DEFAULT: '#f5b682',
        },
        ok: '#6ee7b7',
        warn: '#fbbf24',
        danger: '#f87171',
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
      },
      borderRadius: {
        xl2: '1.125rem',
      },
      boxShadow: {
        panel: '0 1px 0 rgba(255,255,255,0.03) inset, 0 18px 40px -24px rgba(0,0,0,0.9)',
        lift: '0 24px 60px -30px rgba(0,0,0,0.95)',
        focus: '0 0 0 3px rgba(167,139,250,0.35)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        wave: {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 220ms ease-out both',
        wave: 'wave 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
