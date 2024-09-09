/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      boxShadow: {
        'custom-light': '0 4px 6px rgba(255, 204, 1, 0.5)', // Light yellow shadow
        'custom-dark': '0 4px 6px rgba(0, 0, 0, 0.7)',    // Darker shadow
        'custom-blue': '0 4px 6px rgba(0, 0, 255, 0.5)',   // Blue shadow
      },
      fontFamily: {
        sans: ["var(--font-alpino)", "sans-serif"],
      },
      keyframes: {
        "slide-left": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-100%)" },
        },
      },
      animation: {
        "slide-left": "slide-left 3s linear infinite",
        "spin-slow": "spin 6s linear infinite",
      },
    },
  },
};
