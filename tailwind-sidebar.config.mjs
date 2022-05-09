import tailwindConfig from './tailwind.config.mjs';

export default {
  presets: [tailwindConfig],
  content: [
    './src/sidebar/components/**/*.js',
    './dev-server/ui-playground/components/**/*.js',
    './node_modules/@hypothesis/frontend-shared/lib/**/*.js',
  ],
};
