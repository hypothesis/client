import { registerIcons } from '@hypothesis/frontend-shared';
import { render } from 'preact';

import PlaygroundApp from './PlaygroundApp';

import sidebarIcons from '../../src/sidebar/icons';
registerIcons(sidebarIcons);

const container = document.querySelector('#app');
render(<PlaygroundApp />, container);
