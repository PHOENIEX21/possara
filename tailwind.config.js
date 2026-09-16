/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: "#F7F8FB", dim: "#EEF1F6" },
        ink: { DEFAULT: "#151821", light: "#4F5668", faint: "#7A8192" },
        brand: { DEFAULT: "#7C3AED", dark: "#6D28D9", light: "#EDE4FE" },
        opportunity: { DEFAULT: "#F59E0B", dark: "#92610A", light: "#FEF3C7" },
        trust: { DEFAULT: "#10B981", dark: "#04785C", light: "#D1FAE5" },
        spark: { DEFAULT: "#EC4899", dark: "#A3175A", light: "#FCE7F3" },
        flag: { DEFAULT: "#EF4444", dark: "#DC2626", light: "#FEE2E2" }
      },
      fontFamily: { display: ["Inter", "sans-serif"], body: ["Inter", "sans-serif"] },
      maxWidth: { prose: "38rem" }
    }
  },
  plugins: []
};
