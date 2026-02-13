import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Warm earthy palette for explicit use
        warm: {
          50: "#fdf8f3",
          100: "#faf0e4",
          200: "#f3ddc6",
          300: "#e8c49e",
          400: "#d4a373",
          500: "#c4663a",
          600: "#b14a1f",
          700: "#8c3a18",
          800: "#6b2e15",
          900: "#4a2010",
          950: "#3b3230",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: [
          "var(--font-body)",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        heading: ["var(--font-heading)", "Georgia", "serif"],
        handwritten: ["var(--font-handwritten)", "cursive"],
      },
      boxShadow: {
        warm: "0 1px 3px 0 rgba(60, 40, 20, 0.1), 0 1px 2px -1px rgba(60, 40, 20, 0.08)",
        "warm-md":
          "0 4px 6px -1px rgba(60, 40, 20, 0.12), 0 2px 4px -2px rgba(60, 40, 20, 0.08)",
        "warm-lg":
          "0 10px 15px -3px rgba(60, 40, 20, 0.12), 0 4px 6px -4px rgba(60, 40, 20, 0.08)",
        "warm-xl":
          "0 20px 25px -5px rgba(60, 40, 20, 0.14), 0 8px 10px -6px rgba(60, 40, 20, 0.08)",
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out forwards",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "recording-pulse": "recording-pulse 2s ease-in-out infinite",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "recording-pulse": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.15", transform: "scale(1.15)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
