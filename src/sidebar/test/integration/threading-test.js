import { Injector } from '../../../shared/injector';

import storeFactory from '../../store';
import immutable from '../../util/immutable';
import thread from '../../util/root-thread';

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

  beforeEach(function () {
    const fakeFeatures = {
      flagEnabled: sinon.stub().returns(true),
    };

    const container = new Injector()
      .register('store', storeFactory)
      .register('annotationsService', () => {})
      .register('features', { value: fakeFeatures })
      .register('settings', { value: {} });

    store = container.get('store');
  });

  it('should display newly loaded annotations', function () {
    store.addAnnotations(fixtures.annotations);
    assert.equal(thread(store.threadState()).children.length, 2);
  });

  it('should not display unloaded annotations', function () {
    store.addAnnotations(fixtures.annotations);
    store.removeAnnotations(fixtures.annotations);
    assert.equal(thread(store.threadState()).children.length, 0);
  });

  it('should filter annotations when a search is set', function () {
    store.addAnnotations(fixtures.annotations);
    store.setFilterQuery('second');
    assert.equal(thread(store.threadState()).children.length, 1);
    assert.equal(thread(store.threadState()).children[0].id, '2');
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
      const actualOrder = thread(store.threadState()).children.map(function (
        thread
      ) {
        return thread.annotation.id;
      });
      assert.deepEqual(actualOrder, testCase.expectedOrder);
    });
  });
});
