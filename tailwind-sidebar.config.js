import tailwindConfig from '@hypothesis/frontend-shared/tailwind.preset.js';
import plugin from 'tailwindcss/plugin.js';

const focusBlue = '#59a7e8';

export default {
  presets: [tailwindConfig],
  content: [
    './src/sidebar/components/**/*.{js,ts,tsx}',
    './src/shared/components/**/*.{js,ts,tsx}',
    './node_modules/@hypothesis/annotation-ui/lib/**/*.{js,ts,tsx}',
    './node_modules/@hypothesis/frontend-shared/lib/**/*.{js,ts,tsx}',
  ],
  theme: {
    extend: {
      animation: {
        'fade-in': 'fade-in 0.3s forwards',
        'fade-in-slow': 'fade-in 1s ease-in',
        'fade-out': 'fade-out 0.3s forwards',
        'pulse-fade-out': 'pulse-fade-out 5s ease-in-out forwards',
        'slide-in-from-right': 'slide-in-from-right 0.3s forwards ease-in-out',
        'updates-notification-slide-in':
          'updates-notification-slide-in 0.3s ease-in',
      },
      boxShadow: {
        // A more prominent shadow than the one used by tailwind, intended for
        // popovers and menus
        intense: '0px 2px 10px 0px rgb(0 0 0 / 0.25)',
        'focus-inner': `inset 0 0 0 2px ${focusBlue}`,
      },
      colors: {
        blue: {
          quote: '#58cef4',
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
        xs: ['11px', '1.4'],
        sm: ['13px', '1.4'],
        base: ['13px', '1.4'], // Current base font size for sidebar
        md: ['14px'],
        lg: ['16px'],
        xl: ['18px'],
        'touch-base': ['16px', '1.4'], // Used for touch interfaces in certain UIs
      },
      keyframes: {
        'fade-in': {
          '0%': {
            opacity: '0',
          },
          '100%': {
            opacity: '1',
          },
        },
        'fade-out': {
          '0%': {
            opacity: '1',
          },
          '100%': {
            opacity: '0',
          },
        },
        'pulse-fade-out': {
          '0%': {
            opacity: '1',
            transform: 'scale(1.1)',
          },
          '8%': {
            transform: 'scale(1)',
          },
          '90%': {
            opacity: '0.8',
          },
          '100%': {
            opacity: '0',
          },
        },
        'slide-in-from-right': {
          '0%': {
            opacity: '0',
            left: '100%',
          },
          '80%': {
            left: '-10px',
          },
          '100%': {
            left: '0',
            opacity: '1',
          },
        },
        'updates-notification-slide-in': {
          '0%': {
            opacity: '0',
            right: '-15px',
          },
          '100%': {
            opacity: '1',
            right: '0',
          },
        },
      },
      screens: {
        touch: { raw: '(pointer: coarse)' },
        sm: '360px',
        lg: '768px',
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
      // Add a custom variant such that the `theme-clean:` modifier is available
      // for all tailwind utility classes. e.g. `.theme-clean:bg-white` would
      // only apply (set the element's background color to white) if a parent
      // element had the `.theme-clean` class.
      addVariant('theme-clean', '.theme-clean &');
    }),
  ],
};
