import tailwindConfig from './tailwind.config.mjs';

export default {
  presets: [tailwindConfig],
  content: [
    './src/annotator/components/**/*.{js,ts,tsx}',
    './node_modules/@hypothesis/frontend-shared/lib/**/*.{js,ts,tsx}',
    // This module references `sidebar-frame` and related classes
    './src/annotator/sidebar.{js,ts,tsx}',
  ],
};
