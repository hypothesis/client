import { createStore } from '../../create-store';
import { viewer } from '../viewer';

describe('store/modules/viewer', () => {
  let store;

  beforeEach(() => {
    store = createStore([viewer]);
  });

  describe('hasSidebarOpened', () => {
    it('is `false` if sidebar has never been opened', () => {
      assert.isFalse(store.hasSidebarOpened());
      store.setSidebarOpened(false);
      assert.isFalse(store.hasSidebarOpened());
    });

    it('is `true` if sidebar has been opened', () => {
      store.setSidebarOpened(true);
      assert.isTrue(store.hasSidebarOpened());
    });

    it('is `true` if sidebar is closed after being opened', () => {
      store.setSidebarOpened(true);
      store.setSidebarOpened(false);
      assert.isTrue(store.hasSidebarOpened());
    });
  });
});
