/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#FF0013",
        'primary-dark': "#cc0010",
        'surface-soft': "#f6f6f3",
        'surface-card': "#f6f6f3",
        'surface-dark': "#020202",
        'ink': "#020202",
        'ink-soft': "#020202",
        'body': "#33332e",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        md: "16px",
        lg: "32px",
      },
      spacing: {
        "xxs": "4px",
        "xs": "6px",
        "sm": "8px",
        "md": "12px",
        "lg": "16px",
        "xl": "24px",
        "xxl": "32px",
        "section": "64px",
      },
    },
  },
  plugins: [],
}
