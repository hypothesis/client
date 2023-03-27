import { configure } from 'enzyme';
import { Adapter } from 'enzyme-adapter-preact-pure';
import 'preact/debug';

import { patch } from '../../test-util/assert-methods';

// Expose the sinon assertions.
sinon.assert.expose(assert, { prefix: null });

// Add extra assert methods
patch(assert);

// Configure Enzyme for UI tests.
configure({ adapter: new Adapter() });

// Ensure that uncaught exceptions between tests result in the tests failing.
// This works around an issue with mocha / karma-mocha, see
// https://github.com/hypothesis/client/issues/2249.
let pendingError = null;
let pendingErrorNotice = null;

window.addEventListener('error', event => {
  pendingError = event.error;
  pendingErrorNotice = 'An uncaught exception was thrown between tests';
});
window.addEventListener('unhandledrejection', event => {
  pendingError = event.reason;
  pendingErrorNotice = 'An uncaught promise rejection occurred between tests';
});

afterEach(() => {
  if (pendingError) {
    console.error(pendingErrorNotice);
    throw pendingError;
  }
});
