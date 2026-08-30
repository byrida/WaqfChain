/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        mihrab: { DEFAULT: "#0E3B2E", deep: "#092720", soft: "#155241" },
        zellige: { DEFAULT: "#1C7A5F", deep: "#14604B" },
        gilt: { DEFAULT: "#C9A227", soft: "#E9D48A", pale: "#F7EFD9" },
        porcelain: "#F4F6F1",
        ink: { DEFAULT: "#14231D", soft: "#44584E" },
      },
      fontFamily: {
        display: ['"Reem Kufi"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Instrument Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        ledger: ['"Spline Sans Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        rise: "rise 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};
