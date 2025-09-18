import tailwindConfig from '@hypothesis/frontend-shared/tailwind.preset.js';
import plugin from 'tailwindcss/plugin.js';

export default {
  presets: [tailwindConfig],
  content: [
    './src/annotator/components/**/*.{js,ts,tsx}',
    './src/shared/components/**/*.{js,ts,tsx}',
    './node_modules/@hypothesis/frontend-shared/lib/**/*.{js,ts,tsx}',
    // This module references `sidebar-frame` and related classes
    './src/annotator/sidebar.{js,ts,tsx}',
  ],
  theme: {
    extend: {
      animation: {
        'adder-pop-down': 'adder-pop-down 0.08s ease-in forwards',
        'adder-pop-up': 'adder-pop-up 0.08s ease-in forwards',
      },
      boxShadow: {
        // A more prominent shadow than the one used by tailwind, intended for
        // popovers and menus
        intense: '0px 2px 10px 0px rgb(0 0 0 / 0.25)',
        // The shadow shown along the edge of the sidebar in the clean theme
        sidebar: '0px 1px 4px rgb(0, 0, 0, 0.5)',
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
        // Font sizes for annotator controls that should scale with text in the
        // document. These can only be used within shadow roots that include the
        // annotator.css bundle.
        'annotator-sm': ['calc(0.75 * var(--hypothesis-font-size))'],
        'annotator-base': ['calc(0.875 * var(--hypothesis-font-size))'],
        'annotator-lg': ['var(--hypothesis-font-size)'],
        'annotator-xl': ['calc(1.125 * var(--hypothesis-font-size))'],
        // These are known cases when we want absolute sizing for fonts so
        // that they do not scale, for example annotator components that are
        // rendered next to the sidebar (which doesn't scale with host root
        // font sizing)
        'px-base': ['16px'],
      },
      keyframes: {
        'adder-pop-down': {
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
        'adder-pop-up': {
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
        touch: { raw: '(pointer: coarse)' },
        '2xl': '1220px',
        // Narrow mobile screens
        'annotator-sm': '240px',
        // Wider mobile screens/small tablets
        'annotator-md': '480px',
        // Tablet and up
        'annotator-lg': '600px',
      },
      spacing: {
        // These are selective, pixel-specific variants of Tailwind's default
        // rem-based spacing scale and follow the same naming conventions with
        // a `px-` prefix. They should only be used where UI should not scale
        // with text scaling (i.e. `1rem != 16px`). Example: spacing between
        // buttons in the annotator toolbar
        'px-1.5': '6px',
        'px-2': '8px',
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
