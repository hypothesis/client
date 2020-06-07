import { Injector } from '../../../shared/injector';

import rootThreadFactory from '../../services/root-thread';
import searchFilterFactory from '../../services/search-filter';
import viewFilterFactory from '../../services/view-filter';
import storeFactory from '../../store';
import immutable from '../../util/immutable';

const fixtures = immutable({
  annotations: [
    {
      $orphan: false,
      id: '1',
      references: [],
      target: [{ selector: [] }],
      text: 'first annotation',
      updated: 50,
    },
    {
      $orphan: false,
      id: '2',
      references: [],
      text: 'second annotation',
      target: [{ selector: [] }],
      updated: 200,
    },
    {
      $orphan: false,
      id: '3',
      references: ['2'],
      text: 'reply to first annotation',
      updated: 100,
    },
  ],
});

describe('annotation threading', function () {
  let store;
  let rootThread;

  beforeEach(function () {
    const fakeUnicode = {
      normalize: function (s) {
        return s;
      },
      fold: function (s) {
        return s;
      },
    };

    const fakeFeatures = {
      flagEnabled: sinon.stub().returns(true),
    };

    const container = new Injector()
      .register('store', storeFactory)
      .register('rootThread', rootThreadFactory)
      .register('searchFilter', searchFilterFactory)
      .register('annotationsService', () => {})
      .register('viewFilter', viewFilterFactory)
      .register('features', { value: fakeFeatures })
      .register('settings', { value: {} })
      .register('unicode', { value: fakeUnicode });

    store = container.get('store');
    rootThread = container.get('rootThread');
  });

  it('should display newly loaded annotations', function () {
    store.addAnnotations(fixtures.annotations);
    assert.equal(rootThread.thread(store.getState()).children.length, 2);
  });

  it('should not display unloaded annotations', function () {
    store.addAnnotations(fixtures.annotations);
    store.removeAnnotations(fixtures.annotations);
    assert.equal(rootThread.thread(store.getState()).children.length, 0);
  });

  it('should filter annotations when a search is set', function () {
    store.addAnnotations(fixtures.annotations);
    store.setFilterQuery('second');
    assert.equal(rootThread.thread(store.getState()).children.length, 1);
    assert.equal(rootThread.thread(store.getState()).children[0].id, '2');
  });

  [
    {
      sortKey: 'Oldest',
      expectedOrder: ['1', '2'],
    },
    {
      sortKey: 'Newest',
      expectedOrder: ['2', '1'],
    },
  ].forEach(testCase => {
    it(`should sort annotations by ${testCase.mode}`, () => {
      store.addAnnotations(fixtures.annotations);
      store.setSortKey(testCase.sortKey);
      const actualOrder = rootThread
        .thread(store.getState())
        .children.map(function (thread) {
          return thread.annotation.id;
        });
      assert.deepEqual(actualOrder, testCase.expectedOrder);
    });
  });
});
