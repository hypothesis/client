import tailwindConfig from '@hypothesis/frontend-shared/lib/tailwind.preset.js';

export default {
  presets: [tailwindConfig],
  mode: 'jit',
  purge: ['./src/**/*.js'],
};
