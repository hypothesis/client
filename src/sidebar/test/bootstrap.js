// Expose the sinon assertions.
sinon.assert.expose(assert, { prefix: null });

import 'angular';
import 'angular-mocks';

// Configure Enzyme for UI tests.
import 'preact/debug';

import { configure } from 'enzyme';
import { Adapter } from 'enzyme-adapter-preact-pure';

configure({ adapter: new Adapter() });
