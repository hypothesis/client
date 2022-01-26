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
      borderColor: {
        DEFAULT: '#dbdbdb', // TODO: remove when available from upstream preset
      },
      colors: {
        'color-text': {
          // TODO: remove when available from upstream preset
          DEFAULT: '#202020',
          light: '#737373',
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
        base: ['13px', '1.4'],
        lg: ['14px'],
        xl: ['16px'],
      },
    },
  },
};
