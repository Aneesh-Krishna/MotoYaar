import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // MotoYaar Design Tokens
        primary: {
          DEFAULT: "#F97316", // Saffron-orange — CTAs, active nav, FAB
          dark: "#C2571A",    // Burnt orange — body text on white (AA compliant)
          foreground: "#FFFFFF",
        },
        surface: "#FAFAF8",   // App background
        card: "#FFFFFF",      // Card surface
        border: "#E5E7EB",    // Dividers, card borders

        // Semantic status colours (always paired with icon + label)
        status: {
          valid: "#16A34A",
          expiring: "#D97706",
          expired: "#DC2626",
          incomplete: "#6B7280",
        },

        // Text
        foreground: {
          DEFAULT: "#1A1A1A",   // Primary text
          muted: "#6B7280",     // Secondary / metadata
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display": ["1.5rem", { lineHeight: "2rem", fontWeight: "700" }],    // H1 24px
        "title":   ["1.25rem", { lineHeight: "1.75rem", fontWeight: "600" }], // H2 20px
        "heading": ["1rem",    { lineHeight: "1.5rem",  fontWeight: "600" }], // H3 16px
        "body":    ["0.875rem",{ lineHeight: "1.375rem",fontWeight: "400" }], // Body 14px
        "caption": ["0.75rem", { lineHeight: "1.125rem",fontWeight: "400" }], // Caption 12px
      },
      spacing: {
        "screen-x": "1rem",        // 16px horizontal screen padding (mobile)
        "screen-x-md": "1.5rem",   // 24px horizontal screen padding (desktop)
        "nav": "4rem",             // 64px bottom nav height
      },
      borderRadius: {
        card: "12px",
        btn: "8px",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.04)",
        nav:  "0 -1px 0 0 #E5E7EB",
      },
      keyframes: {
        "slide-up": {
          "0%":   { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.25s ease-out",
        "fade-in":  "fade-in 0.2s ease-out",
        shimmer:    "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};

export default config;