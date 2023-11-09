import tailwindConfig from '@hypothesis/frontend-shared/lib/tailwind.preset.js';
import plugin from 'tailwindcss/plugin.js';

const focusBlue = '#59a7e8';

export default {
  presets: [tailwindConfig],
  content: [
    './src/sidebar/components/**/*.{js,ts,tsx}',
    './src/annotator/components/**/*.{js,ts,tsx}',
    './dev-server/ui-playground/components/**/*.{js,ts,tsx}',
    './node_modules/@hypothesis/frontend-shared/lib/**/*.{js,ts,tsx}',
    // This module references `sidebar-frame` and related classes
    './src/annotator/sidebar.{js,ts,tsx}',
  ],
  theme: {
    extend: {
      animation: {
        'adder-pop-down': 'adder-pop-down 0.08s ease-in forwards',
        'adder-pop-up': 'adder-pop-up 0.08s ease-in forwards',
        'fade-in': 'fade-in 0.3s forwards',
        'fade-in-slow': 'fade-in 1s ease-in',
        'fade-out': 'fade-out 0.3s forwards',
        'pulse-fade-out': 'pulse-fade-out 5s ease-in-out forwards',
        'slide-in-from-right': 'slide-in-from-right 0.3s forwards ease-in-out',
      },
      boxShadow: {
        // A more prominent shadow than the one used by tailwind, intended for
        // popovers and menus
        intense: '0px 2px 10px 0px rgb(0 0 0 / 0.25)',
        focus: `0 0 0 2px ${focusBlue}`,
        'focus-inner': `inset 0 0 0 2px ${focusBlue}`,
        // The shadow shown along the edge of the sidebar in the clean theme
        sidebar: '0px 1px 4px rgb(0, 0, 0, 0.5)',
      },
      colors: {
        blue: {
          quote: '#58cef4',
        },
      },
      // Content in the sidebar should never exceed a max-width of `768px`, and
      // that content should be auto-centered
      // See https://tailwindcss.com/docs/container
      container: {
        center: true,
        // Horizontal padding is larger for wider screens
        padding: {
          // Precise horizontal padding for annotation-card alignment
          DEFAULT: '9px',
          lg: '4rem',
        },
        // By default, tailwind will provide appropriately-sized containers at
        // every breakpoint available in `screens`, but for the sidebar, only
        // one width matters: the width associated with the `lg` breakpoint.
        // The content container should never be larger than that. `container`
        // has a `max-width:100%` until the `lg` breakpoint, after which it
        // never exceeds `768px`.
        screens: {
          lg: '768px',
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
        'px-tiny': ['10px'],
        'px-base': ['16px'],
      },
      gradientColorStops: {
        // These gradient stops define a custom gradient shown at the bottom of
        // long annotation body excerpts.
        'excerpt-stop-1': 'rgba(255, 255, 255, 0) 50%',
        'excerpt-stop-2': 'rgba(0, 0, 0, 0.08) 95%',
        'excerpt-stop-3': 'rgba(0, 0, 0, 0.13) 100%',
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
      },
      screens: {
        touch: { raw: '(pointer: coarse)' },
        sm: '360px',
        md: '480px',
        lg: '768px',
        xl: '1024px',
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
      // Add a custom variant such that the `theme-clean:` modifier is available
      // for all tailwind utility classes. e.g. `.theme-clean:bg-white` would
      // only apply (set the element's background color to white) if a parent
      // element had the `.theme-clean` class.
      addVariant('theme-clean', '.theme-clean &');
    }),
    plugin(({ addComponents, addUtilities }) => {
      addUtilities({
        // Tailwind does not provide hyphens-related utility classes.
        '.hyphens-none': {
          hyphens: 'none',
        },
        '.hyphens-auto': {
          hyphens: 'auto',
        },
        // Tailwind does not provide this specific break utility: https://tailwindcss.com/docs/word-break
        '.break-anywhere': {
          'overflow-wrap': 'anywhere',
        },
      });
      addComponents({
        // Add a custom class to set all properties to initial values. Used
        // within shadow DOMs. This must be on the components layer such that it
        // gets applied "before" utility classes.
        '.all-initial': {
          all: 'initial',
        },
      });
    }),
  ],
};
