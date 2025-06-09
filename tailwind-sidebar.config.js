import tailwindConfig from './tailwind.config.js';

export default {
  presets: [tailwindConfig],
  content: [
    './src/sidebar/components/**/*.{js,ts,tsx}',
    './src/shared/components/**/*.{js,ts,tsx}',
    './dev-server/ui-playground/components/**/*.{js,ts,tsx}',
    './node_modules/@hypothesis/annotation-ui/lib/**/*.{js,ts,tsx}',
    './node_modules/@hypothesis/frontend-shared/lib/**/*.{js,ts,tsx}',
  ],
};
