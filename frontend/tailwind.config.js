/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    // Tokens copied from the Stitch export (docs/design/exported_Stitch_code.html).
    // Dark mode is not built, so no darkMode setting.
    extend: {
      colors: {
        "tertiary-container": "#9c573a",
        "surface-container-highest": "#e5e2e1",
        "on-tertiary": "#ffffff",
        "on-secondary-fixed": "#00201e",
        "secondary-container": "#b5ede7",
        "on-primary-container": "#a3faef",
        "on-primary-fixed": "#00201d",
        "on-error-container": "#93000a",
        "surface-container-low": "#f6f3f2",
        "on-secondary": "#ffffff",
        "surface-variant": "#e5e2e1",
        "tertiary-fixed-dim": "#ffb598",
        "surface-container-high": "#eae7e7",
        "inverse-primary": "#80d5cb",
        error: "#ba1a1a",
        "on-secondary-fixed-variant": "#144f4b",
        "error-container": "#ffdad6",
        "on-primary-fixed-variant": "#00504a",
        secondary: "#316763",
        "surface-container-lowest": "#ffffff",
        "surface-tint": "#006a63",
        outline: "#6e7977",
        "on-tertiary-fixed-variant": "#72361b",
        "on-surface": "#1b1c1c",
        surface: "#fcf9f8",
        "surface-bright": "#fcf9f8",
        "inverse-on-surface": "#f3f0ef",
        "on-background": "#1b1c1c",
        "surface-dim": "#dcd9d9",
        "inverse-surface": "#303030",
        tertiary: "#7f4025",
        "on-surface-variant": "#3e4947",
        "secondary-fixed-dim": "#9ad1cb",
        "on-tertiary-container": "#ffe5db",
        "on-secondary-container": "#376d69",
        "tertiary-fixed": "#ffdbce",
        background: "#fcf9f8",
        "outline-variant": "#bdc9c6",
        "on-error": "#ffffff",
        primary: "#005c55",
        "on-tertiary-fixed": "#370e00",
        "primary-container": "#0f766e",
        "secondary-fixed": "#b5ede7",
        "primary-fixed": "#9cf2e8",
        "surface-container": "#f0eded",
        "on-primary": "#ffffff",
        "primary-fixed-dim": "#80d5cb"
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px"
      },
      spacing: {
        "gutter-mobile": "1rem",
        "space-xl": "2.5rem",
        "space-sm": "0.5rem",
        "space-xs": "0.25rem",
        "space-md": "1rem",
        margin: "2.5rem",
        "margin-mobile": "1.25rem",
        "space-lg": "1.5rem",
        gutter: "1.5rem"
      },
      // One family, so every font-* name the mock uses maps to it
      fontFamily: {
        sans: ["Plus Jakarta Sans", "sans-serif"],
        "display-hero": ["Plus Jakarta Sans", "sans-serif"],
        "body-default": ["Plus Jakarta Sans", "sans-serif"],
        "price-tabular": ["Plus Jakarta Sans", "sans-serif"],
        "headline-lg": ["Plus Jakarta Sans", "sans-serif"],
        "label-sm": ["Plus Jakarta Sans", "sans-serif"],
        "body-sm": ["Plus Jakarta Sans", "sans-serif"],
        "headline-lg-mobile": ["Plus Jakarta Sans", "sans-serif"],
        "headline-md": ["Plus Jakarta Sans", "sans-serif"],
        "label-md": ["Plus Jakarta Sans", "sans-serif"],
        title: ["Plus Jakarta Sans", "sans-serif"],
        "body-medium": ["Plus Jakarta Sans", "sans-serif"],
        "display-hero-mobile": ["Plus Jakarta Sans", "sans-serif"],
        "headline-sm": ["Plus Jakarta Sans", "sans-serif"]
      },
      fontSize: {
        "display-hero": ["60px", { lineHeight: "68px", letterSpacing: "-0.03em", fontWeight: "800" }],
        "body-default": ["16px", { lineHeight: "24px", letterSpacing: "0em", fontWeight: "400" }],
        "price-tabular": ["20px", { lineHeight: "24px", letterSpacing: "-0.01em", fontWeight: "800" }],
        "headline-lg": ["34px", { lineHeight: "42px", letterSpacing: "-0.025em", fontWeight: "800" }],
        "label-sm": ["12px", { lineHeight: "16px", letterSpacing: "0.01em", fontWeight: "600" }],
        "body-sm": ["15px", { lineHeight: "22px", letterSpacing: "0em", fontWeight: "400" }],
        "headline-lg-mobile": ["26px", { lineHeight: "32px", letterSpacing: "-0.02em", fontWeight: "800" }],
        "headline-md": ["28px", { lineHeight: "36px", letterSpacing: "-0.02em", fontWeight: "800" }],
        "label-md": ["14px", { lineHeight: "18px", letterSpacing: "0.005em", fontWeight: "600" }],
        title: ["18px", { lineHeight: "24px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "body-medium": ["16px", { lineHeight: "24px", letterSpacing: "0em", fontWeight: "500" }],
        "display-hero-mobile": ["38px", { lineHeight: "44px", letterSpacing: "-0.025em", fontWeight: "800" }],
        "headline-sm": ["22px", { lineHeight: "28px", letterSpacing: "-0.015em", fontWeight: "800" }]
      }
    }
  },
  plugins: []
};
