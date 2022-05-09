import tailwindConfig from './tailwind.config.mjs';

export default {
  presets: [tailwindConfig],
  content: [
    './src/annotator/components/**/*.js',
    './node_modules/@hypothesis/frontend-shared/lib/**/*.js',
    // This module references `sidebar-frame` and related classes
    './src/annotator/sidebar.js',
  ],
};
