import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      xs: "480px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1400px",
    },
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
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
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      fontFamily: {
        mono: ["var(--font-code)"],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "none",
            color: "var(--tw-prose-body)",
            h1: {
              fontSize: "2.5rem",
              fontWeight: "800",
              marginTop: "2.5rem",
              marginBottom: "1.5rem",
              lineHeight: "1.2",
              borderBottom: "1px solid var(--tw-prose-hr)",
              paddingBottom: "0.5rem",
            },
            h2: {
              fontSize: "2rem",
              fontWeight: "700",
              marginTop: "2rem",
              marginBottom: "1rem",
              lineHeight: "1.3",
              borderBottom: "1px solid var(--tw-prose-hr)",
              paddingBottom: "0.25rem",
            },
            h3: {
              fontSize: "1.5rem",
              fontWeight: "700",
              marginTop: "1.5rem",
              marginBottom: "0.75rem",
              lineHeight: "1.4",
            },
            h4: {
              fontSize: "1.25rem",
              fontWeight: "600",
              marginTop: "1.5rem",
              marginBottom: "0.75rem",
            },
            h5: {
              fontSize: "1.125rem",
              fontWeight: "600",
              marginTop: "1rem",
              marginBottom: "0.5rem",
            },
            h6: {
              fontSize: "1rem",
              fontWeight: "600",
              marginTop: "1rem",
              marginBottom: "0.5rem",
            },
            pre: {
              backgroundColor: "var(--tw-prose-pre-bg)",
              borderRadius: "var(--radius)",
              padding: "1rem",
              overflowX: "auto",
              border: "1px solid var(--tw-prose-pre-border)",
            },
            code: {
              fontFamily: "var(--font-code)",
              fontSize: "0.875rem",
            },
            "code::before": {
              content: '""',
            },
            "code::after": {
              content: '""',
            },
            blockquote: {
              borderLeftWidth: "4px",
              borderLeftColor: "var(--tw-prose-quote-borders)",
              paddingLeft: "1rem",
              fontStyle: "italic",
              color: "var(--tw-prose-quote)",
            },
          },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
}

export default config
