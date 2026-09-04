/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        mihrab: { DEFAULT: "#183A37", deep: "#0F2522", soft: "#264E49" },
        zellige: { DEFAULT: "#1C7A5F", deep: "#14604B" },
        gilt: { DEFAULT: "#B38A5E", soft: "#FFECD1", pale: "#FFF7E8" },
        porcelain: "#F4F6F1",
        ink: { DEFAULT: "#04151F", soft: "#44584E" },
        plum: { DEFAULT: "#5C0029", soft: "#7A0E3A" },
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
