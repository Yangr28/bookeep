/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        // 品牌主色
        primary: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
        // 语义色
        expense: { DEFAULT: "#ef4444", light: "#fee2e2", dark: "#7f1d1d" },
        income: { DEFAULT: "#10b981", light: "#d1fae5", dark: "#064e3b" },
        // 表面层
        surface: {
          light: "#ffffff",
          "light-2": "#f9fafb",
          "light-3": "#f3f4f6",
          dark: "#1f2937",
          "dark-2": "#111827",
          "dark-3": "#374151",
        },
      },
      borderRadius: {
        card: "1rem",
        button: "0.75rem",
        chip: "9999px",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px 0 rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px 0 rgba(0,0,0,0.1), 0 2px 4px 0 rgba(0,0,0,0.06)",
        header: "0 4px 20px 0 rgba(0,0,0,0.06)",
      },
      fontSize: {
        "display": ["2rem", { lineHeight: "1.2", fontWeight: "700" }],
        "title": ["1.25rem", { lineHeight: "1.3", fontWeight: "600" }],
        "body": ["0.875rem", { lineHeight: "1.5" }],
        "caption": ["0.75rem", { lineHeight: "1.4" }],
        "label": ["0.6875rem", { lineHeight: "1.2", fontWeight: "500" }],
      },
      spacing: {
        "safe-top": "max(env(safe-area-inset-top, 0px), 2rem)",
        "safe-bottom": "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
      },
    },
  },
  plugins: [],
};
