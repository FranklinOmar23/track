/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0f172a',
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: '#f1f5f9',
          foreground: '#64748b',
        },
        teal: {
          50: '#f0fdfa',
          600: '#0d9488',
        },
        cyan: {
          50: '#ecfeff',
          600: '#0891b2',
        },
        amber: {
          50: '#fffbeb',
          600: '#d97706',
        },
        rose: {
          500: '#f43f5e',
        },
      },
    },
  },
  plugins: [],
}