/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: "#f59e0b", // Amber 500
        primaryHover: "#d97706", // Amber 600
        danger: "#ef4444", // Red 500
      }
    },
  },
  plugins: [],
}
