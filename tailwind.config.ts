import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: { ink: "#18231d", cream: "#f6f4ee", leaf: "#1f6b4f", mint: "#dcefe6", sun: "#f4bd55" },
      fontFamily: { sans: ["var(--font-manrope)", "Arial", "sans-serif"], display: ["var(--font-fraunces)", "Georgia", "serif"] },
      boxShadow: { soft: "0 20px 60px rgba(24, 35, 29, 0.10)" }
    }
  },
  plugins: []
};
export default config;
