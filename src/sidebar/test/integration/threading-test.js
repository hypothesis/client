import { mount } from 'enzyme';
import { createElement } from 'preact';
import { act } from 'preact/test-utils';

import { Injector } from '../../../shared/injector';
import storeFactory from '../../store';

import { ServiceContext } from '../../util/service-context';
import useRootThread from '../../components/hooks/use-root-thread';

const fixtures = {
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
};

describe('integration: annotation threading', () => {
  let lastRootThread;
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

    // Mount a dummy component to be able to use the `useRootThread` hook
    // Do things that cause `useRootThread` to recalculate in the store and
    // test them (hint: use `act`)
    function DummyComponent() {
      lastRootThread = useRootThread();
    }

    store = container.get('store');
    // Wrap the dummy component in a context so that it has access to the store
    mount(
      <ServiceContext.Provider value={container}>
        <DummyComponent />
      </ServiceContext.Provider>
    );
  });

  it('should display newly loaded annotations', () => {
    act(() => {
      store.addAnnotations(fixtures.annotations);
    });

    assert.equal(lastRootThread.children.length, 2);
  });

  it('should not display unloaded annotations', () => {
    act(() => {
      store.addAnnotations(fixtures.annotations);
      store.removeAnnotations(fixtures.annotations);
    });
    assert.equal(lastRootThread.children.length, 0);
  });

  it('should filter annotations when a search is set', () => {
    act(() => {
      store.addAnnotations(fixtures.annotations);
      store.setFilterQuery('second');
    });

    assert.equal(lastRootThread.children.length, 1);
    assert.equal(lastRootThread.children[0].id, '2');
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
    it(`should sort annotations by ${testCase.sortKey}`, () => {
      act(() => {
        store.addAnnotations(fixtures.annotations);
        store.setSortKey(testCase.sortKey);
      });

      const actualOrder = lastRootThread.children.map(thread => {
        return thread.annotation.id;
      });
      assert.deepEqual(actualOrder, testCase.expectedOrder);
    });
  });
});
