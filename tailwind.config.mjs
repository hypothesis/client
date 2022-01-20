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
      colors: {
        'color-text': {
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
      fontSize: {
        base: ['13px', '1.4'],
      },
    },
  },
};
