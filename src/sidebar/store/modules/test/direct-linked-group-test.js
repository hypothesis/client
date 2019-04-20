'use strict';

const createStore = require('../../create-store');
const directLinkedGroup = require('../direct-linked-group');

describe('sidebar/store/modules/direct-linked-group', () => {
  let store;

  beforeEach(() => {
    store = createStore([directLinkedGroup]);
  });

  it('sets directLinkedGroupFetchFailed to true', () => {
    store.setDirectLinkedGroupFetchFailed();

    assert.isTrue(store.getState().directLinkedGroupFetchFailed);
  });

  it('sets directLinkedGroupFetchFailed to false', () => {
    store.setDirectLinkedGroupFetchFailed();

    store.clearDirectLinkedGroupFetchFailed();

    assert.isFalse(store.getState().directLinkedGroupFetchFailed);
  });
});
