import { delay } from '../../test-util/wait';
import Guest, { $imports } from '../guest';

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

  let FakeBridge;
  let fakeBridges;
  let FakeBucketBarClient;
  let fakeBucketBarClient;
  let fakeIntegration;
  let FakeHypothesisInjector;
  let fakeHypothesisInjector;
  let fakePortFinder;

  const createGuest = (config = {}) => {
    const element = document.createElement('div');
    const guest = new Guest(element, config, hostFrame);
    guests.push(guest);
    return guest;
  };

  // Helpers for getting the channels used for guest <-> host/sidebar communication.
  // These currently rely on knowing the implementation detail of which order
  // the channels are created in.

  const hostBridge = () => {
    return fakeBridges[0];
  };

  const sidebarBridge = () => {
    return fakeBridges[1];
  };

  const emitHostEvent = (event, ...args) => {
    for (let [evt, fn] of hostBridge().on.args) {
      if (event === evt) {
        fn(...args);
      }
    }
  };

  const emitSidebarEvent = (event, ...args) => {
    for (let [evt, fn] of sidebarBridge().on.args) {
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

    fakeBridges = [];
    FakeBridge = sinon.stub().callsFake(() => {
      const bridge = {
        call: sinon.stub(),
        createChannel: sinon.stub(),
        destroy: sinon.stub(),
        on: sinon.stub(),
      };
      fakeBridges.push(bridge);
      return bridge;
    });

    fakeBucketBarClient = {
      destroy: sinon.stub(),
      update: sinon.stub(),
    };
    FakeBucketBarClient = sinon.stub().returns(fakeBucketBarClient);

    fakeIntegration = {
      anchor: sinon.stub(),
      canAnnotate: sinon.stub().returns(true),
      contentContainer: sinon.stub().returns({}),
      describe: sinon.stub(),
      destroy: sinon.stub(),
      fitSideBySide: sinon.stub().returns(false),
      getMetadata: sinon.stub().resolves({
        title: 'Test title',
        documentFingerprint: 'test-fingerprint',
      }),
      scrollToAnchor: sinon.stub().resolves(),
      uri: sinon.stub().resolves('https://example.com/test.pdf'),
    };

    fakeHypothesisInjector = {
      destroy: sinon.stub(),
      injectClient: sinon.stub().resolves(),
    };
    FakeHypothesisInjector = sinon.stub().returns(fakeHypothesisInjector);

    fakePortFinder = {
      discover: sinon.stub(),
      destroy: sinon.stub(),
    };

    class FakeSelectionObserver {
      constructor(callback) {
        notifySelectionChanged = callback;
        this.disconnect = sinon.stub();
      }
    }

    $imports.$mock({
      '../shared/bridge': { Bridge: FakeBridge },
      '../shared/port-finder': {
        PortFinder: sinon.stub().returns(fakePortFinder),
      },
      './adder': { Adder: FakeAdder },
      './anchoring/text-range': {
        TextRange: FakeTextRange,
      },
      './bucket-bar-client': {
        BucketBarClient: FakeBucketBarClient,
      },
      './integrations': {
        createIntegration: sinon.stub().returns(fakeIntegration),
      },
      './highlighter': highlighter,
      './hypothesis-injector': { HypothesisInjector: FakeHypothesisInjector },
      './range-util': rangeUtil,
      './selection-observer': {
        SelectionObserver: FakeSelectionObserver,
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
      it('calls fitSideBySide if `Guest` is the main annotatable frame', () => {
        createGuest();
        const dummyLayout = {};

        emitHostEvent('sidebarLayoutChanged', dummyLayout);

        assert.calledWith(fakeIntegration.fitSideBySide, dummyLayout);
      });

      it('does not call fitSideBySide if `Guest` is not the main annotatable frame', () => {
        createGuest({ subFrameIdentifier: 'dummy' });
        const dummyLayout = {};

        emitHostEvent('sidebarLayoutChanged', dummyLayout);

        assert.notCalled(fakeIntegration.fitSideBySide);
      });
    });
  });

  describe('events from sidebar frame', () => {
    describe('on "focusAnnotations" event', () => {
      it('focuses any annotations with a matching tag', () => {
        const highlight0 = document.createElement('span');
        const highlight1 = document.createElement('span');
        const guest = createGuest();
        guest.anchors = [
          { annotation: { $tag: 'tag1' }, highlights: [highlight0] },
          { annotation: { $tag: 'tag2' }, highlights: [highlight1] },
        ];

        emitSidebarEvent('focusAnnotations', ['tag1']);

        assert.calledWith(
          highlighter.setHighlightsFocused,
          guest.anchors[0].highlights,
          true
        );
      });

      it('unfocuses any annotations without a matching tag', () => {
        const highlight0 = document.createElement('span');
        const highlight1 = document.createElement('span');
        const guest = createGuest();
        guest.anchors = [
          { annotation: { $tag: 'tag1' }, highlights: [highlight0] },
          { annotation: { $tag: 'tag2' }, highlights: [highlight1] },
        ];

        emitSidebarEvent('focusAnnotations', ['tag1']);

        assert.calledWith(
          highlighter.setHighlightsFocused,
          guest.anchors[1].highlights,
          false
        );
      });

      it('updates focused tag set', () => {
        const guest = createGuest();

        emitSidebarEvent('focusAnnotations', ['tag1']);
        emitSidebarEvent('focusAnnotations', ['tag2', 'tag3']);

        assert.deepEqual([...guest.focusedAnnotationTags], ['tag2', 'tag3']);
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

    describe('on "getDocumentInfo" event', () => {
      let guest;

      afterEach(() => {
        guest.destroy();
        sandbox.restore();
      });

      function createCallback(expectedUri, expectedMetadata, done) {
        return (err, result) => {
          assert.strictEqual(err, null);
          try {
            assert.equal(result.uri, expectedUri);
            assert.deepEqual(result.metadata, expectedMetadata);
            done();
          } catch (e) {
            done(e);
          }
        };
      }

      it('calls the callback with document URL and metadata', done => {
        guest = createGuest();
        const metadata = { title: 'hi' };

        fakeIntegration.getMetadata.resolves(metadata);

        emitSidebarEvent(
          'getDocumentInfo',
          createCallback('https://example.com/test.pdf', metadata, done)
        );
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
          sidebarBridge().call,
          'syncAnchoringStatus',
          sinon.match({ target: [], uri: 'uri', $tag: 'tag1' })
        );
        assert.calledWith(
          sidebarBridge().call,
          'syncAnchoringStatus',
          sinon.match({ target: [], uri: 'uri', $tag: 'tag2' })
        );
      });
    });

    describe('on "deleteAnnotation" event', () => {
      it('detaches annotation', () => {
        createGuest();

        emitSidebarEvent('deleteAnnotation', 'tag1');

        assert.calledOnce(fakeBucketBarClient.update);
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
        assert.calledWith(sidebarBridge().call, 'closeSidebar');
        sidebarBridge().call.resetHistory();
      }
    });

    it('does not hide sidebar if side-by-side mode is active', () => {
      for (let event of ['mousedown', 'touchstart']) {
        // Activate side-by-side mode
        fakeIntegration.fitSideBySide.returns(true);
        guest.fitSideBySide({ expanded: true, width: 100 });

        rootElement.dispatchEvent(new Event(event));

        assert.notCalled(sidebarBridge().call);
        sidebarBridge().call.resetHistory();
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
      assert.calledWith(sidebarBridge().call, 'focusAnnotations', [
        'highlight-ann-tag',
      ]);

      // Un-hover the highlight
      fakeHighlight.dispatchEvent(new Event('mouseout', { bubbles: true }));
      assert.calledWith(sidebarBridge().call, 'focusAnnotations', []);
    });

    it('does not focus annotations in the sidebar when a non-highlight element is hovered', () => {
      rootElement.dispatchEvent(new Event('mouseover', { bubbles: true }));

      assert.calledWith(highlighter.getHighlightsContainingNode, rootElement);
      assert.notCalled(sidebarBridge().call);
    });

    it('does not focus or select annotations in the sidebar if highlights are hidden', () => {
      guest.setHighlightsVisible(false);

      fakeHighlight.dispatchEvent(new Event('mouseover', { bubbles: true }));
      fakeHighlight.dispatchEvent(new Event('mouseup', { bubbles: true }));

      assert.calledWith(highlighter.getHighlightsContainingNode, fakeHighlight);
      assert.notCalled(sidebarBridge().call);
    });

    it('selects annotations in the sidebar when clicking on a highlight', () => {
      fakeHighlight.dispatchEvent(new Event('mouseup', { bubbles: true }));

      assert.calledWith(sidebarBridge().call, 'showAnnotations', [
        'highlight-ann-tag',
      ]);
      assert.calledWith(sidebarBridge().call, 'openSidebar');
    });

    it('toggles selected annotations in the sidebar when Ctrl/Cmd-clicking a highlight', () => {
      fakeHighlight.dispatchEvent(
        new MouseEvent('mouseup', { bubbles: true, ctrlKey: true })
      );

      assert.calledWith(sidebarBridge().call, 'toggleAnnotationSelection', [
        'highlight-ann-tag',
      ]);
      assert.calledWith(sidebarBridge().call, 'openSidebar');
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
      const ann = {};
      container._annotation = ann;
      rangeUtil.itemsForRange.callsFake((range, callback) => [
        callback(range.startContainer),
      ]);
      simulateSelectionWithText();

      assert.deepEqual(FakeAdder.instance.annotationsForSelection, [ann]);
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

    it('calls "textSelectedIn" RPC method with argument "null" if selection is non-empty', () => {
      createGuest();

      simulateSelectionWithText();

      assert.calledWith(hostBridge().call, 'textSelectedIn', null);
    });

    it('calls "textSelectedIn" RPC method with the subFrameIdentifier as argument if selection is non-empty', () => {
      const subFrameIdentifier = 'subframe identifier';
      createGuest({ subFrameIdentifier });

      simulateSelectionWithText();

      assert.calledWith(
        hostBridge().call,
        'textSelectedIn',
        subFrameIdentifier
      );
    });

    it('calls "textUnselectedIn" RPC method with argument "null" if selection is empty', () => {
      createGuest();

      simulateSelectionWithoutText();

      assert.calledWith(hostBridge().call, 'textUnselectedIn', null);
    });

    it('calls "textUnselectedIn" RPC method with the subFrameIdentifier as argument if selection is empty', () => {
      const subFrameIdentifier = 'subframe identifier';
      createGuest({ subFrameIdentifier });

      simulateSelectionWithoutText();

      assert.calledWith(
        hostBridge().call,
        'textUnselectedIn',
        subFrameIdentifier
      );
    });

    it('unselects text if another iframe has made a selection', () => {
      const removeAllRanges = sandbox.stub();
      sandbox.stub(document, 'getSelection').returns({ removeAllRanges });
      const guest = createGuest();
      guest.selectedRanges = [1];

      simulateSelectionWithText();
      hostBridge().call.resetHistory();
      emitHostEvent('clearSelectionExceptIn', 'subframe identifier');

      assert.calledOnce(removeAllRanges);
      notifySelectionChanged(null); // removing the text selection triggers the selection observer

      assert.equal(guest.selectedRanges.length, 0);
      assert.notCalled(hostBridge().call);

      // On next selection clear it should be inform the host.
      notifySelectionChanged(null);
      assert.calledOnce(hostBridge().call);
      assert.calledWithExactly(hostBridge().call, 'textUnselectedIn', null);
    });

    it("doesn't unselect text if frame identifier matches", () => {
      const guest = createGuest();
      guest.selectedRanges = [1];

      simulateSelectionWithText();
      emitHostEvent('clearSelectionExceptIn', null);

      assert.equal(guest.selectedRanges.length, 1);
    });
  });

  describe('when adder toolbar buttons are clicked', () => {
    // nb. Detailed tests for properties of new annotations are in the
    // `createAnnotation` tests.
    it('creates a new annotation if "Annotate" is clicked', async () => {
      createGuest();

      await FakeAdder.instance.options.onAnnotate();

      assert.calledWith(sidebarBridge().call, 'createAnnotation');
    });

    it('creates a new highlight if "Highlight" is clicked', async () => {
      createGuest();

      await FakeAdder.instance.options.onHighlight();

      assert.calledWith(
        sidebarBridge().call,
        'createAnnotation',
        sinon.match({ $highlight: true })
      );
    });

    it('shows annotations if "Show" is clicked', () => {
      createGuest();

      FakeAdder.instance.options.onShowAnnotations([{ $tag: 'ann1' }]);

      assert.calledWith(sidebarBridge().call, 'openSidebar');
      assert.calledWith(sidebarBridge().call, 'showAnnotations', ['ann1']);
    });
  });

  describe('#selectAnnotations', () => {
    it('selects the specified annotations in the sidebar', () => {
      const guest = createGuest();
      const annotations = [{ $tag: 'ann1' }, { $tag: 'ann2' }];

      guest.selectAnnotations(annotations);

      assert.calledWith(sidebarBridge().call, 'showAnnotations', [
        'ann1',
        'ann2',
      ]);
    });

    it('toggles the annotations if `toggle` is true', () => {
      const guest = createGuest();
      const annotations = [{ $tag: 'ann1' }, { $tag: 'ann2' }];

      guest.selectAnnotations(annotations, true /* toggle */);

      assert.calledWith(sidebarBridge().call, 'toggleAnnotationSelection', [
        'ann1',
        'ann2',
      ]);
    });

    it('opens the sidebar', () => {
      const guest = createGuest();

      guest.selectAnnotations([]);

      assert.calledWith(sidebarBridge().call, 'openSidebar');
    });
  });

  describe('#scrollToAnchor', () => {
    it("invokes the document integration's `scrollToAnchor` implementation", () => {
      const guest = createGuest();
      const anchor = {};

      guest.scrollToAnchor(anchor);

      assert.calledWith(fakeIntegration.scrollToAnchor, anchor);
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
    it('creates an annotation if host calls "createAnnotationIn" RPC method', async () => {
      createGuest();

      emitHostEvent('createAnnotationIn', 'dummy');
      await delay(0);

      assert.notCalled(sidebarBridge().call);

      emitHostEvent('createAnnotationIn', null);
      await delay(0);

      assert.calledWith(sidebarBridge().call, 'createAnnotation');
    });

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

    it('triggers a "createAnnotation" event', async () => {
      const guest = createGuest();

      const annotation = await guest.createAnnotation();

      assert.calledWith(sidebarBridge().call, 'createAnnotation', annotation);
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
        assert.calledWith(
          sidebarBridge().call,
          'syncAnchoringStatus',
          annotation
        );
      });
    });

    it('calls "syncAnchoringStatus" RPC method', async () => {
      const guest = createGuest();
      const annotation = {};

      await guest.anchor(annotation);

      assert.match(sidebarBridge().call.lastCall.args, [
        'syncAnchoringStatus',
        annotation,
      ]);
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

      // Focus the annotation (in the sidebar) before it is anchored in the page.
      const [, focusAnnotationsCallback] = sidebarBridge().on.args.find(
        args => args[0] === 'focusAnnotations'
      );
      focusAnnotationsCallback([annotation.$tag]);
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
      const anchor = createAnchor();

      guest.detach(anchor.annotation.$tag);

      assert.calledOnce(fakeBucketBarClient.update);
    });
  });

  describe('#destroy', () => {
    it('disconnects from sidebar events', () => {
      const guest = createGuest();
      guest.destroy();
      assert.calledOnce(sidebarBridge().destroy);
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
      assert.called(sidebarBridge().destroy);
    });

    it('notifies host frame that guest has been unloaded', () => {
      const guest = createGuest({ subFrameIdentifier: 'frame-id' });

      guest.destroy();

      assert.calledWith(
        hostFrame.postMessage,
        {
          type: 'hypothesisGuestUnloaded',
          frameIdentifier: 'frame-id',
        },
        '*'
      );
    });
  });

  it('notifies host frame when guest frame is unloaded', () => {
    createGuest({ subFrameIdentifier: 'frame-id' });

    window.dispatchEvent(new Event('unload'));

    assert.calledWith(
      hostFrame.postMessage,
      {
        type: 'hypothesisGuestUnloaded',
        frameIdentifier: 'frame-id',
      },
      '*'
    );
  });

  it('stops injecting client into annotation-enabled iframes', () => {
    const guest = createGuest();
    guest.destroy();
    assert.calledWith(fakeHypothesisInjector.destroy);
  });

  it('discovers and creates a channel for communication with the sidebar', async () => {
    const { port1 } = new MessageChannel();
    fakePortFinder.discover.resolves(port1);
    createGuest();

    await delay(0);

    assert.calledWith(sidebarBridge().createChannel, port1);
  });

  it('configures the BucketBarClient if guest is the main annotatable frame', () => {
    const contentContainer = document.createElement('div');
    fakeIntegration.contentContainer.returns(contentContainer);

    createGuest();

    assert.calledWith(FakeBucketBarClient, {
      contentContainer,
      hostRPC: hostBridge(),
    });
  });

  it('does not configure the BucketBarClient if guest is the main annotatable frame', () => {
    createGuest({ subFrameIdentifier: 'frame-id' });

    assert.notCalled(FakeBucketBarClient);
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

  describe('#injectClient', () => {
    it('injects client into target frame', async () => {
      const config = {};
      const guest = createGuest({});
      const frame = {};

      await guest.injectClient(frame);

      assert.calledWith(FakeHypothesisInjector, guest.element, config);
      assert.calledWith(fakeHypothesisInjector.injectClient, frame);
    });
  });
});
