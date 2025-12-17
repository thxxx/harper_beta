/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      backgroundImage: {
        gradblack: "linear-gradient(180deg, #111111 0%, #242424 100%)",
        gradpastel:
          "linear-gradient(90deg, #94B8F0 0%, #F1C4A6 50%, #F2E7AE 100%)",
        gradpastel2:
          "linear-gradient(180deg, #F2E7AE 0%, #F1C4A6 50%, #94B8F0 100%)",
      },
      colors: {
        xgrayblack: "#1F2937", // 기본 색상
        xprimary: "#1D9BF0", // 변형 색상
        xmain: "#000000", // 변형 색상
        xopp: "#FFFFFF", // 변형 색상
        xlightgray: "#F6F6F8",
        xgray300: "#E5E6EC",
        xgray400: "#D1D5DC",
        xgray500: "#9DA3AE",
        xgray600: "#657284",
        xgray700: "#4B5462",
        xdarknavy: "#0B1957",
        brightnavy: "#0624A8",
        beige100: "#FAF9F6",
        beige200: "#F6F0E4",
        accenta1: "#EFFF3F",
        accenta2: "#C0CE2B",
        caption: "#BDC8CD",
      },
      keyframes: {
        upDowns: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-3px)" },
          "40%, 80%": { transform: "translateX(3px)" },
        },
      },
      animation: {
        upDown: "upDowns 2s ease-in-out infinite",
        shake: "shake 0.3s ease-in-out",
      },
      fontFamily: {
        inter: ["var(--font-inter)", "sans-serif"],
        hedvig: ["Hedvig Letters Serif", "inter"],
        garamond: ["var(--font-garamond)", "serif"],
        serif: ["Merriweather", "serif"],
        mono: ["Menlo", "monospace", "sans-serif"],
        poppins: ["Poppins", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
