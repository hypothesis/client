import { createStore } from '../../create-store';
import viewer from '../viewer';

describe('store/modules/viewer', function () {
  let store;

  beforeEach(() => {
    store = createStore([viewer]);
  });

  describe('#setShowHighlights', function () {
    it('sets a flag indicating that highlights are visible', function () {
      store.setShowHighlights(true);
      assert.isTrue(store.getState().viewer.visibleHighlights);
    });

    it('sets a flag indicating that highlights are not visible', function () {
      store.setShowHighlights(false);
      assert.isFalse(store.getState().viewer.visibleHighlights);
    });
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
