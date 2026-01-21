/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}', './src/**/*.component.ts', './src/**/*.component.html'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#003366',
          light: '#004080',
          dark: '#002244',
        },
        success: {
          DEFAULT: '#00694E',
          light: '#008060',
          dark: '#004030',
        },
        warning: {
          DEFAULT: '#FFB000',
          light: '#FFC233',
          dark: '#CC8800',
        },
        error: {
          DEFAULT: '#D32F2F',
          light: '#EF5350',
          dark: '#B71C1C',
        },
        info: {
          DEFAULT: '#0288D1',
          light: '#03A9F4',
          dark: '#01579B',
        },
        gray: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E0E0E0',
          300: '#C0C0C0',
          400: '#9E9E9E',
          500: '#757575',
          600: '#616161',
          700: '#424242',
          800: '#303030',
          900: '#212121',
        },
      },
      borderWidth: {
        3: '3px',
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
      spacing: {
        touch: '44px',
      },
      fontSize: {
        xxs: '0.625rem',
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
  important: false,
};
