import { startApp } from '@hypothesis/frontend-shared/lib/pattern-library';

import { sidebarIcons } from '../../src/sidebar/icons';

/** @type {import('@hypothesis/frontend-shared/lib/pattern-library').PlaygroundRoute[]} */
const extraRoutes = [];

startApp({ baseURL: '/ui-playground', extraRoutes, icons: sidebarIcons });
