import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          primary: "var(--canvas-primary)",
          secondary: "var(--canvas-secondary)",
          surface: "var(--canvas-surface)",
        },
        charcoal: {
          900: "var(--text-primary)",
          700: "var(--text-secondary)",
          500: "var(--text-muted)",
          300: "var(--text-subtle)",
        },
        bronze: {
          light: "var(--accent-bronze-light)",
          DEFAULT: "var(--accent-bronze)",
          dark: "var(--accent-bronze-dark)",
        },
        border: {
          subtle: "var(--border-subtle)",
          DEFAULT: "var(--border-default)",
          strong: "var(--border-strong)",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Playfair Display", "Cinzel", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      boxShadow: {
        editorial: "0 4px 20px -2px rgba(26, 25, 24, 0.05)",
        "editorial-lg": "0 10px 30px -4px rgba(26, 25, 24, 0.08)",
      },
      letterSpacing: {
        luxury: "0.2em",
        subtle: "0.05em",
      },
    },
  },
  plugins: [],
};

export default config;
