import { delay, waitFor } from '@hypothesis/frontend-testing';
import sinon from 'sinon';

import { EventEmitter } from '../../shared/event-emitter';
import { DrawError } from '../draw-tool';
import { Guest, $imports } from '../guest';

class FakeAdder {
  constructor(container, options) {
    FakeAdder.instance = this;

    this.hide = sinon.stub();
    this.show = sinon.stub();
    this.destroy = sinon.stub();
    this.options = options;
  }
}
FakeAdder.instance = null;

class FakeTextRange {
  constructor(range) {
    this.range = range;
  }

  toRange() {
    return this.range;
  }

  static fromRange(range) {
    return new FakeTextRange(range);
  }
}

describe('Guest', () => {
  const sandbox = sinon.createSandbox();
  let guests;
  let hostFrame;
  let notifySelectionChanged;
  let rangeUtil;

  let FakeBucketBarClient;
  let fakeBucketBarClient;
  let FakeDrawTool;
  let fakeDrawTool;
  let FakeHighlighter;
  let fakeHighlighter;
  let fakeHighlightClusterController;
  let FakeHighlightClusterController;
  let fakeCreateIntegration;
  let fakeFrameFillsAncestor;
  let fakeIntegration;
  let fakePortFinder;
  let FakePortRPC;
  let fakePortRPCs;
  let fakeOutsideAssignmentNotice;
  let fakeSetAllShortcuts;
  let FakeOutsideAssignmentNoticeController;
  let fakeIsMacOS;

  const createGuest = (config = {}) => {
    const element = document.createElement('div');
    const guest = new Guest(element, config, hostFrame);
    guests.push(guest);
    return guest;
  };

  // Helpers for getting the channels used for guest <-> host/sidebar communication.
  // These currently rely on knowing the implementation detail of which order
  // the channels are created in.

  const hostRPC = () => {
    return fakePortRPCs[0];
  };

  const sidebarRPC = () => {
    return fakePortRPCs[1];
  };

  // Simulate event from host frame.
  //
  // Returns the result of the guest's event handler. That result would normally
  // not be used, but is useful as a way for the guest to indicate to tests
  // when async handling is done, by returning a promise.
  const emitHostEvent = (event, ...args) => {
    const [, callback] = hostRPC().on.args.find(args => args[0] === event);
    return callback?.(...args);
  };

  const emitSidebarEvent = (event, ...args) => {
    for (const [evt, fn] of sidebarRPC().on.args) {
      if (event === evt) {
        fn(...args);
      }
    }
  };

  const simulateSelectionWithText = () => {
    rangeUtil.selectionFocusRect.returns({
      left: 0,
      top: 0,
      width: 5,
      height: 5,
    });

    const element = document.createElement('div');
    element.textContent = 'foobar';
    const range = new Range();
    range.selectNodeContents(element);

    rangeUtil.selectedRange.returns(range);
    notifySelectionChanged(range);
  };

  const simulateSelectionWithoutText = () => {
    rangeUtil.selectionFocusRect.returns(null);

    const element = document.createElement('div');
    const range = new Range();
    range.selectNodeContents(element);

    rangeUtil.selectedRange.returns(range);
    notifySelectionChanged(range);
  };

  beforeEach(() => {
    guests = [];
    fakeHighlighter = {
      getHighlightsFromPoint: sinon.stub().returns([]),
      highlightRange: sinon.stub().returns([]),
      highlightShape: sinon.stub().returns([]),
      removeHighlights: sinon.stub(),
      removeAllHighlights: sinon.stub(),
      setHighlightsFocused: sinon.stub(),
      setHighlightsVisible: sinon.stub(),
    };
    FakeHighlighter = sinon.stub().returns(fakeHighlighter);
    hostFrame = {
      postMessage: sinon.stub(),
    };
    notifySelectionChanged = null;
    rangeUtil = {
      itemsForRange: sinon.stub().returns([]),
      isSelectionBackwards: sinon.stub(),
      selectionFocusRect: sinon.stub(),
      selectedRange: sinon.stub().returns(null),
    };

    FakeAdder.instance = null;

    fakePortRPCs = [];
    FakePortRPC = sinon.stub().callsFake(() => {
      const rpc = {
        call: sinon.stub(),
        connect: sinon.stub(),
        destroy: sinon.stub(),
        disconnect: sinon.stub(),
        on: sinon.stub(),
      };
      fakePortRPCs.push(rpc);
      return rpc;
    });

    fakeBucketBarClient = {
      destroy: sinon.stub(),
      update: sinon.stub(),
    };
    FakeBucketBarClient = sinon.stub().returns(fakeBucketBarClient);

    fakeDrawTool = {
      cancel: sinon.stub(),
      destroy: sinon.stub(),
      draw: sinon.stub().resolves({ type: 'point', x: 0, y: 0 }),
      getKeyboardModeState: sinon.stub().returns({ keyboardActive: false }),
      setOnKeyboardModeChange: sinon.stub(),
      setKeyboardMode: sinon.stub(),
    };
    FakeDrawTool = sinon.stub().returns(fakeDrawTool);

    fakeHighlightClusterController = {
      destroy: sinon.stub(),
    };
    FakeHighlightClusterController = sinon
      .stub()
      .returns(fakeHighlightClusterController);

    fakeFrameFillsAncestor = sinon.stub().returns(true);

    fakeIntegration = Object.assign(new EventEmitter(), {
      anchor: sinon.stub(),
      getAnnotatableRange: sinon.stub().returnsArg(0),
      canStyleClusteredHighlights: sinon.stub().returns(false),
      contentContainer: sinon.stub().returns({}),
      describe: sinon.stub(),
      destroy: sinon.stub(),
      fitSideBySide: sinon.stub().returns(false),
      getMetadata: sinon.stub().resolves({
        title: 'Test title',
        documentFingerprint: 'test-fingerprint',
      }),
      navigateToSegment: sinon.stub(),
      scrollToAnchor: sinon.stub().resolves(),
      showContentInfo: sinon.stub(),
      sideBySideActive: sinon.stub().returns(false),
      supportedTools: sinon.stub().returns(['selection']),
      uri: sinon.stub().resolves('https://example.com/test.pdf'),
    });

    fakeCreateIntegration = sinon.stub().returns(fakeIntegration);

    fakePortFinder = {
      discover: sinon.stub().resolves({}),
      destroy: sinon.stub(),
    };

    fakeOutsideAssignmentNotice = {
      destroy: sinon.stub(),
      setVisible: sinon.stub(),
    };
    fakeSetAllShortcuts = sinon.stub();

    FakeOutsideAssignmentNoticeController = sinon
      .stub()
      .returns(fakeOutsideAssignmentNotice);

    class FakeSelectionObserver {
      constructor(callback) {
        notifySelectionChanged = callback;
        this.disconnect = sinon.stub();
      }
    }

    fakeIsMacOS = sinon.stub().returns(false);

    $imports.$mock({
      '../shared/messaging': {
        PortFinder: sinon.stub().returns(fakePortFinder),
        PortRPC: FakePortRPC,
      },
      '../shared/shortcut-config': {
        setAllShortcuts: fakeSetAllShortcuts,
      },
      './adder': { Adder: FakeAdder },
      './anchoring/text-range': {
        TextRange: FakeTextRange,
      },
      './bucket-bar-client': {
        BucketBarClient: FakeBucketBarClient,
      },
      './draw-tool': {
        DrawTool: FakeDrawTool,
      },
      './highlight-clusters': {
        HighlightClusterController: FakeHighlightClusterController,
      },
      './highlighter': {
        Highlighter: FakeHighlighter,
      },
      './integrations': {
        createIntegration: fakeCreateIntegration,
      },
      './range-util': rangeUtil,
      './outside-assignment-notice': {
        OutsideAssignmentNoticeController:
          FakeOutsideAssignmentNoticeController,
      },
      './selection-observer': {
        SelectionObserver: FakeSelectionObserver,
      },
      './util/frame': {
        frameFillsAncestor: fakeFrameFillsAncestor,
      },
      '../shared/user-agent': {
        isMacOS: fakeIsMacOS,
      },
    });
  });

  afterEach(() => {
    guests.forEach(guest => guest.destroy());
    sandbox.restore();
    $imports.$restore();
  });

  describe('events from host frame', () => {
    describe('on "sidebarLayoutChanged" event', () => {
      it('calls fitSideBySide if guest frame fills host frame', () => {
        createGuest();
        const dummyLayout = {};
        fakeFrameFillsAncestor.withArgs(window, hostFrame).returns(true);

        emitHostEvent('sidebarLayoutChanged', dummyLayout);

        assert.calledWith(fakeFrameFillsAncestor, window, hostFrame);
        assert.calledWith(fakeIntegration.fitSideBySide, dummyLayout);
      });

      it('does not call fitSideBySide if guest frame does not fill host frame', () => {
        createGuest({ subFrameIdentifier: 'dummy' });
        const dummyLayout = {};
        fakeFrameFillsAncestor.withArgs(window, hostFrame).returns(false);

        emitHostEvent('sidebarLayoutChanged', dummyLayout);

        assert.notCalled(fakeIntegration.fitSideBySide);
      });

      it('emits a "hypothesis:layoutchange" DOM event', () => {
        const guest = createGuest();
        const dummyLayout = {
          expanded: true,
          width: 100,
          height: 300,
          toolbarWidth: 10,
        };
        const listener = sinon.stub();

        guest.element.addEventListener('hypothesis:layoutchange', listener);

        emitHostEvent('sidebarLayoutChanged', dummyLayout);

        assert.calledWith(
          listener,
          sinon.match({
            detail: sinon.match({
              sidebarLayout: dummyLayout,
            }),
          }),
        );
      });
    });

    describe('on "hoverAnnotations" event', () => {
      it('focus on annotations', () => {
        const guest = createGuest();
        sandbox.stub(guest, '_hoverAnnotations').callThrough();
        const tags = ['t1', 't2'];
        sidebarRPC().call.resetHistory();

        emitHostEvent('hoverAnnotations', tags);

        assert.calledWith(guest._hoverAnnotations, tags);
        assert.calledWith(sidebarRPC().call, 'hoverAnnotations', tags);
      });
    });

    describe('on "selectAnnotations" event', () => {
      it('selects annotations', () => {
        const guest = createGuest();
        sandbox.stub(guest, 'selectAnnotations').callThrough();
        const tags = ['t1', 't2'];
        const toggle = true;
        sidebarRPC().call.resetHistory();

        emitHostEvent('selectAnnotations', tags, toggle);

        assert.calledWith(guest.selectAnnotations, tags, { toggle });
        assert.calledWith(sidebarRPC().call, 'openSidebar');
      });
    });
  });

  describe('on "scrollToAnnotation" event from host or sidebar', () => {
    const setupGuest = ({ region = new FakeTextRange(new Range()) } = {}) => {
      const highlight = document.createElement('span');
      const guest = createGuest();
      guest.anchors = [
        {
          annotation: { $tag: 'tag1' },
          highlights: [highlight],
          region,
        },
      ];
      return guest;
    };

    ['host', 'sidebar'].forEach(source => {
      const triggerScroll = async () => {
        if (source === 'sidebar') {
          emitSidebarEvent('scrollToAnnotation', 'tag1');
        } else {
          emitHostEvent('scrollToAnnotation', 'tag1');
        }

        // The call to `scrollToAnchor` on the integration happens
        // asynchronously. Wait for the minimum delay before this happens.
        await delay(0);
      };

      it('scrolls to range anchor with the matching tag', async () => {
        const guest = setupGuest();
        await triggerScroll();
        assert.calledWith(fakeIntegration.scrollToAnchor, guest.anchors[0]);
      });

      it('scrolls to shape anchor with the matching tag', async () => {
        const guest = setupGuest({
          region: {
            anchor: document.createElement('div'),
            shape: { type: 'point', x: 0, y: 0 },
          },
        });
        await triggerScroll();
        assert.calledWith(fakeIntegration.scrollToAnchor, guest.anchors[0]);
      });

      it('emits a "scrolltorange" DOM event', () => {
        const highlight = document.createElement('span');
        const guest = createGuest();
        const fakeRange = document.createRange();
        guest.anchors = [
          {
            annotation: { $tag: 'tag1' },
            highlights: [highlight],
            region: new FakeTextRange(fakeRange),
          },
        ];

        return new Promise(resolve => {
          guest.element.addEventListener('scrolltorange', event => {
            assert.equal(event.detail, fakeRange);
            resolve();
          });

          emitSidebarEvent('scrollToAnnotation', 'tag1');
        });
      });

      it('defers scrolling if "scrolltorange" event\'s `waitUntil` method is called', async () => {
        const guest = setupGuest();
        let contentReady;
        const listener = event => {
          event.waitUntil(
            new Promise(resolve => {
              contentReady = resolve;
            }),
          );
        };
        guest.element.addEventListener('scrolltorange', listener);

        // Trigger scroll. `scrollToAnchor` shouldn't be called immediately
        // because `ScrollToRangeEvent.waitUntil` was used to defer scrolling.
        await triggerScroll();
        assert.notCalled(fakeIntegration.scrollToAnchor);

        // Resolve promise passed to `ScrollToRangeEvent.waitUntil`.
        contentReady();
        await delay(0);

        assert.calledWith(fakeIntegration.scrollToAnchor, guest.anchors[0]);
      });

      it('allows the default scroll behaviour to be prevented', async () => {
        const guest = setupGuest();
        guest.element.addEventListener('scrolltorange', event =>
          event.preventDefault(),
        );

        await triggerScroll();

        assert.notCalled(fakeIntegration.scrollToAnchor);
      });

      it('does nothing if the anchor has no highlights', async () => {
        const guest = createGuest();

        guest.anchors = [{ annotation: { $tag: 'tag1' } }];
        await triggerScroll();

        assert.notCalled(fakeIntegration.scrollToAnchor);
      });

      it("does nothing if the anchor's range cannot be resolved", async () => {
        const highlight = document.createElement('span');
        const guest = createGuest();
        guest.anchors = [
          {
            annotation: { $tag: 'tag1' },
            highlights: [highlight],
            region: {
              toRange: sandbox.stub().throws(new Error('Something went wrong')),
            },
          },
        ];
        const eventEmitted = sandbox.stub();
        guest.element.addEventListener('scrolltorange', eventEmitted);

        await triggerScroll();

        assert.notCalled(eventEmitted);
        assert.notCalled(fakeIntegration.scrollToAnchor);
      });
    });
  });

  describe('events from sidebar frame', () => {
    describe('on "hoverAnnotations" event', () => {
      it('marks associated highlights as focused', () => {
        const highlight0 = document.createElement('span');
        const highlight1 = document.createElement('span');
        const guest = createGuest();
        guest.anchors = [
          { annotation: { $tag: 'tag1' }, highlights: [highlight0] },
          { annotation: { $tag: 'tag2' }, highlights: [highlight1] },
        ];

        emitSidebarEvent('hoverAnnotations', ['tag1']);

        assert.calledWith(
          fakeHighlighter.setHighlightsFocused,
          guest.anchors[0].highlights,
          true,
        );
      });

      it('marks highlights of other annotations as not focused', () => {
        const highlight0 = document.createElement('span');
        const highlight1 = document.createElement('span');
        const guest = createGuest();
        guest.anchors = [
          { annotation: { $tag: 'tag1' }, highlights: [highlight0] },
          { annotation: { $tag: 'tag2' }, highlights: [highlight1] },
        ];

        emitSidebarEvent('hoverAnnotations', ['tag1']);

        assert.calledWith(
          fakeHighlighter.setHighlightsFocused,
          guest.anchors[1].highlights,
          false,
        );
      });

      it('updates hovered tag set', () => {
        const guest = createGuest();

        emitSidebarEvent('hoverAnnotations', ['tag1']);
        emitSidebarEvent('hoverAnnotations', ['tag2', 'tag3']);

        assert.deepEqual([...guest.hoveredAnnotationTags], ['tag2', 'tag3']);
      });
    });

    describe('on "navigateToSegment" event', () => {
      it('requests integration to navigate to segment associated with annotation', () => {
        createGuest();
        const annotation = {};
        emitSidebarEvent('navigateToSegment', annotation);
        assert.calledWith(fakeIntegration.navigateToSegment, annotation);
      });
    });

    describe('on "setHighlightsVisible" event', () => {
      it('sets visibility of highlights in document', () => {
        createGuest();

        emitSidebarEvent('setHighlightsVisible', true);
        assert.calledWith(fakeHighlighter.setHighlightsVisible, true);

        emitSidebarEvent('setHighlightsVisible', false);
        assert.calledWith(fakeHighlighter.setHighlightsVisible, false);
      });
    });

    describe('on "shortcutsUpdated" event', () => {
      it('updates guest shortcut config', () => {
        createGuest();
        const shortcuts = { applyUpdates: 'k' };

        emitSidebarEvent('shortcutsUpdated', shortcuts);

        assert.calledWith(fakeSetAllShortcuts, shortcuts);
      });
    });

    describe('on "loadAnnotations" event', () => {
      it('anchors annotations', async () => {
        createGuest();
        const ann1 = { target: [], uri: 'uri', $tag: 'tag1' };
        const ann2 = { target: [], uri: 'uri', $tag: 'tag2' };

        emitSidebarEvent('loadAnnotations', [ann1, ann2]);
        await delay(0);

        assert.calledWith(
          sidebarRPC().call,
          'syncAnchoringStatus',
          sinon.match({ target: [], uri: 'uri', $tag: 'tag1' }),
        );
        assert.calledWith(
          sidebarRPC().call,
          'syncAnchoringStatus',
          sinon.match({ target: [], uri: 'uri', $tag: 'tag2' }),
        );
      });
    });

    describe('on "createAnnotation" event', () => {
      it('creates an annotation if `tool` is "selection"', async () => {
        createGuest();
        hostRPC().call.resetHistory();

        emitHostEvent('createAnnotation', { tool: 'selection' });
        await delay(0);

        assert.notCalled(hostRPC().call);
        assert.calledWith(sidebarRPC().call, 'createAnnotation');
      });

      ['canceled', 'restarted'].forEach(kind => {
        it('does not create annotation if `tool` is "rect" and drawing is canceled', async () => {
          createGuest();
          fakeDrawTool.draw.rejects(new DrawError(kind));
          const annotation = await emitHostEvent('createAnnotation', {
            tool: 'rect',
          });
          assert.isNull(annotation);
          assert.notCalled(sidebarRPC().call);
        });
      });

      it('throws if unexpected error occurs during drawing', async () => {
        const expectedError = new Error('Oh no');
        createGuest();
        fakeDrawTool.draw.rejects(expectedError);

        let err;
        try {
          await emitHostEvent('createAnnotation', { tool: 'rect' });
        } catch (e) {
          err = e;
        }

        assert.equal(err, expectedError);
      });

      it('creates annotation if `tool` is "rect"', async () => {
        const guest = createGuest();
        hostRPC().call.resetHistory();

        const rectShape = {
          type: 'rect',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
        };
        const rectSelectors = [
          {
            type: 'ShapeSelector',
            shape: rectShape,
          },
        ];
        fakeDrawTool.draw.resolves(rectShape);
        fakeIntegration.describe.resolves(rectSelectors);

        const anchorSpy = sinon.spy(guest, 'anchor');
        const annotation = await emitHostEvent('createAnnotation', {
          tool: 'rect',
        });
        assert.calledWith(hostRPC().call, 'activeToolChanged', 'rect');
        assert.calledWith(fakeDrawTool.draw, 'rect');
        assert.calledWith(fakeIntegration.describe, guest.element, rectShape);
        assert.calledWith(hostRPC().call, 'activeToolChanged', null);
        assert.calledWith(anchorSpy, annotation);

        assert.calledWith(
          sidebarRPC().call,
          'createAnnotation',
          sinon.match({
            target: [
              sinon.match({
                selector: rectSelectors,
              }),
            ],
          }),
        );
      });

      it('creates annotation if `tool` is "point"', async () => {
        const guest = createGuest();
        hostRPC().call.resetHistory();

        const pointShape = { type: 'point', x: 0, y: 0 };
        const pointSelectors = [
          {
            type: 'ShapeSelector',
            shape: pointShape,
          },
        ];
        fakeDrawTool.draw.resolves(pointShape);
        fakeIntegration.describe.resolves(pointSelectors);

        const anchorSpy = sinon.spy(guest, 'anchor');
        const annotation = await emitHostEvent('createAnnotation', {
          tool: 'point',
        });
        assert.calledWith(hostRPC().call, 'activeToolChanged', 'point');
        assert.calledWith(fakeDrawTool.draw, 'point');
        assert.calledWith(fakeIntegration.describe, guest.element, pointShape);
        assert.calledWith(anchorSpy, annotation);
        assert.calledWith(hostRPC().call, 'activeToolChanged', null);

        assert.calledWith(
          sidebarRPC().call,
          'createAnnotation',
          sinon.match({
            target: [
              sinon.match({
                selector: pointSelectors,
              }),
            ],
          }),
        );
      });

      it('does not reset active tool if drawing is canceled by subsequent `createAnnotation` call', async () => {
        createGuest();

        // Simulate draw call failing due to a new `createAnnotation` call
        // being made while this one is in progress.
        fakeDrawTool.draw.rejects(new DrawError('restarted'));
        emitHostEvent('createAnnotation', { tool: 'point' }).catch(() => {
          // Ignore error
        });
        // Allow async cancelation to propagate.
        await delay(0);

        const toolChangedCalls = hostRPC()
          .call.getCalls()
          .filter(c => c.args[0] === 'activeToolChanged')
          .map(call => call.args[1]);
        assert.deepEqual(toolChangedCalls, ['point']);
      });

      it('cancels annotation creation if tool is `null`', async () => {
        createGuest();
        emitHostEvent('createAnnotation', {
          tool: 'point',
        });
        emitHostEvent('createAnnotation', { tool: null });
        assert.calledOnce(fakeDrawTool.cancel);
      });

      it('reports error if annotation tool is unsupported', async () => {
        createGuest();

        let err;
        try {
          await emitHostEvent('createAnnotation', { tool: 'star' });
        } catch (e) {
          err = e;
        }

        assert.instanceOf(err, Error);
        assert.equal(err.message, 'Unsupported annotation tool');
      });
    });

    describe('on "setKeyboardMode" event', () => {
      it('calls draw tool setKeyboardMode when host sends mode', () => {
        createGuest();
        emitHostEvent('setKeyboardMode', { mode: 'resize' });
        assert.calledWith(fakeDrawTool.setKeyboardMode, 'resize');
      });
    });

    describe('keyboard mode change notification', () => {
      it('calls hostRPC keyboardModeChanged when draw tool notifies', () => {
        createGuest();
        const callback = fakeDrawTool.setOnKeyboardModeChange.firstCall.args[0];
        callback({ keyboardActive: true, keyboardMode: 'resize' });
        assert.calledWith(hostRPC().call, 'keyboardModeChanged', {
          keyboardActive: true,
          keyboardMode: 'resize',
        });
      });
    });

    describe('on "activateMoveMode" event', () => {
      it('starts rect annotation with move mode when keyboard not active', async () => {
        fakeDrawTool.getKeyboardModeState.returns({ keyboardActive: false });
        fakeDrawTool.draw.resolves({
          type: 'rect',
          left: 0,
          top: 0,
          right: 10,
          bottom: 10,
        });
        fakeIntegration.describe.resolves([
          { type: 'FragmentSelector', value: '' },
        ]);

        createGuest();
        emitHostEvent('activateMoveMode');
        await delay(0);

        assert.calledWith(fakeDrawTool.draw, 'rect', 'move');
      });

      it('clears pending mode when createAnnotation rejects', async () => {
        fakeDrawTool.getKeyboardModeState.returns({ keyboardActive: false });
        fakeDrawTool.draw.rejects(new DrawError('canceled'));

        const guest = createGuest();
        emitHostEvent('activateMoveMode');
        // Wait for the promise rejection and catch handler to execute (line 1086)
        await delay(10);

        assert.calledWith(fakeDrawTool.draw, 'rect');
        // Verify that _pendingKeyboardMode was cleared after error (line 1086)
        assert.isUndefined(guest._pendingKeyboardMode);
        // Second activateMoveMode should still work (state was cleared)
        fakeDrawTool.draw.resetHistory();
        emitHostEvent('activateMoveMode');
        await delay(0);
        assert.calledWith(fakeDrawTool.draw, 'rect');
      });

      it('switches to move mode when keyboard already active', () => {
        fakeDrawTool.getKeyboardModeState.returns({ keyboardActive: true });

        createGuest();
        emitHostEvent('activateMoveMode');

        assert.calledWith(fakeDrawTool.setKeyboardMode, 'move');
      });
    });

    describe('on "activatePointMoveMode" event', () => {
      it('starts point annotation with move mode when keyboard not active', async () => {
        fakeDrawTool.getKeyboardModeState.returns({ keyboardActive: false });
        fakeDrawTool.draw.resolves({ type: 'point', x: 50, y: 50 });
        fakeIntegration.describe.resolves([
          { type: 'FragmentSelector', value: '' },
        ]);

        createGuest();
        emitHostEvent('activatePointMoveMode');
        await delay(0);

        assert.calledWith(fakeDrawTool.draw, 'point', 'move');
      });

      it('switches to move mode when keyboard already active', () => {
        fakeDrawTool.getKeyboardModeState.returns({ keyboardActive: true });

        createGuest();
        emitHostEvent('activatePointMoveMode');

        assert.calledWith(fakeDrawTool.setKeyboardMode, 'move');
      });

      it('clears pending mode when createAnnotation rejects', async () => {
        fakeDrawTool.getKeyboardModeState.returns({ keyboardActive: false });
        fakeDrawTool.draw.rejects(new DrawError('canceled'));

        const guest = createGuest();
        emitHostEvent('activatePointMoveMode');
        // Wait for the promise rejection and catch handler to execute (line 1086)
        await delay(10);

        assert.calledWith(fakeDrawTool.draw, 'point');
        // Verify that _pendingKeyboardMode was cleared after error (line 1086)
        assert.isUndefined(guest._pendingKeyboardMode);
      });
    });

    describe('on "deleteAnnotation" event', () => {
      it('detaches annotation', () => {
        createGuest();

        emitSidebarEvent('deleteAnnotation', 'tag1');

        assert.calledOnce(fakeBucketBarClient.update);
      });
    });

    describe('on "getDocumentInfo" event', () => {
      it('gets guest document info', async () => {
        const callback = sinon.stub();

        createGuest();
        emitSidebarEvent('getDocumentInfo', callback);

        await waitFor(() => callback.called);

        assert.calledWith(
          callback,
          sinon.match({
            uri: 'https://example.com/test.pdf',
            metadata: {
              title: 'Test title',
              documentFingerprint: 'test-fingerprint',
            },
          }),
        );
        assert.called(fakeIntegration.uri);
        assert.called(fakeIntegration.getMetadata);
      });
    });

    describe('on "featureFlagsUpdated" event', () => {
      it('updates active feature flags', () => {
        const flagsUpdated = sinon.stub();
        const guest = createGuest();
        guest.features.on('flagsChanged', flagsUpdated);

        emitSidebarEvent('featureFlagsUpdated', {
          some_flag: true,
          other_flag: false,
        });

        assert.calledOnce(flagsUpdated);
        assert.deepEqual(guest.features.allFlags(), {
          some_flag: true,
          other_flag: false,
        });
      });
    });

    describe('on "showContentInfo" event', () => {
      const contentInfo = {
        logo: {},
        item: { title: 'Some article' },
        links: {},
      };

      it('triggers display of content info in integration', () => {
        createGuest();
        emitSidebarEvent('showContentInfo', contentInfo);
        assert.calledWith(fakeIntegration.showContentInfo, contentInfo);
      });

      it('does nothing if integration does not support content info display', () => {
        createGuest();
        fakeIntegration.showContentInfo = null;
        emitSidebarEvent('showContentInfo', contentInfo);
      });
    });

    describe('on "setOutsideAssignmentNoticeVisible" event', () => {
      [true, false].forEach(arg => {
        it('shows notice if argument is `true`', () => {
          createGuest();
          emitSidebarEvent('setOutsideAssignmentNoticeVisible', arg);
          assert.calledWith(fakeOutsideAssignmentNotice.setVisible, arg);
        });
      });
    });

    describe('on "renderThumbnail" event', () => {
      const makeCallback = () => {
        const { promise, resolve, reject } = Promise.withResolvers();
        const callback = result =>
          result.ok ? resolve(result.value) : reject(result.error);
        return { promise, callback };
      };

      it('returns error if thumbnail rendering is not supported', async () => {
        createGuest();
        const { callback, promise } = makeCallback();
        emitSidebarEvent('renderThumbnail', 'ann123', {}, callback);

        let err;
        try {
          await promise;
        } catch (e) {
          err = e;
        }
        assert.equal(
          err,
          'Thumbnail rendering not supported for document type',
        );
      });

      it('returns error if annotation is not anchored', async () => {
        fakeIntegration.renderToBitmap = sinon.stub().resolves({});
        createGuest();
        const { callback, promise } = makeCallback();

        emitSidebarEvent('renderThumbnail', 'ann123', {}, callback);

        let err;
        try {
          await promise;
        } catch (e) {
          err = e;
        }

        assert.equal(err, 'Annotation not anchored in guest');
      });

      it('renders thumbnail if supported by integration', async () => {
        const fakeBitmap = {};
        const renderOptions = {};
        fakeIntegration.renderToBitmap = sinon.stub().resolves(fakeBitmap);

        const guest = createGuest();
        guest.anchors = [
          {
            annotation: { $tag: 'ann123' },
          },
        ];
        const { callback, promise } = makeCallback();

        emitSidebarEvent('renderThumbnail', 'ann123', renderOptions, callback);
        const bitmap = await promise;

        assert.calledWith(
          fakeIntegration.renderToBitmap,
          guest.anchors[0],
          renderOptions,
        );
        assert.equal(bitmap, fakeBitmap);
      });
    });
  });

  describe('document events', () => {
    let fakeHighlight;
    let fakeSidebarFrame;
    let rootElement;

    const createGuest = (config = {}) => {
      const guest = new Guest(rootElement, config, hostFrame);
      guest.setHighlightsVisible(true);
      guests.push(guest);
      return guest;
    };

    beforeEach(() => {
      rootElement = document.createElement('div');
      fakeSidebarFrame = null;

      // Create a fake highlight as a target for hover and click events.
      fakeHighlight = document.createElement('hypothesis-highlight');
      const annotation = { $tag: 'highlight-ann-tag' };
      fakeHighlighter.getHighlightsFromPoint.returns([
        { _annotation: annotation },
      ]);

      // Guest relies on event listeners on the root element, so all highlights must
      // be descendants of it.
      rootElement.appendChild(fakeHighlight);
    });

    afterEach(() => {
      fakeSidebarFrame?.remove();
    });

    function sidebarClosed() {
      return sidebarRPC().call.calledWith('closeSidebar');
    }

    context('clicks/taps on the document', () => {
      const simulateClick = (element = rootElement, clientX = 0) =>
        element.dispatchEvent(
          new PointerEvent('pointerdown', { bubbles: true, clientX }),
        );

      it('hides sidebar', () => {
        fakeHighlighter.getHighlightsFromPoint.returns([]);
        createGuest();
        simulateClick();
        assert.isTrue(sidebarClosed());
      });

      it('does not hide sidebar if target is a highlight', () => {
        const guest = createGuest();
        guest.setHighlightsVisible(true);
        simulateClick(fakeHighlight);
        assert.isFalse(sidebarClosed());
      });

      it('does not hide sidebar if click is at a point with annotations (line 436)', () => {
        // Configure getHighlightsFromPoint to return a highlight with annotation tag
        // This covers the early return at line 436 when annotationsAtPoint returns non-empty array
        fakeHighlighter.getHighlightsFromPoint.returns([
          { _annotation: { $tag: 'test-annotation-tag' } },
        ]);

        createGuest();

        // Simulate click at coordinates where there's a highlight
        // annotationsAtPoint will return ['test-annotation-tag'], so length > 0
        // This triggers the return at line 436
        rootElement.dispatchEvent(
          new PointerEvent('pointerdown', {
            bubbles: true,
            clientX: 50,
            clientY: 60,
          }),
        );

        // Verify sidebar was not closed (line 436 return executed)
        assert.isFalse(sidebarClosed());

        // Verify getHighlightsFromPoint was called with correct coordinates
        assert.calledWith(fakeHighlighter.getHighlightsFromPoint, 50, 60);
      });

      it('does not hide sidebar if side-by-side mode is active', () => {
        createGuest();
        fakeIntegration.sideBySideActive.returns(true);
        simulateClick();
        assert.isFalse(sidebarClosed());
      });

      it('does not hide sidebar if host page reports side-by-side is active', () => {
        fakeHighlighter.getHighlightsFromPoint.returns([]);
        const isActive = sinon.stub().returns(true);
        createGuest({
          sideBySide: {
            mode: 'manual',
            isActive,
          },
        });

        simulateClick();

        assert.calledOnce(isActive);
        assert.isFalse(sidebarClosed());

        isActive.returns(false);

        simulateClick();

        assert.isTrue(sidebarClosed());
        assert.calledTwice(isActive);
      });

      it('does not hide sidebar if event is within the bounds of the sidebar', () => {
        fakeHighlighter.getHighlightsFromPoint.returns([]);
        const guest = createGuest();
        emitHostEvent('sidebarLayoutChanged', { expanded: true, width: 300 });

        // Configure frameFillsAncestor to return true with correct arguments
        // to cover the full condition at line 443-447 (line 448 return statement)
        fakeFrameFillsAncestor.withArgs(window, hostFrame).returns(true);

        // Simulate click within sidebar bounds
        // For width=300, we need: window.innerWidth - clientX < 300
        // So clientX > window.innerWidth - 300
        // Using window.innerWidth - 150 to ensure we're well within bounds
        const clientX = window.innerWidth - 150;
        simulateClick(rootElement, clientX);

        // Verify sidebar was not closed (line 448 return executed)
        assert.isFalse(sidebarClosed());

        // Verify frameFillsAncestor was called with correct arguments
        assert.calledWith(fakeFrameFillsAncestor, window, hostFrame);
      });

      it('hides sidebar if event is outside sidebar bounds even when frameFillsAncestor is true', () => {
        fakeHighlighter.getHighlightsFromPoint.returns([]);
        createGuest();
        emitHostEvent('sidebarLayoutChanged', { expanded: true, width: 300 });
        fakeFrameFillsAncestor.returns(true);

        // Simulate click far from sidebar (clientX is small, so window.innerWidth - clientX > width)
        simulateClick(rootElement, 50);

        assert.isTrue(sidebarClosed());
      });

      it('hides sidebar if frameFillsAncestor returns false', () => {
        fakeHighlighter.getHighlightsFromPoint.returns([]);
        createGuest();
        emitHostEvent('sidebarLayoutChanged', { expanded: true, width: 300 });
        fakeFrameFillsAncestor.returns(false);

        // Even if click is within sidebar bounds, if frameFillsAncestor is false, sidebar should close
        simulateClick(rootElement, window.innerWidth - 295);

        assert.isTrue(sidebarClosed());
      });

      it('hides sidebar if sidebar is not expanded', () => {
        fakeHighlighter.getHighlightsFromPoint.returns([]);
        createGuest();
        emitHostEvent('sidebarLayoutChanged', { expanded: false, width: 300 });
        fakeFrameFillsAncestor.returns(true);

        // Even if click is within sidebar bounds, if sidebar is not expanded, sidebar should close
        simulateClick(rootElement, window.innerWidth - 295);

        assert.isTrue(sidebarClosed());
      });

      it('hides sidebar if sidebarLayout is undefined', () => {
        fakeHighlighter.getHighlightsFromPoint.returns([]);
        createGuest();
        // Don't emit sidebarLayoutChanged, so _sidebarLayout is undefined
        fakeFrameFillsAncestor.returns(true);

        simulateClick(rootElement, window.innerWidth - 295);

        assert.isTrue(sidebarClosed());
      });

      it('does not hide sidebar if event is inside a `<hypothesis-*>` element', () => {
        fakeHighlighter.getHighlightsFromPoint.returns([]);
        createGuest();

        const hypothesisElement = document.createElement('hypothesis-sidebar');
        const nonHypothesisElement = document.createElement('other-element');

        try {
          rootElement.append(hypothesisElement, nonHypothesisElement);

          simulateClick(hypothesisElement);
          assert.isFalse(sidebarClosed());

          simulateClick(nonHypothesisElement);
          assert.isTrue(sidebarClosed());
        } finally {
          hypothesisElement.remove();
          nonHypothesisElement.remove();
        }
      });
    });

    it('does not reposition the adder if hidden when the window is resized', () => {
      createGuest();
      window.dispatchEvent(new Event('resize'));
      assert.notCalled(FakeAdder.instance.show);
    });

    it('repositions the adder when the window is resized', () => {
      createGuest();
      simulateSelectionWithText();
      assert.calledOnce(FakeAdder.instance.show);
      FakeAdder.instance.show.resetHistory();

      window.dispatchEvent(new Event('resize'));

      assert.called(FakeAdder.instance.show);
    });

    it('uses empty range in annotationsForSelection when selectedRange returns null', () => {
      rangeUtil.selectedRange.returns(null);
      rangeUtil.selectionFocusRect.returns({
        left: 0,
        top: 0,
        width: 5,
        height: 5,
      });
      createGuest();
      const element = document.createElement('div');
      element.textContent = 'foo';
      const range = new Range();
      range.selectNodeContents(element);
      notifySelectionChanged(range);

      assert.calledOnce(FakeAdder.instance.show);
      // annotationsForSelection() uses selectedRange() ?? new Range(); with null we pass a collapsed Range to itemsForRange
      const itemsForRangeCall = rangeUtil.itemsForRange
        .getCalls()
        .find(call => call.args[0] instanceof Range && call.args[0].collapsed);
      assert.ok(
        itemsForRangeCall,
        'itemsForRange was called with a collapsed Range (fallback when selectedRange is null)',
      );
    });

    it('focuses annotations in the sidebar when hovering highlights in the document', () => {
      createGuest();

      // Hover the highlight
      fakeHighlight.dispatchEvent(
        new MouseEvent('mouseover', {
          bubbles: true,
          clientX: 50,
          clientY: 60,
        }),
      );
      assert.calledWith(fakeHighlighter.getHighlightsFromPoint, 50, 60);
      assert.calledWith(sidebarRPC().call, 'hoverAnnotations', [
        'highlight-ann-tag',
      ]);

      // Un-hover the highlight
      fakeHighlight.dispatchEvent(new Event('mouseout', { bubbles: true }));
      assert.calledWith(sidebarRPC().call, 'hoverAnnotations', []);
    });

    it('does not focus annotations in the sidebar when a non-highlight element is hovered', () => {
      fakeHighlighter.getHighlightsFromPoint.returns([]);
      createGuest();
      rootElement.dispatchEvent(
        new MouseEvent('mouseover', {
          bubbles: true,
          clientX: 50,
          clientY: 60,
        }),
      );

      assert.calledWith(fakeHighlighter.getHighlightsFromPoint, 50, 60);
      assert.notCalled(sidebarRPC().call);
    });

    it('selects annotations in the sidebar when clicking on a highlight', () => {
      createGuest();
      fakeHighlight.dispatchEvent(new Event('mouseup', { bubbles: true }));

      assert.calledWith(sidebarRPC().call, 'showAnnotations', [
        'highlight-ann-tag',
      ]);
      assert.calledWith(sidebarRPC().call, 'openSidebar');
    });

    it('does not select annotations in the sidebar if there is a selection', () => {
      sandbox.stub(document, 'getSelection').returns({ isCollapsed: false });
      createGuest();
      fakeHighlight.dispatchEvent(new Event('mouseup', { bubbles: true }));
      assert.notCalled(sidebarRPC().call);
    });

    it('toggles selected annotations in the sidebar when Ctrl/Cmd-clicking a highlight', () => {
      createGuest();
      fakeHighlight.dispatchEvent(
        new MouseEvent('mouseup', { bubbles: true, ctrlKey: true }),
      );

      assert.calledWith(sidebarRPC().call, 'toggleAnnotationSelection', [
        'highlight-ann-tag',
      ]);
      assert.calledWith(sidebarRPC().call, 'openSidebar');
    });
  });

  describe('when the selection changes', () => {
    it('shows the adder if the selection contains text', () => {
      createGuest();
      simulateSelectionWithText();
      assert.called(FakeAdder.instance.show);
    });

    it('does not shows the adder if comments mode is enabled', () => {
      createGuest({ commentsMode: true });
      simulateSelectionWithText();
      assert.notCalled(FakeAdder.instance.show);
    });

    it('sets the annotations associated with the selection', () => {
      createGuest();
      const ann = { $tag: 't1' };
      rangeUtil.itemsForRange.callsFake((range, callback) => {
        range.startContainer._annotation = ann;
        return [callback(range.startContainer)];
      });
      simulateSelectionWithText();

      assert.deepEqual(FakeAdder.instance.annotationsForSelection, ['t1']);
    });

    it('uses empty range when selectedRange() returns null for adder annotations', () => {
      const element = document.createElement('div');
      element.textContent = 'x';
      const range = new Range();
      range.selectNodeContents(element);
      rangeUtil.selectedRange.returns(null);
      rangeUtil.selectionFocusRect.returns({
        left: 0,
        top: 0,
        width: 1,
        height: 1,
      });
      createGuest();

      notifySelectionChanged(range);

      assert.called(FakeAdder.instance.show);
      assert.deepEqual(FakeAdder.instance.annotationsForSelection, []);
    });

    it('hides the adder if the selection does not contain text', () => {
      createGuest();

      simulateSelectionWithoutText();

      assert.called(FakeAdder.instance.hide);
      assert.notCalled(FakeAdder.instance.show);
    });

    it('hides the adder if the selection is empty', () => {
      createGuest();
      notifySelectionChanged(null);
      assert.called(FakeAdder.instance.hide);
    });

    it('hides the adder if the integration indicates that the selection cannot be annotated', () => {
      // Simulate integration indicating text is not part of annotatable content
      // (eg. text that is part of the PDF.js UI)
      fakeIntegration.getAnnotatableRange = sinon.stub().returns(null);
      createGuest();
      simulateSelectionWithText();

      assert.notCalled(FakeAdder.instance.show);
    });

    it('calls "textSelected" RPC method when selecting text', () => {
      createGuest();

      simulateSelectionWithText();

      assert.calledWith(hostRPC().call, 'textSelected');
    });

    it('calls "textUnselected" RPC method when clearing text selection', () => {
      createGuest();

      simulateSelectionWithoutText();

      assert.calledWith(hostRPC().call, 'textUnselected');
    });

    context('on "clearSelection" RPC event', () => {
      it('if guest has selected text, clears the selection', () => {
        const removeAllRanges = sandbox.stub();
        sandbox.stub(document, 'getSelection').returns({ removeAllRanges });
        const guest = createGuest();
        guest.selectedRanges = [1];

        // Guest has text selected
        simulateSelectionWithText();

        hostRPC().call.resetHistory();
        emitHostEvent('clearSelection');

        assert.calledOnce(removeAllRanges);
        notifySelectionChanged(null); // removing the text selection triggers the selection observer

        assert.equal(guest.selectedRanges.length, 0);
        assert.notCalled(hostRPC().call);

        // On next selection clear it should inform the host.
        notifySelectionChanged(null);
        assert.calledOnce(hostRPC().call);
        assert.calledWithExactly(hostRPC().call, 'textUnselected');
      });

      it('if guest has no text selected, does nothing', () => {
        const removeAllRanges = sandbox.stub();
        sandbox.stub(document, 'getSelection').returns({ removeAllRanges });
        const guest = createGuest();
        guest.selectedRanges = [1];

        // Guest has no text selected
        rangeUtil.selectedRange.returns(null);

        hostRPC().call.resetHistory();
        emitHostEvent('clearSelection');

        assert.notCalled(removeAllRanges);

        // On next selection clear it should inform the host.
        notifySelectionChanged(null);
        assert.calledOnce(hostRPC().call);
        assert.calledWithExactly(hostRPC().call, 'textUnselected');
      });
    });
  });

  describe('when adder toolbar buttons are clicked', () => {
    // nb. Detailed tests for properties of new annotations are in the
    // `createAnnotation` tests.
    it('creates a new annotation if "Annotate" is clicked', async () => {
      createGuest();

      await FakeAdder.instance.options.onAnnotate();

      assert.calledWith(sidebarRPC().call, 'createAnnotation');
    });

    it('creates a new highlight if "Highlight" is clicked', async () => {
      createGuest();

      await FakeAdder.instance.options.onHighlight();

      assert.calledWith(
        sidebarRPC().call,
        'createAnnotation',
        sinon.match({ $highlight: true }),
      );
    });

    it('shows annotations if "Show" is clicked', () => {
      createGuest();
      const tags = ['t1', 't2'];

      FakeAdder.instance.options.onShowAnnotations(tags);

      assert.calledWith(sidebarRPC().call, 'openSidebar');
      assert.calledWith(
        sidebarRPC().call,
        'showAnnotations',
        tags,
        true, // Focus annotation in sidebar
      );
    });
  });

  describe('#selectAnnotations', () => {
    it('selects the specified annotations in the sidebar', () => {
      const guest = createGuest();
      const tags = ['t1', 't2'];

      guest.selectAnnotations(tags);

      assert.calledWith(
        sidebarRPC().call,
        'showAnnotations',
        tags,
        false, // Don't focus annotation in sidebar
      );
    });

    it('toggles the annotations if `toggle` is true', () => {
      const guest = createGuest();
      const tags = ['t1', 't2'];

      guest.selectAnnotations(tags, { toggle: true });

      assert.calledWith(sidebarRPC().call, 'toggleAnnotationSelection', tags);
    });

    it('opens the sidebar', () => {
      const guest = createGuest();

      guest.selectAnnotations([]);

      assert.calledWith(sidebarRPC().call, 'openSidebar');
    });

    it('focuses first selected annotation in sidebar if `focusInSidebar` is true', () => {
      const guest = createGuest();
      const tags = ['t1', 't2'];

      guest.selectAnnotations(tags, { focusInSidebar: true });

      assert.calledWith(
        sidebarRPC().call,
        'showAnnotations',
        tags,
        true, // Focus in sidebar
      );
    });
  });

  describe('#getDocumentInfo', () => {
    let guest;

    beforeEach(() => {
      guest = createGuest();
    });

    it('preserves the components of the URI other than the fragment', () => {
      fakeIntegration.uri.resolves('http://foobar.com/things?id=42');
      return guest
        .getDocumentInfo()
        .then(({ uri }) => assert.equal(uri, 'http://foobar.com/things?id=42'));
    });

    it('removes the fragment identifier from URIs', () => {
      fakeIntegration.uri.resolves('http://foobar.com/things?id=42#ignoreme');
      return guest
        .getDocumentInfo()
        .then(({ uri }) => assert.equal(uri, 'http://foobar.com/things?id=42'));
    });

    it('rejects if getting the URL fails', async () => {
      const guest = createGuest();
      fakeIntegration.uri.rejects(new Error('Failed to get URI'));
      await assert.rejects(guest.getDocumentInfo(), 'Failed to get URI');
    });

    it('rejects if getting the document metadata fails', async () => {
      const guest = createGuest();
      fakeIntegration.getMetadata.rejects(new Error('Failed to get URI'));
      await assert.rejects(guest.getDocumentInfo(), 'Failed to get URI');
    });
  });

  describe('#createAnnotation', () => {
    it('adds document metadata to the annotation', async () => {
      const guest = createGuest();

      const annotation = await guest.createAnnotationFromSelection();

      assert.equal(annotation.uri, await fakeIntegration.uri());
      assert.deepEqual(
        annotation.document,
        await fakeIntegration.getMetadata(),
      );
    });

    it('adds selectors for selected ranges to the annotation', async () => {
      const guest = createGuest();
      const fakeRange = document.createRange();
      guest.selectedRanges = [fakeRange];

      const selectorA = { type: 'TextPositionSelector', start: 0, end: 10 };
      const selectorB = { type: 'TextQuoteSelector', exact: 'foobar' };
      fakeIntegration.anchor.resolves({});
      fakeIntegration.describe.returns([selectorA, selectorB]);

      const annotation = await guest.createAnnotationFromSelection({});

      assert.calledWith(fakeIntegration.describe, guest.element, fakeRange);
      assert.deepEqual(annotation.target, [
        {
          source: await fakeIntegration.uri(),
          selector: [selectorA, selectorB],
        },
      ]);
    });

    it('hides the adder when creating an annotation', async () => {
      const guest = createGuest();
      const removeAllRanges = sandbox.stub();
      sandbox.stub(document, 'getSelection').returns({ removeAllRanges });

      await guest.createAnnotationFromSelection();

      assert.calledOnce(removeAllRanges);
      notifySelectionChanged(null); // removing the text selection triggers the selection observer
      assert.calledOnce(FakeAdder.instance.hide);
    });

    it('sets `$tag` property', async () => {
      const guest = createGuest();
      const annotation = await guest.createAnnotationFromSelection();
      assert.match(annotation.$tag, /a:\w{8}/);
    });

    it('sets falsey `$highlight` if `highlight` is false', async () => {
      const guest = createGuest();
      const annotation = await guest.createAnnotationFromSelection();
      assert.notOk(annotation.$highlight);
    });

    it('sets `$highlight` to true if `highlight` is true', async () => {
      const guest = createGuest();
      const annotation = await guest.createAnnotationFromSelection({
        highlight: true,
      });
      assert.equal(annotation.$highlight, true);
    });

    it('sets `$cluster` to `user-highlights` if `highlight` is true', async () => {
      const guest = createGuest();
      const annotation = await guest.createAnnotationFromSelection({
        highlight: true,
      });
      assert.equal(annotation.$cluster, 'user-highlights');
    });

    it('sets `$cluster` to `user-annotations` if `highlight` is false', async () => {
      const guest = createGuest();
      const annotation = await guest.createAnnotationFromSelection({
        highlight: false,
      });
      assert.equal(annotation.$cluster, 'user-annotations');
    });

    it('triggers a "createAnnotation" event', async () => {
      const guest = createGuest();

      const annotation = await guest.createAnnotationFromSelection();

      assert.calledWith(sidebarRPC().call, 'createAnnotation', annotation);
    });
  });

  describe('#anchor', () => {
    let el;
    let range;

    beforeEach(() => {
      el = document.createElement('span');
      const txt = document.createTextNode('hello');
      el.appendChild(txt);
      document.body.appendChild(el);
      range = document.createRange();
      range.selectNode(el);
    });

    afterEach(() => {
      el.remove();
    });

    it("doesn't mark an annotation lacking targets as an orphan", () => {
      const guest = createGuest();
      const annotation = { target: [] };

      return guest
        .anchor(annotation)
        .then(() => assert.isFalse(annotation.$orphan));
    });

    it("doesn't mark an annotation with a selectorless target as an orphan", () => {
      const guest = createGuest();
      const annotation = { target: [{ source: 'wibble' }] };

      return guest
        .anchor(annotation)
        .then(() => assert.isFalse(annotation.$orphan));
    });

    it("doesn't mark an annotation with only selectorless targets as an orphan", () => {
      const guest = createGuest();
      const annotation = { target: [{ source: 'foo' }, { source: 'bar' }] };

      return guest
        .anchor(annotation)
        .then(() => assert.isFalse(annotation.$orphan));
    });

    it("doesn't mark an annotation in which the target anchors as an orphan", () => {
      const guest = createGuest();
      const annotation = {
        target: [{ selector: [{ type: 'TextQuoteSelector', exact: 'hello' }] }],
      };
      fakeIntegration.anchor.returns(Promise.resolve(range));

      return guest
        .anchor(annotation)
        .then(() => assert.isFalse(annotation.$orphan));
    });

    it("doesn't mark an annotation in which at least one target anchors as an orphan", () => {
      const guest = createGuest();
      const annotation = {
        target: [
          { selector: [{ type: 'TextQuoteSelector', exact: 'notinhere' }] },
          { selector: [{ type: 'TextQuoteSelector', exact: 'hello' }] },
        ],
      };
      fakeIntegration.anchor
        .onFirstCall()
        .returns(Promise.reject(new Error('Failed to anchor')))
        .onSecondCall()
        .returns(Promise.resolve(range));

      return guest
        .anchor(annotation)
        .then(() => assert.isFalse(annotation.$orphan));
    });

    it('marks an annotation in which the target fails to anchor as an orphan', () => {
      const guest = createGuest();
      const annotation = {
        target: [
          { selector: [{ type: 'TextQuoteSelector', exact: 'notinhere' }] },
        ],
      };
      fakeIntegration.anchor.returns(
        Promise.reject(new Error('Failed to anchor')),
      );

      return guest
        .anchor(annotation)
        .then(() => assert.isTrue(annotation.$orphan));
    });

    it('marks an annotation in which all (suitable) targets fail to anchor as an orphan', () => {
      const guest = createGuest();
      const annotation = {
        target: [
          { selector: [{ type: 'TextQuoteSelector', exact: 'notinhere' }] },
          { selector: [{ type: 'TextQuoteSelector', exact: 'neitherami' }] },
        ],
      };
      fakeIntegration.anchor.returns(
        Promise.reject(new Error('Failed to anchor')),
      );

      return guest
        .anchor(annotation)
        .then(() => assert.isTrue(annotation.$orphan));
    });

    it('marks an annotation where the target has no quote or shape as an orphan', () => {
      const guest = createGuest();
      const annotation = {
        target: [
          { selector: [{ type: 'TextPositionSelector', start: 0, end: 5 }] },
        ],
      };
      // This shouldn't be called, but if it is, we successfully anchor so that
      // this test is guaranteed to fail.
      fakeIntegration.anchor.returns(Promise.resolve(range));

      return guest
        .anchor(annotation)
        .then(() => assert.isTrue(annotation.$orphan));
    });

    it('does not attempt to anchor targets which have no quote or shape selector', () => {
      const guest = createGuest();
      const annotation = {
        target: [
          { selector: [{ type: 'TextPositionSelector', start: 0, end: 5 }] },
        ],
      };

      return guest
        .anchor(annotation)
        .then(() => assert.notCalled(fakeIntegration.anchor));
    });

    it('syncs annotations to the sidebar', () => {
      const guest = createGuest();
      const annotation = {};
      return guest.anchor(annotation).then(() => {
        assert.calledWith(sidebarRPC().call, 'syncAnchoringStatus', annotation);
      });
    });

    it('calls "syncAnchoringStatus" RPC method', async () => {
      const guest = createGuest();
      const annotation = {};

      await guest.anchor(annotation);

      assert.match(sidebarRPC().call.lastCall.args, [
        'syncAnchoringStatus',
        annotation,
      ]);
    });

    it('provides CSS classes for anchor highlight elements', async () => {
      const guest = createGuest();
      const annotation = {
        $cluster: 'user-annotations',
        target: [{ selector: [{ type: 'TextQuoteSelector', exact: 'hello' }] }],
      };
      fakeIntegration.anchor.resolves(range);

      await guest.anchor(annotation);

      assert.equal(
        fakeHighlighter.highlightRange.lastCall.args[1],
        'user-annotations',
      );
    });

    it('returns anchors for an annotation with a quote selector', async () => {
      const guest = createGuest();
      const highlights = [document.createElement('span')];
      fakeIntegration.anchor.returns(Promise.resolve(range));
      fakeHighlighter.highlightRange.returns(highlights);
      const target = {
        selector: [{ type: 'TextQuoteSelector', exact: 'hello' }],
      };

      const anchors = await guest.anchor({ target: [target] });

      assert.equal(anchors.length, 1);
    });

    it('returns anchors for an annotation with a shape selector', async () => {
      const guest = createGuest();
      const highlights = [document.createElement('span')];
      fakeIntegration.anchor.returns({
        anchor: document.createElement('div'),
        shape: { type: 'point', x: 0, y: 0 },
      });
      fakeHighlighter.highlightShape.returns(highlights);
      const target = {
        selector: [
          { type: 'ShapeSelector', shape: { type: 'point', x: 0, y: 100 } },
        ],
      };
      const anchors = await guest.anchor({ target: [target] });
      assert.equal(anchors.length, 1);
    });

    it('adds the anchor to the "anchors" instance property"', () => {
      const guest = createGuest();
      const highlights = [document.createElement('span')];
      fakeIntegration.anchor.returns(Promise.resolve(range));
      fakeHighlighter.highlightRange.returns(highlights);
      const target = {
        selector: [{ type: 'TextQuoteSelector', exact: 'hello' }],
      };
      const annotation = { target: [target] };
      return guest.anchor(annotation).then(() => {
        assert.equal(guest.anchors.length, 1);
        assert.strictEqual(guest.anchors[0].annotation, annotation);
        assert.strictEqual(guest.anchors[0].target, target);
        assert.strictEqual(guest.anchors[0].region.toRange(), range);
        assert.strictEqual(guest.anchors[0].highlights, highlights);
      });
    });

    it('destroys targets that have been removed from the annotation', () => {
      const annotation = {};
      const target = {};
      const highlights = [];
      const guest = createGuest();
      guest.anchors = [{ annotation, target, highlights }];
      const { removeHighlights } = fakeHighlighter;

      return guest.anchor(annotation).then(() => {
        assert.equal(guest.anchors.length, 0);
        assert.calledOnce(removeHighlights);
        assert.calledWith(removeHighlights, highlights);
      });
    });

    it('focuses the new highlights if the annotation is already focused', async () => {
      const guest = createGuest();
      const highlights = [document.createElement('span')];
      fakeIntegration.anchor.resolves(range);
      fakeHighlighter.highlightRange.returns(highlights);
      const target = {
        selector: [{ type: 'TextQuoteSelector', exact: 'hello' }],
      };
      const annotation = { $tag: 'tag1', target: [target] };

      // Hover the annotation (in the sidebar) before it is anchored in the page.
      const [, hoverAnnotationsCallback] = sidebarRPC().on.args.find(
        args => args[0] === 'hoverAnnotations',
      );
      hoverAnnotationsCallback([annotation.$tag]);
      const anchors = await guest.anchor(annotation);

      // Check that the new highlights are already in the focused state.
      assert.equal(anchors.length, 1);
      assert.calledWith(
        fakeHighlighter.setHighlightsFocused,
        anchors[0].highlights,
        true,
      );
    });

    it('prevents saving of annotations that are deleted while been anchored', async () => {
      const guest = createGuest();
      const annotation = {
        $tag: 'tag1',
        target: [{ selector: [{ type: 'TextQuoteSelector', exact: 'hello' }] }],
      };
      fakeIntegration.anchor.resolves(range);

      emitSidebarEvent('loadAnnotations', [annotation]);
      emitSidebarEvent('deleteAnnotation', annotation.$tag);
      await delay(0);

      assert.lengthOf(guest.anchors, 0);
    });

    it('waits for content to be ready before anchoring', async () => {
      const events = [];
      fakeIntegration.anchor = async () => {
        events.push('fakeIntegration.anchor');
        return range;
      };
      const contentReady = delay(1).then(() => {
        events.push('contentReady');
      });

      const guest = createGuest({ contentReady });

      const annotation = {
        $tag: 'tag1',
        target: [{ selector: [{ type: 'TextQuoteSelector', exact: 'hello' }] }],
      };
      await guest.anchor(annotation);

      assert.deepEqual(events, ['contentReady', 'fakeIntegration.anchor']);
    });
  });

  describe('#detach', () => {
    let nextTagId = 0;
    function createAnchor() {
      return {
        annotation: { $tag: `t${nextTagId++}` },
        highlights: [document.createElement('span')],
      };
    }

    it('removes anchors associated with the removed annotation', () => {
      const guest = createGuest();
      const anchor = createAnchor();
      guest.anchors.push(anchor);

      guest.detach(anchor.annotation.$tag);

      assert.equal(guest.anchors.length, 0);
    });

    it('removes any highlights associated with the annotation', () => {
      const guest = createGuest();
      const anchor = createAnchor();
      const { removeHighlights } = fakeHighlighter;
      guest.anchors.push(anchor);

      guest.detach(anchor.annotation.$tag);

      assert.calledOnce(removeHighlights);
      assert.calledWith(removeHighlights, anchor.highlights);
    });

    it('keeps anchors and highlights associated with other annotations', () => {
      const guest = createGuest();
      const anchorA = createAnchor();
      const anchorB = createAnchor();
      guest.anchors.push(anchorA, anchorB);

      guest.detach(anchorA.annotation.$tag);

      assert.include(guest.anchors, anchorB);
      assert.isFalse(
        fakeHighlighter.removeHighlights.calledWith(anchorB.highlights),
      );
    });

    it('calls the `BucketBarClient#update` method', () => {
      const guest = createGuest();
      const anchor1 = createAnchor();
      const anchor2 = createAnchor();
      guest.anchors.push(anchor1, anchor2);

      guest.detach(anchor1.annotation.$tag);

      assert.calledOnce(fakeBucketBarClient.update);
      assert.calledWith(fakeBucketBarClient.update, [anchor2]);
    });
  });

  describe('#destroy', () => {
    it('disconnects from sidebar events', () => {
      const guest = createGuest();
      guest.destroy();
      assert.calledOnce(sidebarRPC().destroy);
    });

    it('removes the adder toolbar', () => {
      const guest = createGuest();
      guest.destroy();

      assert.calledOnce(FakeAdder.instance.destroy);
    });

    it('cleans up integration', () => {
      const guest = createGuest();
      guest.destroy();
      assert.calledOnce(fakeIntegration.destroy);
    });

    it('removes all highlights', () => {
      const guest = createGuest();
      guest.destroy();
      assert.calledWith(fakeHighlighter.removeAllHighlights);
    });

    it('disconnects from sidebar', () => {
      const guest = createGuest();
      guest.destroy();
      assert.called(sidebarRPC().destroy);
    });

    it('removes the clustered highlights toolbar', () => {
      fakeIntegration.canStyleClusteredHighlights.returns(true);

      const guest = createGuest();
      guest.destroy();
      assert.called(fakeHighlightClusterController.destroy);
    });
  });

  it('emits "hostDisconnected" event when host frame closes connection with guest', () => {
    const guest = createGuest();
    const hostDisconnected = sinon.stub();
    guest.on('hostDisconnected', hostDisconnected);

    emitHostEvent('close');

    assert.called(hostDisconnected);
  });

  it('discovers and creates a channel for communication with the sidebar', async () => {
    const { port1 } = new MessageChannel();
    fakePortFinder.discover.resolves(port1);
    createGuest();

    await delay(0);

    assert.calledWith(sidebarRPC().connect, port1);
  });

  it('creates integration', () => {
    createGuest();
    assert.calledOnce(fakeCreateIntegration);
  });

  it('shows content info banner if `contentInfoBanner` configuration is set', () => {
    const config = {
      contentInfoBanner: {},
    };

    createGuest(config);

    assert.calledOnce(fakeIntegration.showContentInfo);
    assert.calledWith(
      fakeIntegration.showContentInfo,
      config.contentInfoBanner,
    );
  });

  it('configures the BucketBarClient', () => {
    const contentContainer = document.createElement('div');
    fakeIntegration.contentContainer.returns(contentContainer);

    createGuest();

    assert.calledWith(FakeBucketBarClient, {
      contentContainer,
      hostRPC: hostRPC(),
    });
  });

  it('does not create a HighlightClusterController if the integration does not support clustered highlights', () => {
    fakeIntegration.canStyleClusteredHighlights.returns(false);

    createGuest();

    assert.notCalled(FakeHighlightClusterController);
  });

  it('creates a HighlightClustersController if the integration supports clustered highlights', () => {
    fakeIntegration.canStyleClusteredHighlights.returns(true);

    createGuest();

    assert.calledOnce(FakeHighlightClusterController);
  });

  it('sends document metadata and URIs to sidebar', async () => {
    createGuest();
    await delay(0);
    assert.calledWith(sidebarRPC().call, 'documentInfoChanged', {
      uri: 'https://example.com/test.pdf',
      metadata: {
        title: 'Test title',
        documentFingerprint: 'test-fingerprint',
      },
      segmentInfo: undefined,
      persistent: false,
    });
  });

  it('waits for feature flags before sending metadata if requested by integration', async () => {
    fakeIntegration.waitForFeatureFlags = () => true;
    createGuest();

    await delay(0);
    assert.isFalse(sidebarRPC().call.calledWith('documentInfoChanged'));

    emitSidebarEvent('featureFlagsUpdated', {
      some_new_feature: true,
    });

    await delay(0);
    assert.isTrue(sidebarRPC().call.calledWith('documentInfoChanged'));
  });

  it('sends segment info and persistent hint to sidebar when available', async () => {
    fakeIntegration.uri.resolves('https://bookstore.com/books/1234');
    fakeIntegration.getMetadata.resolves({ title: 'A little book' });
    fakeIntegration.segmentInfo = sinon.stub().resolves({
      cfi: '/2',
      url: '/chapters/02.xhtml',
    });
    fakeIntegration.persistFrame = sinon.stub().returns(true);

    createGuest();
    await delay(0);

    assert.calledWith(sidebarRPC().call, 'documentInfoChanged', {
      uri: 'https://bookstore.com/books/1234',
      metadata: {
        title: 'A little book',
      },
      segmentInfo: {
        cfi: '/2',
        url: '/chapters/02.xhtml',
      },
      persistent: true,
    });
  });

  it('sends new document metadata and URIs to sidebar after a client-side navigation', async () => {
    fakeIntegration.uri.resolves('https://example.com/page-1');
    fakeIntegration.getMetadata.resolves({ title: 'Page 1' });

    createGuest();
    const sidebarRPCCall = sidebarRPC().call;
    await delay(0);

    assert.calledWith(sidebarRPCCall, 'documentInfoChanged', {
      uri: 'https://example.com/page-1',
      metadata: {
        title: 'Page 1',
      },
      segmentInfo: undefined,
      persistent: false,
    });

    sidebarRPCCall.resetHistory();
    fakeIntegration.uri.resolves('https://example.com/page-2');
    fakeIntegration.getMetadata.resolves({ title: 'Page 2' });

    fakeIntegration.emit('uriChanged');
    await delay(0);

    assert.calledWith(sidebarRPCCall, 'documentInfoChanged', {
      uri: 'https://example.com/page-2',
      metadata: {
        title: 'Page 2',
      },
      segmentInfo: undefined,
      persistent: false,
    });
  });

  it('sends supported annotation tools to host', async () => {
    // Tools should be sent when guest first connects to host.
    fakeIntegration.supportedTools.returns(['selection', 'rect']);
    createGuest();
    assert.calledWith(hostRPC().call, 'supportedToolsChanged', [
      'selection',
      'rect',
    ]);

    hostRPC().call.resetHistory();

    // Tools should be sent if the guest's capabilities change later.
    fakeIntegration.supportedTools.returns(['selection']);
    fakeIntegration.emit(
      'supportedToolsChanged',
      fakeIntegration.supportedTools(),
    );
    assert.calledWith(
      hostRPC().call,
      'supportedToolsChanged',
      fakeIntegration.supportedTools(),
    );
  });

  describe('#fitSideBySide', () => {
    it('attempts to fit content alongside sidebar', () => {
      const guest = createGuest();
      fakeIntegration.fitSideBySide.returns(false);
      const layout = { expanded: true, width: 100 };

      guest.fitSideBySide(layout);

      assert.calledWith(fakeIntegration.fitSideBySide, layout);
    });
  });

  describe('keyboard shortcuts', () => {
    it('toggles highlights when shortcut is pressed', () => {
      const guest = createGuest();
      guest.setHighlightsVisible(true, false /* notifyHost */);
      assert.equal(guest.highlightsVisible, true);

      guest.element.dispatchEvent(
        new KeyboardEvent('keydown', {
          ctrlKey: true,
          shiftKey: true,
          key: 'h',
        }),
      );
      assert.equal(guest.highlightsVisible, false);
      assert.calledWith(hostRPC().call, 'highlightsVisibleChanged', false);

      guest.element.dispatchEvent(
        new KeyboardEvent('keydown', {
          ctrlKey: true,
          shiftKey: true,
          key: 'h',
        }),
      );
      assert.equal(guest.highlightsVisible, true);
      assert.calledWith(hostRPC().call, 'highlightsVisibleChanged', true);
    });

    it.each([true, false])(
      'does not show highlights when comments mode is disabled',
      commentsMode => {
        const guest = createGuest({ commentsMode });

        guest.element.dispatchEvent(
          new KeyboardEvent('keydown', {
            ctrlKey: true,
            shiftKey: true,
            key: 'h',
          }),
        );

        assert.equal(guest.highlightsVisible, !commentsMode);
      },
    );

    it('does not activate rect on Ctrl+Shift+Y when rect is not supported', () => {
      fakeIntegration.supportedTools.returns(['point']);

      createGuest();
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          ctrlKey: true,
          shiftKey: true,
          key: 'y',
          bubbles: true,
        }),
      );

      assert.notCalled(fakeDrawTool.draw);
    });

    it('activates rect in move mode on Ctrl+Shift+Y when rect is supported and keyboard not active', async () => {
      fakeIntegration.supportedTools.returns(['rect']);
      fakeDrawTool.getKeyboardModeState.returns({ keyboardActive: false });
      fakeDrawTool.draw.resolves({
        type: 'rect',
        left: 0,
        top: 0,
        right: 10,
        bottom: 10,
      });
      fakeIntegration.describe.resolves([
        { type: 'FragmentSelector', value: '' },
      ]);

      createGuest();
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          ctrlKey: true,
          shiftKey: true,
          key: 'y',
          bubbles: true,
        }),
      );

      await delay(0);
      assert.calledWith(fakeDrawTool.draw, 'rect', 'move');
    });

    it('switches to move mode on Ctrl+Shift+Y when already in keyboard mode', () => {
      fakeIntegration.supportedTools.returns(['rect']);
      fakeDrawTool.getKeyboardModeState.returns({ keyboardActive: true });

      createGuest();
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          ctrlKey: true,
          shiftKey: true,
          key: 'y',
          bubbles: true,
        }),
      );

      assert.calledWith(fakeDrawTool.setKeyboardMode, 'move');
    });

    it('clears pending mode when Ctrl+Shift+Y createAnnotation rejects', async () => {
      fakeIntegration.supportedTools.returns(['rect']);
      fakeDrawTool.getKeyboardModeState.returns({ keyboardActive: false });
      fakeDrawTool.draw.rejects(new DrawError('canceled'));

      const guest = createGuest();
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          ctrlKey: true,
          shiftKey: true,
          key: 'y',
          bubbles: true,
        }),
      );
      // Wait for the promise rejection and catch handler to execute (line 803)
      await delay(10);

      assert.calledWith(fakeDrawTool.draw, 'rect');
      // Verify that _pendingKeyboardMode was cleared after error (line 803)
      assert.isUndefined(guest._pendingKeyboardMode);
      fakeDrawTool.draw.resetHistory();
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          ctrlKey: true,
          shiftKey: true,
          key: 'y',
          bubbles: true,
        }),
      );
      await delay(0);
      assert.calledWith(fakeDrawTool.draw, 'rect');
    });

    it('does not activate point on Ctrl+Shift+U when point is not supported', () => {
      fakeIntegration.supportedTools.returns(['rect']);

      createGuest();
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          ctrlKey: true,
          shiftKey: true,
          key: 'u',
          bubbles: true,
        }),
      );

      assert.notCalled(fakeDrawTool.draw);
    });

    it('activates resize mode with Ctrl+Shift+J when rect is supported', async () => {
      fakeIntegration.supportedTools.returns(['rect']);
      fakeDrawTool.getKeyboardModeState.returns({ keyboardActive: false });
      fakeDrawTool.draw.resolves({
        type: 'rect',
        left: 0,
        top: 0,
        right: 10,
        bottom: 10,
      });
      fakeIntegration.describe.resolves([
        { type: 'FragmentSelector', value: '' },
      ]);

      createGuest();
      hostRPC().call.resetHistory();

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          ctrlKey: true,
          shiftKey: true,
          key: 'j',
          bubbles: true,
        }),
      );

      await delay(0);
      assert.calledWith(fakeDrawTool.draw, 'rect', 'resize');
      assert.calledWith(hostRPC().call, 'activeToolChanged', 'rect');
    });

    it('uses Meta+Shift+J on macOS to activate resize mode when rect is supported', async () => {
      fakeIsMacOS.returns(true);
      fakeIntegration.supportedTools.returns(['rect']);
      fakeDrawTool.getKeyboardModeState.returns({ keyboardActive: false });
      fakeDrawTool.draw.resolves({
        type: 'rect',
        left: 0,
        top: 0,
        right: 10,
        bottom: 10,
      });

      createGuest();
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          metaKey: true,
          ctrlKey: false,
          shiftKey: true,
          key: 'j',
          bubbles: true,
        }),
      );

      await delay(0);
      assert.calledWith(fakeDrawTool.draw, 'rect', 'resize');
    });

    it('switches to resize mode with Ctrl+Shift+J when already in keyboard mode', async () => {
      fakeIntegration.supportedTools.returns(['rect']);
      fakeDrawTool.getKeyboardModeState.returns({ keyboardActive: true });
      fakeDrawTool.setKeyboardMode = sinon.stub();

      createGuest();

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          ctrlKey: true,
          shiftKey: true,
          key: 'j',
          bubbles: true,
        }),
      );

      await delay(0);

      assert.calledWith(fakeDrawTool.setKeyboardMode, 'resize');
    });

    it('does not activate resize mode with Ctrl+Shift+J when rect is not supported', () => {
      fakeIntegration.supportedTools.returns(['point']);
      fakeDrawTool.draw.resetHistory();
      const guest = createGuest();
      guest.setHighlightsVisible(false, false /* notifyHost */);
      hostRPC().call.resetHistory();

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          ctrlKey: true,
          shiftKey: true,
          key: 'j',
          bubbles: true,
        }),
      );

      // Should not call draw, and should allow event to propagate
      assert.notCalled(fakeDrawTool.draw);
      // Highlights should remain unchanged since 'j' doesn't match Ctrl+Shift+H
      assert.equal(guest.highlightsVisible, false);
    });

    it('ignores Ctrl+Shift+J when user is typing in input field', () => {
      fakeIntegration.supportedTools.returns(['rect']);
      fakeDrawTool.draw.resetHistory();
      createGuest();

      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      // Dispatch event directly on the input element so target is correctly set
      input.dispatchEvent(
        new KeyboardEvent('keydown', {
          ctrlKey: true,
          shiftKey: true,
          key: 'j',
          bubbles: true,
        }),
      );

      // Should not activate resize mode when typing in input
      assert.notCalled(fakeDrawTool.draw);
      document.body.removeChild(input);
    });

    it('ignores Ctrl+Shift+U when user is typing in textarea', () => {
      fakeIntegration.supportedTools.returns(['point']);
      fakeDrawTool.draw.resetHistory();
      createGuest();

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();

      // Dispatch event directly on the textarea element so target is correctly set
      textarea.dispatchEvent(
        new KeyboardEvent('keydown', {
          ctrlKey: true,
          shiftKey: true,
          key: 'u',
          bubbles: true,
        }),
      );

      // Should not activate point annotation when typing in textarea
      assert.notCalled(fakeDrawTool.draw);
      document.body.removeChild(textarea);
    });

    it('clears _pendingKeyboardMode when Ctrl+Shift+J annotation creation is canceled', async () => {
      fakeIntegration.supportedTools.returns(['rect']);
      fakeDrawTool.getKeyboardModeState.returns({ keyboardActive: false });
      fakeDrawTool.draw.rejects(new DrawError('canceled'));

      const guest = createGuest();

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          ctrlKey: true,
          shiftKey: true,
          key: 'j',
          bubbles: true,
        }),
      );

      // Wait for the promise rejection and catch handler to execute (line 825)
      await delay(10);

      // Verify that draw was called with resize mode
      assert.calledWith(fakeDrawTool.draw, 'rect', 'resize');
      // Verify that _pendingKeyboardMode was cleared after error (line 825)
      assert.isUndefined(guest._pendingKeyboardMode);
    });

    it('clears _pendingKeyboardMode when Ctrl+Shift+U annotation creation is canceled', async () => {
      fakeIntegration.supportedTools.returns(['point']);
      fakeDrawTool.getKeyboardModeState.returns({ keyboardActive: false });
      fakeDrawTool.draw.rejects(new DrawError('canceled'));

      const guest = createGuest();

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          ctrlKey: true,
          shiftKey: true,
          key: 'u',
          bubbles: true,
        }),
      );

      await delay(0);

      // Verify that draw was called with move mode
      assert.calledWith(fakeDrawTool.draw, 'point', 'move');
      // Verify that _pendingKeyboardMode was cleared after error
      assert.isUndefined(guest._pendingKeyboardMode);
    });

    it('activates point annotation with Ctrl+Shift+U when point is supported', async () => {
      fakeIntegration.supportedTools.returns(['point']);
      fakeDrawTool.getKeyboardModeState.returns({ keyboardActive: false });
      fakeDrawTool.draw.resolves({
        type: 'point',
        x: 0,
        y: 0,
      });
      fakeIntegration.describe.resolves([
        {
          type: 'ShapeSelector',
          shape: { type: 'point', x: 0, y: 0 },
        },
      ]);

      createGuest();
      hostRPC().call.resetHistory();

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          ctrlKey: true,
          shiftKey: true,
          key: 'u',
          bubbles: true,
        }),
      );

      await delay(0);

      // Verify that draw was called with 'move' mode from _pendingKeyboardMode
      assert.calledWith(fakeDrawTool.draw, 'point', 'move');
      assert.calledWith(hostRPC().call, 'activeToolChanged', 'point');
    });

    it('does not activate point annotation with Ctrl+Shift+U when point is not supported', () => {
      fakeIntegration.supportedTools.returns(['rect']);
      fakeDrawTool.draw.resetHistory();

      createGuest();

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          ctrlKey: true,
          shiftKey: true,
          key: 'u',
          bubbles: true,
        }),
      );

      assert.notCalled(fakeDrawTool.draw);
    });

    it('does not activate point annotation with Ctrl+Shift+U when already in keyboard mode', () => {
      fakeIntegration.supportedTools.returns(['point']);
      fakeDrawTool.getKeyboardModeState.returns({ keyboardActive: true });
      fakeDrawTool.draw.resetHistory();

      createGuest();

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          ctrlKey: true,
          shiftKey: true,
          key: 'u',
          bubbles: true,
        }),
      );

      // Should not call draw when already in keyboard mode
      assert.notCalled(fakeDrawTool.draw);
    });

    it('does not call hoverAnnotations on mouseout when highlights are not visible', () => {
      const guest = createGuest();
      guest.setHighlightsVisible(false, false /* notifyHost */);
      sidebarRPC().call.resetHistory();

      guest.element.dispatchEvent(
        new MouseEvent('mouseout', { bubbles: true }),
      );

      assert.notCalled(sidebarRPC().call);
    });

    it('does not call hoverAnnotations on mousemove when no annotations at point', () => {
      fakeHighlighter.getHighlightsFromPoint.returns([]);
      const guest = createGuest();
      sidebarRPC().call.resetHistory();

      guest.element.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          clientX: 100,
          clientY: 200,
        }),
      );

      assert.notCalled(sidebarRPC().call);
    });

    it('does not handle shortcut when event does not match Ctrl+Shift+H', () => {
      const guest = createGuest();
      guest.setHighlightsVisible(true, false /* notifyHost */);
      const initialVisible = guest.highlightsVisible;

      guest.element.dispatchEvent(
        new KeyboardEvent('keydown', {
          ctrlKey: true,
          shiftKey: true,
          key: 'x', // Different key
          bubbles: true,
        }),
      );

      // Highlights should remain unchanged
      assert.equal(guest.highlightsVisible, initialVisible);
    });

    it('creates outside assignment notice when setting visible and notice does not exist', () => {
      FakeOutsideAssignmentNoticeController.resetHistory();
      const guest = createGuest();

      emitSidebarEvent('setOutsideAssignmentNoticeVisible', true);

      assert.calledOnce(FakeOutsideAssignmentNoticeController);
      assert.calledWith(FakeOutsideAssignmentNoticeController, guest.element);
      assert.calledWith(fakeOutsideAssignmentNotice.setVisible, true);
    });
  });
});
