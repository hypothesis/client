'use strict';

const util = require('../../shared/test/util');
const VirtualThreadList = require('../virtual-thread-list');

const unroll = util.unroll;

describe('VirtualThreadList', function() {
  let lastState;
  let threadList;
  const threadOptions = {
    invisibleThreadFilter: null,
  };

  let fakeScope;
  let fakeScrollRoot;
  let fakeWindow;

  function idRange(start, end) {
    const ary = [];
    for (let i = start; i <= end; i++) {
      ary.push('t' + i.toString());
    }
    return ary;
  }

  function threadIDs(threads) {
    return threads.map(function(thread) {
      return thread.id;
    });
  }

  function generateRootThread(count) {
    return {
      annotation: undefined,
      children: idRange(0, count - 1).map(function(id) {
        return { id: id, annotation: undefined, children: [] };
      }),
    };
  }

  beforeEach(() => {
    VirtualThreadList.$imports.$mock({
      'lodash.debounce': fn => fn,
    });
  });

  afterEach(() => {
    VirtualThreadList.$imports.$restore();
  });

  beforeEach(function() {
    fakeScope = { $digest: sinon.stub() };

    fakeScrollRoot = {
      scrollTop: 0,
      listeners: {},
      addEventListener: function(event, listener) {
        this.listeners[event] = this.listeners[event] || [];
        this.listeners[event].push(listener);
      },
      removeEventListener: function(event, listener) {
        this.listeners[event] = this.listeners[event].filter(function(fn) {
          return fn !== listener;
        });
      },
      trigger: function(event) {
        (this.listeners[event] || []).forEach(function(cb) {
          cb();
        });
      },
    };

    fakeWindow = {
      listeners: {},
      addEventListener: function(event, listener) {
        this.listeners[event] = this.listeners[event] || [];
        this.listeners[event].push(listener);
      },
      removeEventListener: function(event, listener) {
        this.listeners[event] = this.listeners[event].filter(function(fn) {
          return fn !== listener;
        });
      },
      trigger: function(event) {
        (this.listeners[event] || []).forEach(function(cb) {
          cb();
        });
      },
      innerHeight: 100,
    };

    threadOptions.invisibleThreadFilter = sinon.stub().returns(false);
    threadOptions.scrollRoot = fakeScrollRoot;

    const rootThread = { annotation: undefined, children: [] };
    threadList = new VirtualThreadList(
      fakeScope,
      fakeWindow,
      rootThread,
      threadOptions
    );
    threadList.on('changed', function(state) {
      lastState = state;
    });
  });

  unroll(
    'generates expected state when #when',
    function(testCase) {
      const thread = generateRootThread(testCase.threads);

      fakeScrollRoot.scrollTop = testCase.scrollOffset;
      fakeWindow.innerHeight = testCase.windowHeight;

      // make sure for everything that is not being presented in the
      // visible viewport, we pass it to this function.
      threadOptions.invisibleThreadFilter.returns(true);

      threadList.setRootThread(thread);

      const visibleIDs = threadIDs(lastState.visibleThreads);
      const invisibleIDs = threadIDs(lastState.invisibleThreads);
      assert.deepEqual(visibleIDs, testCase.expectedVisibleThreads);
      assert.equal(
        invisibleIDs.length,
        testCase.threads - testCase.expectedVisibleThreads.length
      );
      assert.equal(
        lastState.offscreenUpperHeight,
        testCase.expectedHeightAbove
      );
      assert.equal(
        lastState.offscreenLowerHeight,
        testCase.expectedHeightBelow
      );
    },
    [
      {
        when: 'scrollRoot is scrolled to top of list',
        threads: 100,
        scrollOffset: 0,
        windowHeight: 300,
        expectedVisibleThreads: idRange(0, 5),
        expectedHeightAbove: 0,
        expectedHeightBelow: 18800,
      },
      {
        when: 'scrollRoot is scrolled to middle of list',
        threads: 100,
        scrollOffset: 2000,
        windowHeight: 300,
        expectedVisibleThreads: idRange(5, 15),
        expectedHeightAbove: 1000,
        expectedHeightBelow: 16800,
      },
      {
        when: 'scrollRoot is scrolled to bottom of list',
        threads: 100,
        scrollOffset: 18800,
        windowHeight: 300,
        expectedVisibleThreads: idRange(89, 99),
        expectedHeightAbove: 17800,
        expectedHeightBelow: 0,
      },
    ]
  );

  it('recalculates when a window.resize occurs', function() {
    lastState = null;
    fakeWindow.trigger('resize');
    assert.ok(lastState);
  });

  it('recalculates when a scrollRoot.scroll occurs', function() {
    lastState = null;
    fakeScrollRoot.trigger('scroll');
    assert.ok(lastState);
  });

  it('recalculates when root thread changes', function() {
    threadList.setRootThread({ annotation: undefined, children: [] });
    assert.ok(lastState);
  });

  describe('#setThreadHeight', function() {
    unroll(
      'affects visible threads',
      function(testCase) {
        const thread = generateRootThread(10);
        fakeWindow.innerHeight = 500;
        fakeScrollRoot.scrollTop = 0;
        idRange(0, 10).forEach(function(id) {
          threadList.setThreadHeight(id, testCase.threadHeight);
        });
        threadList.setRootThread(thread);
        assert.deepEqual(
          threadIDs(lastState.visibleThreads),
          testCase.expectedVisibleThreads
        );
      },
      [
        {
          threadHeight: 1000,
          expectedVisibleThreads: idRange(0, 1),
        },
        {
          threadHeight: 300,
          expectedVisibleThreads: idRange(0, 4),
        },
      ]
    );
  });

  describe('#detach', function() {
    it('stops listening to window.resize events', function() {
      threadList.detach();
      lastState = null;
      fakeWindow.trigger('resize');
      assert.isNull(lastState);
    });
    it('stops listening to scrollRoot.scroll events', function() {
      threadList.detach();
      lastState = null;
      fakeScrollRoot.trigger('scroll');
      assert.isNull(lastState);
    });
  });

  describe('#yOffsetOf', function() {
    unroll(
      'returns #offset as the Y offset of the #nth thread',
      function(testCase) {
        const thread = generateRootThread(10);
        threadList.setRootThread(thread);
        idRange(0, 10).forEach(function(id) {
          threadList.setThreadHeight(id, 100);
        });
        const id = idRange(testCase.index, testCase.index)[0];
        assert.equal(threadList.yOffsetOf(id), testCase.offset);
      },
      [
        {
          nth: 'first',
          index: 0,
          offset: 0,
        },
        {
          nth: 'second',
          index: 1,
          offset: 100,
        },
        {
          nth: 'last',
          index: 9,
          offset: 900,
        },
      ]
    );
  });
});
