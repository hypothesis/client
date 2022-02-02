import tailwindConfig from '@hypothesis/frontend-shared/lib/tailwind.preset.js';

export default {
  presets: [tailwindConfig],
  content: [
    './src/sidebar/components/**/*.js',
    './src/annotator/components/**/*.js',
    './dev-server/ui-playground/components/**/*.js',
    './node_modules/@hypothesis/frontend-shared/lib/**/*.js',
  ],
  theme: {
    extend: {
      animation: {
        adderPopUp: 'adderPopUp 0.08s ease-in forwards',
        adderPopDown: 'adderPopDown 0.08s ease-in forwards',
      },
      boxShadow: {
        adderToolbar: '0px 2px 10px 0px rgba(0, 0, 0, 0.25)',
      },
      colors: {
        slate: {
          // TODO remove when available from upstream preset
          1: '#e3e3e5',
        },
        'color-text': {
          inverted: '#f2f2f2',
        },
      },
      fontFamily: {
        sans: [
          '"Helvetica Neue"',
          'Helvetica',
          'Arial',
          '"Lucida Grande"',
          'sans-serif',
        ],
      },
      // The following text sizes describe the current font sizes being used
      // in the app (descriptive), but should not be interpreted as defining
      // an ideal design system (prescriptive).
      fontSize: {
        tiny: ['10px'],
        sm: ['11px', '1.4'],
        'annotator-sm': ['12px'],
        base: ['13px', '1.4'],
        lg: ['14px'],
        xl: ['16px'],
        annotator: {
          sm: ['12px'],
        },
      },
      keyframes: {
        adderPopDown: {
          '0%': {
            opacity: '0.05',
            transform: 'scale(0.8) translateY(10px)',
          },
          '20%': {
            opacity: '0.7',
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1) translateY(0px)',
          },
        },
        adderPopUp: {
          '0%': {
            opacity: '0.05',
            transform: 'scale(0.8) translateY(-10px)',
          },
          '20%': {
            opacity: '0.7',
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1) translateY(0px)',
          },
        },
      },
    },
  },
};
