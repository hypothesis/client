import { startApp } from '@hypothesis/frontend-shared/lib/pattern-library';
import ButtonPatterns from './components/ButtonPatterns';

import { sidebarIcons } from '../../src/sidebar/icons';

/** @type {import('@hypothesis/frontend-shared/lib/pattern-library').PlaygroundRoute[]} */
const extraRoutes = [
  {
    route: '/buttons',
    title: 'Buttons',
    component: ButtonPatterns,
    group: 'components',
  },
];

startApp({ baseURL: '/ui-playground', extraRoutes, icons: sidebarIcons });
