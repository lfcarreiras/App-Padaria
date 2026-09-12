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
        bakery: {
          50: '#fdf8f4',
          100: '#f9eee4',
          200: '#f2dbc8',
          300: '#e8c0a2',
          400: '#dba077',
          500: '#cf8152',
          600: '#be6b41',
          700: '#9d5435',
          800: '#7f442e',
          900: '#673929',
        },
      },
    },
  },
  plugins: [],
};
export default config;
