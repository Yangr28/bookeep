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
        // 品牌主色：晴蓝
        primary: {
          50: "#ebf2fd",
          100: "#d9e8fb",
          200: "#b7d3f7",
          300: "#8cb9f0",
          400: "#5e97e6",
          500: "#2e85de",
          600: "#2270c4",
          700: "#1b5ba3",
          800: "#174a84",
          900: "#123a68",
        },
        // 语义色：支出=陶土橙红；收入=主色蓝
        expense: {
          50: "#fcede9",
          100: "#fadbd3",
          200: "#f4b5a7",
          300: "#ed8f7b",
          400: "#e6745d",
          500: "#e0684f",
          600: "#cc4e36",
          700: "#a93f2c",
          800: "#853426",
          900: "#662a1f",
          DEFAULT: "#e0684f",
          light: "#fce9e4",
          dark: "#a93f2c",
        },
        income: {
          DEFAULT: "#2e85de",
          light: "#e7f0fc",
          dark: "#1b5ba3",
        },
        // 暖纸表面
        paper: {
          DEFAULT: "#f6f3ee",
          deep: "#efe9df",
        },
        // 暖墨文字
        ink: {
          900: "#2b2925",
          700: "#5b564d",
          500: "#8c8577",
          300: "#c3bba9",
        },
        // 深色模式表面
        night: {
          900: "#17181c",
          800: "#20232b",
          700: "#26282f",
          600: "#2e323c",
        },
      },
      borderRadius: {
        card: "1.25rem",
        button: "0.875rem",
        sheet: "1.5rem",
        chip: "9999px",
      },
      boxShadow: {
        card: "0 6px 20px rgba(168, 142, 110, 0.10)",
        "card-hover": "0 10px 28px rgba(168, 142, 110, 0.16)",
        fab: "0 10px 24px rgba(46, 133, 222, 0.38)",
      },
      fontSize: {
        display: ["2rem", { lineHeight: "1.2", fontWeight: "700" }],
        title: ["1.25rem", { lineHeight: "1.3", fontWeight: "600" }],
        body: ["0.875rem", { lineHeight: "1.5" }],
        caption: ["0.75rem", { lineHeight: "1.4" }],
        label: ["0.6875rem", { lineHeight: "1.2", fontWeight: "500" }],
      },
    },
  },
  plugins: [],
};
