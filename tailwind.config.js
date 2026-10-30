/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef2f8',
          100: '#d5deec',
          200: '#aabbd9',
          300: '#7993c2',
          400: '#4d6ea8',
          500: '#2f4f8a',
          600: '#1f3d70',
          700: '#15305a',
          800: '#0e2446',
          900: '#0a1a35',
        },
        saffron: {
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#e07b12',
          600: '#c2650a',
          700: '#9a4f08',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '2px',
        md: '4px',
        lg: '6px',
      },
    },
  },
  plugins: [],
};
