/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Surface Containers
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f5f3f4",
        "surface-container": "#efedee",
        "surface-container-high": "#e9e8e9",
        "surface-container-highest": "#e3e2e3",
        "surface-bright": "#faf9fa",
        "surface-dim": "#dbdadb",
        "surface-variant": "#e3e2e3",
        "surface-tint": "#2259bf",
        surface: "#faf9fa",
        background: "#faf9fa",
        "on-background": "#1b1c1d",
        "on-surface": "#1b1c1d",
        "on-surface-variant": "#434653",
        outline: "#737784",
        "outline-variant": "#c3c6d5",
        "inverse-surface": "#303031",
        "inverse-on-surface": "#f2f0f1",
        "inverse-primary": "#b1c5ff",

        // Primary (Sapphire / Indigo)
        primary: "#094cb2",
        "primary-container": "#3366cc",
        "primary-fixed": "#d9e2ff",
        "primary-fixed-dim": "#b1c5ff",
        "on-primary": "#ffffff",
        "on-primary-container": "#e7ebff",
        "on-primary-fixed": "#001946",
        "on-primary-fixed-variant": "#00419d",

        // Secondary
        secondary: "#5a5f63",
        "secondary-container": "#dfe3e8",
        "secondary-fixed": "#dfe3e8",
        "secondary-fixed-dim": "#c2c7cc",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#606569",
        "on-secondary-fixed": "#171c20",
        "on-secondary-fixed-variant": "#42474b",

        // Tertiary (Amber / Warm Gold)
        tertiary: "#6d5e00",
        "tertiary-container": "#bfab49",
        "tertiary-fixed": "#f9e37a",
        "tertiary-fixed-dim": "#dcc661",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#4a3f00",
        "on-tertiary-fixed": "#211b00",
        "on-tertiary-fixed-variant": "#524600",

        // Error
        error: "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",

        // Paper
        "paper-cream": "#FAF7F2",
      },
      fontFamily: {
        headline: ["'Noto Serif'", "serif"],
        display: ["'Noto Serif'", "serif"],
        body: ["'Inter'", "sans-serif"],
        label: ["'Public Sans'", "sans-serif"],
      },
      boxShadow: {
        "ambient-header": "0 1px 12px rgba(27,28,29,0.03)",
        "ambient-footer": "0 -2px 16px rgba(27,28,29,0.02)",
        "drop-zone": "0 20px 40px -15px rgba(27,28,29,0.06)",
        "editorial": "0 25px 50px -20px rgba(27,28,29,0.08)",
        "card-subtle": "0 12px 30px -15px rgba(27,28,29,0.05)",
        "card-hover": "0 24px 45px -18px rgba(27,28,29,0.1)",
        "manuscript":
          "0 4px 30px rgba(27,28,29,0.03), 0 18px 60px rgba(27,28,29,0.06), 0 1px 2px rgba(27,28,29,0.02)",
      },
    },
  },
  plugins: [],
};
