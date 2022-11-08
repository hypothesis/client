import { TinyEmitter } from 'tiny-emitter';

import { delay } from '../../test-util/wait';
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
  let highlighter;
  let hostFrame;
  let notifySelectionChanged;
  let rangeUtil;

  let FakeBucketBarClient;
  let fakeBucketBarClient;
  let fakeHighlightClusterController;
  let FakeHighlightClusterController;
  let fakeCreateIntegration;
  let fakeFindClosestOffscreenAnchor;
  let fakeFrameFillsAncestor;
  let fakeIntegration;
  let fakePortFinder;
  let FakePortRPC;
  let fakePortRPCs;
  let fakeSelectedRange;

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

  const emitHostEvent = (event, ...args) => {
    for (let [evt, fn] of hostRPC().on.args) {
      if (event === evt) {
        fn(...args);
      }
    }
  };

  const emitSidebarEvent = (event, ...args) => {
    for (let [evt, fn] of sidebarRPC().on.args) {
      if (event === evt) {
        fn(...args);
      }
    }
  };

  beforeEach(() => {
    guests = [];
    highlighter = {
      getHighlightsContainingNode: sinon.stub().returns([]),
      highlightRange: sinon.stub().returns([]),
      removeHighlights: sinon.stub(),
      removeAllHighlights: sinon.stub(),
      setHighlightsFocused: sinon.stub(),
      setHighlightsVisible: sinon.stub(),
    };
    hostFrame = {
      postMessage: sinon.stub(),
    };
    notifySelectionChanged = null;
    rangeUtil = {
      itemsForRange: sinon.stub().returns([]),
      isSelectionBackwards: sinon.stub(),
      selectionFocusRect: sinon.stub(),
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

    fakeHighlightClusterController = {
      destroy: sinon.stub(),
    };
    FakeHighlightClusterController = sinon
      .stub()
      .returns(fakeHighlightClusterController);

    fakeFindClosestOffscreenAnchor = sinon.stub();

    fakeFrameFillsAncestor = sinon.stub().returns(true);

    fakeIntegration = Object.assign(new TinyEmitter(), {
      anchor: sinon.stub(),
      canAnnotate: sinon.stub().returns(true),
      canStyleClusteredHighlights: sinon.stub().returns(false),
      contentContainer: sinon.stub().returns({}),
      describe: sinon.stub(),
      destroy: sinon.stub(),
      fitSideBySide: sinon.stub().returns(false),
      getMetadata: sinon.stub().resolves({
        title: 'Test title',
        documentFingerprint: 'test-fingerprint',
      }),
      scrollToAnchor: sinon.stub().resolves(),
      showContentInfo: sinon.stub(),
      uri: sinon.stub().resolves('https://example.com/test.pdf'),
    });

    fakeCreateIntegration = sinon.stub().returns(fakeIntegration);

    fakePortFinder = {
      discover: sinon.stub().resolves({}),
      destroy: sinon.stub(),
    };

    class FakeSelectionObserver {
      constructor(callback) {
        notifySelectionChanged = callback;
        this.disconnect = sinon.stub();
      }
    }

    fakeSelectedRange = sinon.stub();

    $imports.$mock({
      '../shared/messaging': {
        PortFinder: sinon.stub().returns(fakePortFinder),
        PortRPC: FakePortRPC,
      },
      './adder': { Adder: FakeAdder },
      './anchoring/text-range': {
        TextRange: FakeTextRange,
      },
      './bucket-bar-client': {
        BucketBarClient: FakeBucketBarClient,
      },
      './highlight-clusters': {
        HighlightClusterController: FakeHighlightClusterController,
      },
      './highlighter': highlighter,
      './integrations': {
        createIntegration: fakeCreateIntegration,
      },
      './range-util': rangeUtil,
      './selection-observer': {
        SelectionObserver: FakeSelectionObserver,
        selectedRange: fakeSelectedRange,
      },
      './util/buckets': {
        findClosestOffscreenAnchor: fakeFindClosestOffscreenAnchor,
      },
      './util/frame': {
        frameFillsAncestor: fakeFrameFillsAncestor,
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

    describe('on "scrollToClosestOffScreenAnchor" event', () => {
      it('scrolls to the nearest off-screen anchor"', () => {
        const guest = createGuest();
        guest.anchors = [
          { annotation: { $tag: 't1' } },
          { annotation: { $tag: 't2' } },
        ];
        const anchor = {};
        fakeFindClosestOffscreenAnchor.returns(anchor);
        const tags = ['t1', 't2'];
        const direction = 'down';

        emitHostEvent('scrollToClosestOffScreenAnchor', tags, direction);

        assert.calledWith(
          fakeFindClosestOffscreenAnchor,
          guest.anchors,
          direction
        );
        assert.calledWith(fakeIntegration.scrollToAnchor, anchor);
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
          highlighter.setHighlightsFocused,
          guest.anchors[0].highlights,
          true
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
          highlighter.setHighlightsFocused,
          guest.anchors[1].highlights,
          false
        );
      });

      it('updates hovered tag set', () => {
        const guest = createGuest();

        emitSidebarEvent('hoverAnnotations', ['tag1']);
        emitSidebarEvent('hoverAnnotations', ['tag2', 'tag3']);

        assert.deepEqual([...guest.hoveredAnnotationTags], ['tag2', 'tag3']);
      });
    });

    describe('on "scrollToAnnotation" event', () => {
      it('scrolls to the anchor with the matching tag', () => {
        const highlight = document.createElement('span');
        const guest = createGuest();
        const fakeRange = sinon.stub();
        guest.anchors = [
          {
            annotation: { $tag: 'tag1' },
            highlights: [highlight],
            range: new FakeTextRange(fakeRange),
          },
        ];

        emitSidebarEvent('scrollToAnnotation', 'tag1');

        assert.called(fakeIntegration.scrollToAnchor);
        assert.calledWith(fakeIntegration.scrollToAnchor, guest.anchors[0]);
      });

      it('emits a "scrolltorange" DOM event', () => {
        const highlight = document.createElement('span');
        const guest = createGuest();
        const fakeRange = sinon.stub();
        guest.anchors = [
          {
            annotation: { $tag: 'tag1' },
            highlights: [highlight],
            range: new FakeTextRange(fakeRange),
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

      it('allows the default scroll behaviour to be prevented', () => {
        const highlight = document.createElement('span');
        const guest = createGuest();
        const fakeRange = sandbox.stub();
        guest.anchors = [
          {
            annotation: { $tag: 'tag1' },
            highlights: [highlight],
            range: new FakeTextRange(fakeRange),
          },
        ];
        guest.element.addEventListener('scrolltorange', event =>
          event.preventDefault()
        );

        emitSidebarEvent('scrollToAnnotation', 'tag1');

        assert.notCalled(fakeIntegration.scrollToAnchor);
      });

      it('does nothing if the anchor has no highlights', () => {
        const guest = createGuest();

        guest.anchors = [{ annotation: { $tag: 'tag1' } }];
        emitSidebarEvent('scrollToAnnotation', 'tag1');

        assert.notCalled(fakeIntegration.scrollToAnchor);
      });

      it("does nothing if the anchor's range cannot be resolved", () => {
        const highlight = document.createElement('span');
        const guest = createGuest();
        guest.anchors = [
          {
            annotation: { $tag: 'tag1' },
            highlights: [highlight],
            range: {
              toRange: sandbox.stub().throws(new Error('Something went wrong')),
            },
          },
        ];
        const eventEmitted = sandbox.stub();
        guest.element.addEventListener('scrolltorange', eventEmitted);

        emitSidebarEvent('scrollToAnnotation', 'tag1');

        assert.notCalled(eventEmitted);
        assert.notCalled(fakeIntegration.scrollToAnchor);
      });
    });

    describe('on "setHighlightsVisible" event', () => {
      it('sets visibility of highlights in document', () => {
        const guest = createGuest();

        emitSidebarEvent('setHighlightsVisible', true);
        assert.calledWith(
          highlighter.setHighlightsVisible,
          guest.element,
          true
        );

        emitSidebarEvent('setHighlightsVisible', false);
        assert.calledWith(
          highlighter.setHighlightsVisible,
          guest.element,
          false
        );
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
          sinon.match({ target: [], uri: 'uri', $tag: 'tag1' })
        );
        assert.calledWith(
          sidebarRPC().call,
          'syncAnchoringStatus',
          sinon.match({ target: [], uri: 'uri', $tag: 'tag2' })
        );
      });
    });

    describe('on "createAnnotation" event', () => {
      it('creates an annotation', async () => {
        createGuest();

        emitHostEvent('createAnnotation');
        await delay(0);

        assert.calledWith(sidebarRPC().call, 'createAnnotation');
      });
    });

    describe('on "deleteAnnotation" event', () => {
      it('detaches annotation', () => {
        createGuest();

        emitSidebarEvent('deleteAnnotation', 'tag1');

        assert.calledOnce(fakeBucketBarClient.update);
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
  });

  describe('document events', () => {
    let fakeHighlight;
    let fakeSidebarFrame;
    let guest;
    let rootElement;

    beforeEach(() => {
      fakeSidebarFrame = null;
      guest = createGuest();
      guest.setHighlightsVisible(true);
      rootElement = guest.element;

      // Create a fake highlight as a target for hover and click events.
      fakeHighlight = document.createElement('hypothesis-highlight');
      const annotation = { $tag: 'highlight-ann-tag' };
      highlighter.getHighlightsContainingNode
        .withArgs(fakeHighlight)
        .returns([{ _annotation: annotation }]);

      // Guest relies on event listeners on the root element, so all highlights must
      // be descendants of it.
      rootElement.appendChild(fakeHighlight);
    });

    afterEach(() => {
      fakeSidebarFrame?.remove();
    });

    it('hides sidebar on user "mousedown" or "touchstart" events in the document', () => {
      for (let event of ['mousedown', 'touchstart']) {
        rootElement.dispatchEvent(new Event(event));
        assert.calledWith(sidebarRPC().call, 'closeSidebar');
        sidebarRPC().call.resetHistory();
      }
    });

    it('does not hide sidebar if side-by-side mode is active', () => {
      for (let event of ['mousedown', 'touchstart']) {
        // Activate side-by-side mode
        fakeIntegration.fitSideBySide.returns(true);
        guest.fitSideBySide({ expanded: true, width: 100 });

        rootElement.dispatchEvent(new Event(event));

        assert.notCalled(sidebarRPC().call);
        sidebarRPC().call.resetHistory();
      }
    });

    it('does not reposition the adder on window "resize" event if the adder is hidden', () => {
      sandbox.stub(guest, '_repositionAdder').callThrough();
      sandbox.stub(guest, '_onSelection'); // Calling _onSelect makes the adder to reposition

      window.dispatchEvent(new Event('resize'));

      assert.called(guest._repositionAdder);
      assert.notCalled(guest._onSelection);
    });

    it('reposition the adder on window "resize" event if the adder is shown', () => {
      sandbox.stub(guest, '_repositionAdder').callThrough();
      sandbox.stub(guest, '_onSelection'); // Calling _onSelect makes the adder to reposition

      guest._isAdderVisible = true;
      sandbox.stub(window, 'getSelection').returns({ getRangeAt: () => true });

      window.dispatchEvent(new Event('resize'));

      assert.called(guest._onSelection);
    });

    it('focuses annotations in the sidebar when hovering highlights in the document', () => {
      // Hover the highlight
      fakeHighlight.dispatchEvent(new Event('mouseover', { bubbles: true }));
      assert.calledWith(highlighter.getHighlightsContainingNode, fakeHighlight);
      assert.calledWith(sidebarRPC().call, 'hoverAnnotations', [
        'highlight-ann-tag',
      ]);

      // Un-hover the highlight
      fakeHighlight.dispatchEvent(new Event('mouseout', { bubbles: true }));
      assert.calledWith(sidebarRPC().call, 'hoverAnnotations', []);
    });

    it('does not focus annotations in the sidebar when a non-highlight element is hovered', () => {
      rootElement.dispatchEvent(new Event('mouseover', { bubbles: true }));

      assert.calledWith(highlighter.getHighlightsContainingNode, rootElement);
      assert.notCalled(sidebarRPC().call);
    });

    it('does not focus or select annotations in the sidebar if highlights are hidden', () => {
      guest.setHighlightsVisible(false);

      fakeHighlight.dispatchEvent(new Event('mouseover', { bubbles: true }));
      fakeHighlight.dispatchEvent(new Event('mouseup', { bubbles: true }));

      assert.calledWith(highlighter.getHighlightsContainingNode, fakeHighlight);
      assert.notCalled(sidebarRPC().call);
    });

    it('selects annotations in the sidebar when clicking on a highlight', () => {
      fakeHighlight.dispatchEvent(new Event('mouseup', { bubbles: true }));

      assert.calledWith(sidebarRPC().call, 'showAnnotations', [
        'highlight-ann-tag',
      ]);
      assert.calledWith(sidebarRPC().call, 'openSidebar');
    });

    it('toggles selected annotations in the sidebar when Ctrl/Cmd-clicking a highlight', () => {
      fakeHighlight.dispatchEvent(
        new MouseEvent('mouseup', { bubbles: true, ctrlKey: true })
      );

      assert.calledWith(sidebarRPC().call, 'toggleAnnotationSelection', [
        'highlight-ann-tag',
      ]);
      assert.calledWith(sidebarRPC().call, 'openSidebar');
    });
  });

  describe('when the selection changes', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      container.innerHTML = 'test text';
      document.body.appendChild(container);
      window.getSelection().selectAllChildren(container);
    });

    afterEach(() => {
      container.remove();
    });

    const simulateSelectionWithText = () => {
      rangeUtil.selectionFocusRect.returns({
        left: 0,
        top: 0,
        width: 5,
        height: 5,
      });
      notifySelectionChanged({});
    };

    const simulateSelectionWithoutText = () => {
      rangeUtil.selectionFocusRect.returns(null);
      notifySelectionChanged({});
    };

    it('shows the adder if the selection contains text', () => {
      createGuest();
      simulateSelectionWithText();
      assert.called(FakeAdder.instance.show);
    });

    it('sets the annotations associated with the selection', () => {
      createGuest();
      const ann = { $tag: 't1' };
      container._annotation = ann;
      rangeUtil.itemsForRange.callsFake((range, callback) => [
        callback(range.startContainer),
      ]);
      simulateSelectionWithText();

      assert.deepEqual(FakeAdder.instance.annotationsForSelection, ['t1']);
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
      fakeIntegration.canAnnotate.returns(false);

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
        fakeSelectedRange.returns({});

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
        fakeSelectedRange.returns(null);

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
        sinon.match({ $highlight: true })
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
        true // Focus annotation in sidebar
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
        false // Don't focus annotation in sidebar
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
        true // Focus in sidebar
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

      const annotation = await guest.createAnnotation();

      assert.equal(annotation.uri, await fakeIntegration.uri());
      assert.deepEqual(
        annotation.document,
        await fakeIntegration.getMetadata()
      );
    });

    it('adds selectors for selected ranges to the annotation', async () => {
      const guest = createGuest();
      const fakeRange = {};
      guest.selectedRanges = [fakeRange];

      const selectorA = { type: 'TextPositionSelector', start: 0, end: 10 };
      const selectorB = { type: 'TextQuoteSelector', exact: 'foobar' };
      fakeIntegration.anchor.resolves({});
      fakeIntegration.describe.returns([selectorA, selectorB]);

      const annotation = await guest.createAnnotation({});

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

      await guest.createAnnotation();

      assert.calledOnce(removeAllRanges);
      notifySelectionChanged(null); // removing the text selection triggers the selection observer
      assert.calledOnce(FakeAdder.instance.hide);
    });

    it('sets `$tag` property', async () => {
      const guest = createGuest();
      const annotation = await guest.createAnnotation();
      assert.match(annotation.$tag, /a:\w{8}/);
    });

    it('sets falsey `$highlight` if `highlight` is false', async () => {
      const guest = createGuest();
      const annotation = await guest.createAnnotation();
      assert.notOk(annotation.$highlight);
    });

    it('sets `$highlight` to true if `highlight` is true', async () => {
      const guest = createGuest();
      const annotation = await guest.createAnnotation({ highlight: true });
      assert.equal(annotation.$highlight, true);
    });

    it('sets `$cluster` to `user-highlights` if `highlight` is true', async () => {
      const guest = createGuest();
      const annotation = await guest.createAnnotation({ highlight: true });
      assert.equal(annotation.$cluster, 'user-highlights');
    });

    it('sets `$cluster` to `user-annotations` if `highlight` is false', async () => {
      const guest = createGuest();
      const annotation = await guest.createAnnotation({ highlight: false });
      assert.equal(annotation.$cluster, 'user-annotations');
    });

    it('triggers a "createAnnotation" event', async () => {
      const guest = createGuest();

      const annotation = await guest.createAnnotation();

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
        Promise.reject(new Error('Failed to anchor'))
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
        Promise.reject(new Error('Failed to anchor'))
      );

      return guest
        .anchor(annotation)
        .then(() => assert.isTrue(annotation.$orphan));
    });

    it('marks an annotation where the target has no TextQuoteSelectors as an orphan', () => {
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

    it('does not attempt to anchor targets which have no TextQuoteSelector', () => {
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
        highlighter.highlightRange.lastCall.args[1],
        'user-annotations'
      );
    });

    it('returns a promise of the anchors for the annotation', () => {
      const guest = createGuest();
      const highlights = [document.createElement('span')];
      fakeIntegration.anchor.returns(Promise.resolve(range));
      highlighter.highlightRange.returns(highlights);
      const target = {
        selector: [{ type: 'TextQuoteSelector', exact: 'hello' }],
      };
      return guest
        .anchor({ target: [target] })
        .then(anchors => assert.equal(anchors.length, 1));
    });

    it('adds the anchor to the "anchors" instance property"', () => {
      const guest = createGuest();
      const highlights = [document.createElement('span')];
      fakeIntegration.anchor.returns(Promise.resolve(range));
      highlighter.highlightRange.returns(highlights);
      const target = {
        selector: [{ type: 'TextQuoteSelector', exact: 'hello' }],
      };
      const annotation = { target: [target] };
      return guest.anchor(annotation).then(() => {
        assert.equal(guest.anchors.length, 1);
        assert.strictEqual(guest.anchors[0].annotation, annotation);
        assert.strictEqual(guest.anchors[0].target, target);
        assert.strictEqual(guest.anchors[0].range.toRange(), range);
        assert.strictEqual(guest.anchors[0].highlights, highlights);
      });
    });

    it('destroys targets that have been removed from the annotation', () => {
      const annotation = {};
      const target = {};
      const highlights = [];
      const guest = createGuest();
      guest.anchors = [{ annotation, target, highlights }];
      const { removeHighlights } = highlighter;

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
      highlighter.highlightRange.returns(highlights);
      const target = {
        selector: [{ type: 'TextQuoteSelector', exact: 'hello' }],
      };
      const annotation = { $tag: 'tag1', target: [target] };

      // Hover the annotation (in the sidebar) before it is anchored in the page.
      const [, hoverAnnotationsCallback] = sidebarRPC().on.args.find(
        args => args[0] === 'hoverAnnotations'
      );
      hoverAnnotationsCallback([annotation.$tag]);
      const anchors = await guest.anchor(annotation);

      // Check that the new highlights are already in the focused state.
      assert.equal(anchors.length, 1);
      assert.calledWith(
        highlighter.setHighlightsFocused,
        anchors[0].highlights,
        true
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
      const { removeHighlights } = highlighter;
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
        highlighter.removeHighlights.calledWith(anchorB.highlights)
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
      assert.calledWith(highlighter.removeAllHighlights, guest.element);
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
      config.contentInfoBanner
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
    });
  });

  it('sends segment info to sidebar when available', async () => {
    fakeIntegration.uri.resolves('https://bookstore.com/books/1234');
    fakeIntegration.getMetadata.resolves({ title: 'A little book' });
    fakeIntegration.segmentInfo = sinon.stub().resolves({
      cfi: '/2',
      url: '/chapters/02.xhtml',
    });

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
    });
  });

  describe('#fitSideBySide', () => {
    it('attempts to fit content alongside sidebar', () => {
      const guest = createGuest();
      fakeIntegration.fitSideBySide.returns(false);
      const layout = { expanded: true, width: 100 };

      guest.fitSideBySide(layout);

      assert.calledWith(fakeIntegration.fitSideBySide, layout);
    });

    it('enables closing sidebar on document click if side-by-side is not activated', () => {
      const guest = createGuest();
      fakeIntegration.fitSideBySide.returns(false);
      const layout = { expanded: true, width: 100 };

      guest.fitSideBySide(layout);
      assert.isFalse(guest.sideBySideActive);

      fakeIntegration.fitSideBySide.returns(true);
      guest.fitSideBySide(layout);
      assert.isTrue(guest.sideBySideActive);
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
        })
      );
      assert.equal(guest.highlightsVisible, false);
      assert.calledWith(hostRPC().call, 'highlightsVisibleChanged', false);

      guest.element.dispatchEvent(
        new KeyboardEvent('keydown', {
          ctrlKey: true,
          shiftKey: true,
          key: 'h',
        })
      );
      assert.equal(guest.highlightsVisible, true);
      assert.calledWith(hostRPC().call, 'highlightsVisibleChanged', true);
    });
  });
});
