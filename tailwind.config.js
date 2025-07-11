/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'monopol': ['Monopol', 'sans-serif'],
        'segoe': ['Segoe UI', '-apple-system', 'BlinkMacSystemFont', 'Roboto', 'sans-serif'],
      },
      colors: {
        'hawaii': {
          primary: '#E60254',
          secondary: '#0EA5E9',
          accent: '#FCD34D',
          muted: '#9CA3AF',
          border: '#404040',
        },
        background: '#181818',
        'card-bg': '#2D2D2D',
        'card-bg-alt': '#1F1F1F',
      },
    },
  },
  plugins: [],
} 