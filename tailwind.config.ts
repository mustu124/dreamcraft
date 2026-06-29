import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        terracotta: "#F07820",
        blush:      "#EDE5FF",
        ivory:      "#FBF6F0",
        gold:       "#F0C020",
        navy:       "#2B3A82",
        purple:     "#5B4FA8",
        cyan:       "#4DD9EC",
      },
      fontFamily: {
        heading: ["var(--font-playfair)", "Georgia", "serif"],
        body: ["var(--font-poppins)", "system-ui", "sans-serif"],
      },
      scale: {
        "108": "1.08",
        "102": "1.02",
      },
      animation: {
        "float":      "float 4s ease-in-out infinite",
        "float-slow": "float-slow 6s ease-in-out infinite",
        "hero-in":    "hero-in 0.9s cubic-bezier(0.22,1,0.36,1) both",
        "sparkle":    "sparkle 2.5s ease-in-out infinite",
        "marquee":    "marquee 28s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":       { transform: "translateY(-14px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%":       { transform: "translateY(-8px) rotate(4deg)" },
        },
        "hero-in": {
          from: { opacity: "0", transform: "translateY(28px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        sparkle: {
          "0%, 100%": { opacity: "0.2", transform: "scale(0.8)" },
          "50%":       { opacity: "1",   transform: "scale(1.2)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to:   { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
