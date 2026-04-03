/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0f7ee', 100: '#d8eccc', 200: '#b4d99a', 300: '#8ac165',
          400: '#639922', 500: '#3b6d11', 600: '#27500a', 700: '#173404',
          800: '#0e2202', 900: '#071101',
        },
        gold: {
          100: '#faeeda', 200: '#fac775', 300: '#ef9f27',
          400: '#ba7517', 500: '#854f0b', 600: '#633806', 700: '#412402',
        },
        sage: {
          100: '#eaf3de', 200: '#c0dd97', 300: '#97c459',
          400: '#6ea832', 500: '#4d8520', 600: '#346314',
        },
      },
      fontFamily: { serif: ['Georgia', 'serif'] },
    },
  },
  plugins: [],
}
