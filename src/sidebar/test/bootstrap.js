// Expose the sinon assertions.
sinon.assert.expose(assert, { prefix: null });

// Patch extra assert helper methods
import { patch } from '../../test-util/assert-methods';
patch(assert);

// Configure Enzyme for UI tests.
import 'preact/debug';

import { configure } from 'enzyme';
import { Adapter } from 'enzyme-adapter-preact-pure';

configure({ adapter: new Adapter() });

// Make all the icons that are available for use with `SvgIcon` in the actual
// app available in the tests. This enables validation of icon names passed to
// `SvgIcon`.
import iconSet from '../icons';
import { registerIcons } from '../../shared/components/svg-icon';
registerIcons(iconSet);
