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
      borderRadius: {
        // Tailwind provides a default set of border-radius utility styles
        // in rem units. Add some values for places where border radius needs
        // to be a fixed size and not scale with changes to root font size
        // example: bucket bar indicator buttons
        'px-sm': '2px',
        px: '4px',
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
        mono: ['"Open Sans Mono"', 'Menlo', '"DejaVu Sans Mono"', 'monospace'],
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
        // This is a collection of font sizes used in existing sidebar components,
        // which will grow during the conversion-to-Tailwind process. These
        // are descriptive, not aspirational or prescriptive.
        tiny: ['10px'],
        sm: ['11px', '1.4'],
        base: ['13px', '1.4'], // Current base font size for sidebar
        lg: ['14px'],
        xl: ['16px'],
        // rem-based font sizes for annotator controls that should scale
        // with text scaling in the underlying document
        'annotator-sm': ['0.75rem'],
        'annotator-base': ['0.875rem'],
        'annotator-lg': ['1rem'],
        'annotator-xl': ['1.125rem'],
        // These are known cases when we want absolute sizing for fonts so
        // that they do not scale, for example annotator components that are
        // rendered next to the sidebar (which doesn't scale with host root
        // font sizing)
        'px-tiny': ['10px'],
        'px-base': ['16px'],
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
        md: '480px',
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
