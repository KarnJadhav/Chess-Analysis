/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Or your preferred sans-serif font
        heading: ['Montserrat', 'sans-serif'], // Or your preferred heading font
      },
      colors: {
        'brand-dark': '#121212',
        'brand-light-dark': '#1E1E1E',
        'brand-accent': '#D4AF37', // A gold/yellow accent color
        'brand-accent-hover': '#E6C35C',
      },
    },
  },
  plugins: [],
}