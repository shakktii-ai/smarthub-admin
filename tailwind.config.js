// module.exports = {
//   content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
//   theme: { extend: { colors: { navy: { DEFAULT: '#0F2440', 700: '#16365c', 800: '#0B1B33' }, teal: { DEFAULT: '#1B8AA6' }, saffron: '#FF9F1C', brand: '#2F6FED' } } },
//   plugins: [],
// };

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./src/**/*.{js,jsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Plus Jakarta Sans",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        navy: {
          DEFAULT: "#0F2440",
          700: "#16365c",
          800: "#0B1B33",
        },
        teal: {
          DEFAULT: "#1B8AA6",
        },
        saffron: "#FF9F1C",
        brand: "#2F6FED",

        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        hero: "var(--hero)",
        "primary-glow": "var(--primary-glow)",
        success: "var(--success)",
      },
      borderRadius: {
        sm: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "calc(var(--radius) + 12px)",
        "4xl": "calc(var(--radius) + 16px)",
      },
    },
  },
  plugins: [],
};
