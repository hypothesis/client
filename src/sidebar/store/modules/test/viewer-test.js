import { createStore } from '../../create-store';
import { viewerModule } from '../viewer';

describe('store/modules/viewer', () => {
  let store;

  beforeEach(() => {
    store = createStore([viewerModule]);
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

  describe('getContentInfo', () => {
    it('returns data for content info banner', () => {
      const contentInfo = {
        logo: {},
        item: { title: 'Some article' },
        links: {},
      };
      store.setContentInfo(contentInfo);
      assert.deepEqual(store.getContentInfo(), contentInfo);
    });
  });
});
