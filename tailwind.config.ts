import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        uniblex: {
          blue: "#00B2FF",
          purple: "#7A3CFF",
          pink: "#FF4DDB",
          bg: "#0D1118",
          card: "#111827",
          border: "#1F2937",
          white: "#F2F4F8",
          gray: "#9CA3AF"
        }
      },
      fontFamily: {
        heading: ["var(--font-orbitron)", "sans-serif"],
        body: ["var(--font-exo)", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 35px rgba(0,178,255,.22)"
      }
    }
  },
  plugins: []
};
export default config;
