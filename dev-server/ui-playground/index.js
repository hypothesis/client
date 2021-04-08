import { registerIcons } from '@hypothesis/frontend-shared';
import { render } from 'preact';

import ButtonPatterns from './components/ButtonPatterns';

import PlaygroundApp from './shared/components/PlaygroundApp';

import sidebarIcons from '../../src/sidebar/icons';
registerIcons(sidebarIcons);

const container = document.querySelector('#app');

const extraRoutes = [
  {
    route: '/buttons',
    title: 'Buttons',
    component: ButtonPatterns,
  },
];

render(
  <PlaygroundApp extraRoutes={extraRoutes} />,
  /** @type Element */ (container)
);
