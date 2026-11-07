/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        carbon: "#0B0E14",
        asphalt: "#121824",
        paper: "#F8F9FA",
        crimson: "#E21B4D",
        sun: "#FFD100",
        silver: "#A5B4C4",
        ice: "#004C97",
      },
      borderColor: { hairline: "rgba(255,255,255,.12)" },
      fontFamily: {
        sans: ["var(--font-alpino)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      keyframes: {
        "slide-left": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        fizz: {
          "0%": { transform: "translateY(0) translateX(0)", opacity: "0" },
          "10%": { opacity: "1" },
          "100%": { transform: "translateY(-105vh) translateX(14px)", opacity: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(6px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "snap-in": {
          "0%": { transform: "translateX(-60px) skewX(-8deg)", opacity: "0" },
          "100%": { transform: "none", opacity: "1" },
        },
      },
    },
  },
};
