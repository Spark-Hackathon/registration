module.exports = {
  purge: [],
  darkMode: false,
  theme: {
    extend: {
      colors: {
        yellow: {
          light: "#F7E88F",
          DEFAULT: "#FFBF00",
          dark: "#E0A800"
        }
      },
      spacing: {
        "100": "32rem",
      },
      width: {
        "col": "12.5%"
      }
    }
  },
  variants: {
    extend: {
      backgroundColor: ["even"]
    },
  },
  plugins: [],
}
