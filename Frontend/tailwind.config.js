/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
 
    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        intent: {
          50: "#f6fff5",
          100: "#e6ffea",
          200: "#c9ffd0",
          300: "#9fffa7",
          400: "#6ff67a",
          500: "#46dc3f", // main green
          600: "#37b025",
          700: "#2b7f19",
          800: "#1e5510",
          900: "#133308",
        },
        accent: {
          50: "#fffdf2",
          100: "#fff8e0",
          200: "#fff1b8",
          300: "#ffe786",
          400: "#ffde4a",
          500: "#ffcf00", // main yellow
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
}
