import * as viewer from '../viewer';
import createStore from '../../create-store';

describe('store/modules/viewer', function() {
  let store;

  beforeEach(() => {
    store = createStore([viewer]);
  });
  describe('#setAppIsSidebar', function() {
    it('sets a flag indicating that the app is not the sidebar', function() {
      store.setAppIsSidebar(false);
      assert.isFalse(store.isSidebar());
    });

    it('sets a flag indicating that the app is the sidebar', function() {
      store.setAppIsSidebar(true);
      assert.isTrue(store.isSidebar());
    });

    it('sets a flag indicating that highlights are visible', function() {
      store.setShowHighlights(true);
      assert.isTrue(store.getState().viewer.visibleHighlights);
    });

    it('sets a flag indicating that highlights are not visible', function() {
      store.setShowHighlights(false);
      assert.isFalse(store.getState().viewer.visibleHighlights);
    });
  });
});
