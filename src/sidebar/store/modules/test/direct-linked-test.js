'use strict';

const createStore = require('../../create-store');
const directLinked = require('../direct-linked');

describe('sidebar/store/modules/direct-linked', () => {
  let store;
  let fakeSettings = {};

  beforeEach(() => {
    store = createStore([directLinked], [fakeSettings]);
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

  it('sets directLinkedAnnotationsId to settings.annotations during store init', () => {
    fakeSettings.annotations = 'ann-id';

    store = createStore([directLinked], [fakeSettings]);

    assert.equal(store.getState().directLinkedAnnotationsId, 'ann-id');
  });

  it('sets directLinkedAnnotationsId to the specified annotation id', () => {
    store.setDirectLinkedAnnotationsId('ann-id');

    assert.equal(store.getState().directLinkedAnnotationsId, 'ann-id');
  });

  it('sets directLinkedGroupId to settings.group during store init', () => {
    fakeSettings.group = 'group-id';

    store = createStore([directLinked], [fakeSettings]);

    assert.equal(store.getState().directLinkedGroupId, 'group-id');
  });

  it('sets directLinkedGroupId to the specified group id', () => {
    store.setDirectLinkedGroupId('group-id');

    assert.equal(store.getState().directLinkedGroupId, 'group-id');
  });

  it('sets direct-link annotations and group ids to null', () => {
    store.setDirectLinkedGroupId('ann-id');
    store.setDirectLinkedGroupId('group-id');

    store.clearDirectLinkedIds();

    assert.equal(store.getState().directLinkedAnnotationsId, null);
    assert.equal(store.getState().directLinkedGroupId, null);
  });
});
