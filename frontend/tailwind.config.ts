import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Marken-Gold (siehe ../brand)
        gold: {
          light: "#F3DC93",
          DEFAULT: "#D4AF37",
          dark: "#9C6F1B",
          accent: "#B98F3A",
        },
        ink: "#15171E",
        coal: "#0F1117",
      },
      fontFamily: {
        serif: ["Georgia", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
