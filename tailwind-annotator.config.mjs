import tailwindConfig from './tailwind.config.mjs';

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
      borderRadius: {
        // Equivalent to tailwind defaults, but overriding values from frontend-shared preset
        // Once the preset stops defining borderRadius, we can remove this
        DEFAULT: '0.25rem',
        lg: '0.5rem',
      },
    }
  }
};
