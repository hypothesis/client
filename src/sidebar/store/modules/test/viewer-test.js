import createStore from '../../create-store';
import viewer from '../viewer';

describe('store/modules/viewer', function() {
  let store;

  beforeEach(() => {
    store = createStore([viewer]);
  });

  describe('#setShowHighlights', function() {
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
