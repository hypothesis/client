import tailwindConfig from './tailwind.config.mjs';

export default {
  presets: [tailwindConfig],
  content: [
    './src/sidebar/components/**/*.{js,ts,tsx}',
    './dev-server/ui-playground/components/**/*.{js,ts,tsx}',
    './node_modules/@hypothesis/frontend-shared/lib/**/*.{js,ts,tsx}',
  ],
};
