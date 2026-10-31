/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f1f5f9',
          100: '#dbe4ef',
          200: '#b8c9dc',
          300: '#8faac5',
          400: '#6688ac',
          500: '#1f4e79',
          600: '#193f67',
          700: '#13315c',
          800: '#0b2545',
          900: '#071a31',
        },
        saffron: {
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#ff9933',
          600: '#d97706',
          700: '#9a5b00',
        },
        status: {
          success: '#1e7b34',
          warning: '#9a5b00',
          danger: '#b42318',
          info: '#1f4e79',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        caption: ['12px', { lineHeight: '1.4', fontWeight: '500' }],
        table: ['13px', { lineHeight: '1.5' }],
        body: ['14px', { lineHeight: '1.5' }],
        'body-lg': ['15px', { lineHeight: '1.5' }],
        title: ['24px', { lineHeight: '1.25', fontWeight: '600' }],
        section: ['16px', { lineHeight: '1.25', fontWeight: '600' }],
      },
      borderRadius: {
        DEFAULT: '2px',
        md: '4px',
        lg: '4px',
        xl: '4px',
        '2xl': '4px',
      },
    },
  },
  plugins: [],
};
