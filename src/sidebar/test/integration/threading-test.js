import { mount } from 'enzyme';
import { useReducer } from 'preact/hooks';
import { act } from 'preact/test-utils';

import { Injector } from '../../../shared/injector';
import { useRootThread } from '../../components/hooks/use-root-thread';
import { ServiceContext } from '../../service-context';
import { createSidebarStore } from '../../store';

const defaultFields = {
  $orphan: false,
  tags: [],
  target: [{ source: 'https://example.com' }],
  references: [],
  uri: 'https://example.com',
  user: 'acct:foo@hypothes.is',
};

const fixtures = {
  annotations: [
    {
      ...defaultFields,

      created: 50,
      id: '1',
      text: 'first annotation',
      updated: 300,
    },
    {
      ...defaultFields,

      created: 200,
      id: '2',
      text: 'second annotation',
      updated: 200,
    },
    {
      ...defaultFields,

      created: 100,
      id: '3',
      references: ['2'],
      text: 'reply to first annotation',
      updated: 100,
      user: 'acct:bar@hypothes.is',
    },
  ],
};

describe('integration: annotation threading', () => {
  let lastRootThread;
  let store;
  let forceUpdate;

  beforeEach(() => {
    const container = new Injector()
      .register('store', { factory: createSidebarStore })
      .register('annotationsService', () => {})
      .register('settings', { value: {} });

    // Mount a dummy component to be able to use the `useRootThread` hook
    // Do things that cause `useRootThread` to recalculate in the store and
    // test them (hint: use `act`)
    function DummyComponent() {
      lastRootThread = useRootThread();
      [, forceUpdate] = useReducer(x => x + 1, 0);
    }

    store = container.get('store');
    // Wrap the dummy component in a context so that it has access to the store
    mount(
      <ServiceContext.Provider value={container}>
        <DummyComponent />
      </ServiceContext.Provider>
    );
  });

  it('should update root thread only when relevant state changes', () => {
    let prevRootThread = lastRootThread;

    // Make a change which affects the thread.
    act(() => {
      store.addAnnotations(fixtures.annotations);
    });

    assert.notEqual(lastRootThread, prevRootThread);
    prevRootThread = lastRootThread;

    // Re-render the UI without changing any of the data that affects the thread.
    act(() => {
      forceUpdate();
    });
    assert.equal(lastRootThread, prevRootThread);
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

      const actualOrder = lastRootThread.children.map(
        thread => thread.annotation.id
      );
      assert.deepEqual(actualOrder, testCase.expectedOrder);
    });
  });
});
