'use strict';

const createStore = require('../../create-store');
const selection = require('../selection');

// nb. Tests for most of the functionality in the "selection" module are
// currently in the tests for the whole Redux store.

describe('sidebar.store.modules.selection', () => {
  describe('#directLinkedAnnotationId', () => {
    it('returns null/undefined if no direct link was followed', () => {
      const store = createStore([selection], [{}]);
      assert.notOk(store.directLinkedAnnotationId());
    });

    it('returns direct-linked ID if specified', () => {
      const store = createStore([selection], [{
        annotations: 'some-id',
      }]);
      assert.equal(store.directLinkedAnnotationId(), 'some-id');
    });
  });
});
