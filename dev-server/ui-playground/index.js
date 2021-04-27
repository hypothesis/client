import { startApp } from '@hypothesis/frontend-shared/lib/pattern-library';
import ButtonPatterns from './components/ButtonPatterns';

import sidebarIcons from '../../src/sidebar/icons';

const extraRoutes = [
  {
    route: '/buttons',
    title: 'Buttons',
    component: ButtonPatterns,
  },
];

startApp({ extraRoutes, icons: sidebarIcons });
