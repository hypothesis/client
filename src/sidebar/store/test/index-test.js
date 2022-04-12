import { render } from 'preact';
import { act } from 'preact/test-utils';

import * as annotationFixtures from '../../test/annotation-fixtures';
import { createSidebarStore, useSidebarStore } from '../index';
import { immutable } from '../../util/immutable';
import { ServiceContext } from '../../service-context';

const defaultAnnotation = annotationFixtures.defaultAnnotation;
const newAnnotation = annotationFixtures.newAnnotation;

const fixtures = immutable({
  pair: [
    Object.assign(defaultAnnotation(), { id: 1, $tag: 't1' }),
    Object.assign(defaultAnnotation(), { id: 2, $tag: 't2' }),
  ],
  newPair: [
    Object.assign(newAnnotation(), { $tag: 't1' }),
    Object.assign(newAnnotation(), { $tag: 't2' }),
  ],
});

describe('createSidebarStore', () => {
  let store;

  function tagForID(id) {
    const storeAnn = store.findAnnotationByID(id);
    if (!storeAnn) {
      throw new Error(`No annotation with ID ${id}`);
    }
    return storeAnn.$tag;
  }

  beforeEach(() => {
    store = createSidebarStore({});
  });

  describe('initialization', () => {
    it('does not set a selection when settings.annotations is null', () => {
      assert.isFalse(store.hasSelectedAnnotations());
      assert.equal(Object.keys(store.expandedMap()).length, 0);
    });

    it('sets the selection when settings.annotations is set', () => {
      store = createSidebarStore({ annotations: 'testid' });
      assert.deepEqual(store.selectedAnnotations(), ['testid']);
    });

    it('expands the selected annotations when settings.annotations is set', () => {
      store = createSidebarStore({ annotations: 'testid' });
      assert.deepEqual(store.expandedMap(), {
        testid: true,
      });
    });
  });

  describe('clearSelection', () => {
    // Test clearSelection here over the entire store as it triggers the
    // CLEAR_SELECTION action in multiple store modules.
    it('empties selected annotation map', () => {
      store.clearSelection();
      assert.isEmpty(store.selectedAnnotations());
    });

    it('sets `filterQuery` to null', () => {
      store.clearSelection();
      assert.isNull(store.getState().filters.query);
    });

    it('sets `directLinkedGroupFetchFailed` to false', () => {
      store.clearSelection();
      assert.isFalse(
        store.getState().directLinked.directLinkedGroupFetchFailed
      );
    });

    it('sets `directLinkedAnnotationId` to null', () => {
      store.clearSelection();
      assert.isNull(store.getState().directLinked.directLinkedAnnotationId);
    });

    it('sets `directLinkedGroupId` to null', () => {
      store.clearSelection();
      assert.isNull(store.getState().directLinked.directLinkedGroupId);
    });

    it('sets `sortKey` to default annotation sort key if set to Orphans', () => {
      store.selectTab('orphan');
      store.clearSelection();
      assert.equal(store.getState().selection.sortKey, 'Location');
    });

    it('does not change `selectedTab` if set to something other than Orphans', () => {
      store.selectTab('note');
      store.clearSelection();
      assert.equal(store.getState().selection.selectedTab, 'note');
    });
  });

  describe('#removeAnnotations()', () => {
    it('removes annotations from the current state', () => {
      const annot = defaultAnnotation();
      store.addAnnotations([annot]);
      store.removeAnnotations([annot]);
      assert.deepEqual(store.getState().annotations.annotations, []);
    });

    it('matches annotations to remove by ID', () => {
      store.addAnnotations(fixtures.pair);
      store.removeAnnotations([{ id: fixtures.pair[0].id }]);

      const ids = store.getState().annotations.annotations.map(a => {
        return a.id;
      });
      assert.deepEqual(ids, [fixtures.pair[1].id]);
    });

    it('matches annotations to remove by tag', () => {
      store.addAnnotations(fixtures.pair);
      store.removeAnnotations([{ $tag: fixtures.pair[0].$tag }]);

      const tags = store.getState().annotations.annotations.map(a => {
        return a.$tag;
      });
      assert.deepEqual(tags, [fixtures.pair[1].$tag]);
    });

    it('switches back to the Annotations tab when the last orphan is removed', () => {
      const orphan = Object.assign(defaultAnnotation(), { $orphan: true });
      store.addAnnotations([orphan]);
      store.selectTab('orphan');
      store.removeAnnotations([orphan]);
      assert.equal(store.getState().selection.selectedTab, 'annotation');
    });
  });

  describe('#clearAnnotations()', () => {
    it('removes all annotations', () => {
      const annot = defaultAnnotation();
      store.addAnnotations([annot]);
      store.clearAnnotations();
      assert.deepEqual(store.getState().annotations.annotations, []);
    });
  });

  describe('#updatingAnchorStatus', () => {
    it("updates the annotation's orphan flag", () => {
      const annot = defaultAnnotation();
      store.addAnnotations([annot]);
      store.updateAnchorStatus({ [tagForID(annot.id)]: 'orphan' });
      assert.equal(store.getState().annotations.annotations[0].$orphan, true);
    });
  });
});

describe('useSidebarStore', () => {
  function AnnotationCard({ id }) {
    const store = useSidebarStore();
    const ann = store.findAnnotationByID(id);
    return <div>{ann.text}</div>;
  }

  // `useSidebarStore` is a trivial wrapper, so rather than mock its dependencies,
  // this is a more useful integration test that covers interaction of the store
  // and UI components.
  it('returns wrapper for components to interact with store', () => {
    const store = createSidebarStore({});
    const annot = { ...defaultAnnotation(), text: 'Initial text' };
    store.addAnnotations([annot]);

    const services = {
      get(service) {
        return service === 'store' ? store : null;
      },
    };

    const el = document.createElement('div');
    act(() => {
      render(
        <ServiceContext.Provider value={services}>
          <AnnotationCard id={annot.id} />
        </ServiceContext.Provider>,
        el
      );
    });
    assert.equal(el.innerHTML, '<div>Initial text</div>');

    act(() => {
      const updatedAnnot = { ...annot, text: 'Updated text' };
      store.addAnnotations([updatedAnnot]);
    });
    assert.equal(el.innerHTML, '<div>Updated text</div>');

    render(null, el); // Force unmount and cleanup of subscribers
  });
});
