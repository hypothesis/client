import { unmountAll } from '@hypothesis/frontend-testing';
import { assert } from 'chai';
import { configure } from 'enzyme';
import { Adapter } from 'enzyme-adapter-preact-pure';
import 'preact/debug';
import sinon from 'sinon';

import { patch } from '../../test-util/assert-methods';

// Expose the sinon assertions and add extra assert methods.
sinon.assert.expose(assert, { prefix: null });
patch(assert);

// Expose these globally, to avoid dependency on outdated karma-chai and
// karma-sinon plugins
globalThis.assert = assert;
globalThis.sinon = sinon;
globalThis.context ??= globalThis.describe;
globalThis.before ??= globalThis.beforeAll;
globalThis.after ??= globalThis.afterAll;

// Configure Enzyme for UI tests.
configure({ adapter: new Adapter() });

// Unmount all UI components after each test.
afterEach(() => {
  unmountAll();
});
