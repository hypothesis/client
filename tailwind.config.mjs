import tailwindConfig from '@hypothesis/frontend-shared/lib/tailwind.preset.js';

export default {
  presets: [tailwindConfig],
  content: [
    './src/sidebar/components/**/*.js',
    './src/annotator/components/**/*.js',
    './dev-server/ui-playground/components/**/*.js',
    './node_modules/@hypothesis/frontend-shared/lib/**/*.js',
  ],
  theme: {},
  corePlugins: {
    preflight: false, // Disable Tailwind's CSS reset in the `base` layer
  },
};
