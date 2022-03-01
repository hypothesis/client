import tailwindConfig from '@hypothesis/frontend-shared/lib/tailwind.preset.js';
import plugin from 'tailwindcss/plugin.js';

export default {
  presets: [tailwindConfig],
  content: [
    './src/sidebar/components/**/*.js',
    './src/annotator/components/**/*.js',
    './dev-server/ui-playground/components/**/*.js',
    './node_modules/@hypothesis/frontend-shared/lib/**/*.js',
    // This module references `sidebar-frame` and related classes
    './src/annotator/sidebar.js',
  ],
  theme: {
    extend: {
      animation: {
        adderPopUp: 'adderPopUp 0.08s ease-in forwards',
        adderPopDown: 'adderPopDown 0.08s ease-in forwards',
      },
      boxShadow: {
        DEFAULT: '0 1px 1px rgba(0, 0, 0, 0.1)',
        adderToolbar: '0px 2px 10px 0px rgba(0, 0, 0, 0.25)',
        // The shadow shown along the edge of the sidebar in the clean theme
        sidebar: '0px 1px 4px rgb(0, 0, 0, 0.5)',
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
        base: ['13px', '1.4'],
        lg: ['14px'],
        xl: ['16px'],
        // Keep separate font settings for the annotator; these may need to
        // remain as pixels when sidebar converts to rems or otherwise be
        // independent of sidebar font sizes
        'annotator-sm': ['12px'],
        'annotator-base': ['14px'],
        'annotator-lg': ['16px'],
        'annotator-xl': ['18px'],
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
      screens: {
        // Narrow mobile screens
        'annotator-sm': '240px',
        // Wider mobile screens/small tablets
        'annotator-md': '480px',
        // Tablet and up
        'annotator-lg': '600px',
      },
      zIndex: {
        1: '1',
        2: '2',
        3: '3',
        max: '2147483647',
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      // Add a custom variant such that the `sidebar-collapsed:` modifier
      // is available. The `Sidebar` logic adds the `.sidebar-collapsed`
      // class to the sidebar frame when it's collapsed. This modifier allows
      // sub-components to select for that state.
      addVariant('sidebar-collapsed', '.sidebar-collapsed &');
    }),
  ],
};
