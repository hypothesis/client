import { delay } from '../../test-util/wait';
import Guest, { $imports } from '../guest';
import { EventBus } from '../util/emitter';

const sandbox = sinon.createSandbox();

class FakeAdder {
  constructor(container, options) {
    FakeAdder.instance = this;

    this.hide = sandbox.stub();
    this.show = sandbox.stub();
    this.destroy = sandbox.stub();
    this.options = options;
  }
}
FakeAdder.instance = null;

class FakeTextRange {
  constructor(range) {
    this.range = range;
  }

  toRange() {
    return this.range();
  }

  static fromRange(range) {
    return new FakeTextRange(() => range);
  }
}

describe('Guest', () => {
  let eventBus;
  let guest;
  let guests;
  let highlighter;
  let hostFrame;
  let notifySelectionChanged;
  let rangeUtil;

  let fakeBridge;
  let fakeIntegration;
  let FakeHypothesisInjector;
  let fakeHypothesisInjector;
  let fakePortFinder;

  const createGuest = (config = {}) => {
    const element = document.createElement('div');
    eventBus = new EventBus();
    const guest = new Guest(element, eventBus, config, hostFrame);
    guests.push(guest);
    return guest;
  };

  const emitSidebarEvent = (event, ...args) => {
    for (let [evt, fn] of fakeBridge.on.args) {
      if (event === evt) {
        fn(...args);
      }
    }
  };

  let nextTagId = 0;
  const makeAnnotation = ({ target = [] } = {}) => {
    return { target, uri: 'uri', $tag: `t${nextTagId++}` };
  };

  const makeAnchor = ({
    target,
    range = () => [],
    highlights = [document.createElement('span')],
  } = {}) => {
    const annotation = makeAnnotation({ target });
    const anchor = {
      annotation,
      highlights,
      range: new FakeTextRange(range),
    };
    guest.anchors.push(anchor);
    guest.setAnnotations(annotation.$tag, [anchor]);
    return anchor;
  };

  beforeEach(() => {
    guests = [];
    highlighter = {
      getHighlightsContainingNode: sandbox.stub().returns([]),
      highlightRange: sandbox.stub().returns([]),
      removeHighlights: sandbox.stub(),
      removeAllHighlights: sandbox.stub(),
      setHighlightsFocused: sandbox.stub(),
      setHighlightsVisible: sandbox.stub(),
    };
    hostFrame = {
      postMessage: sandbox.stub(),
    };
    notifySelectionChanged = null;
    rangeUtil = {
      itemsForRange: sandbox.stub().returns([]),
      isSelectionBackwards: sandbox.stub(),
      selectionFocusRect: sandbox.stub(),
    };

    FakeAdder.instance = null;

    fakeBridge = {
      call: sandbox.stub(),
      createChannel: sandbox.stub(),
      destroy: sandbox.stub(),
      on: sandbox.stub(),
    };

    fakeIntegration = {
      anchor: sandbox.stub(),
      canAnnotate: sandbox.stub().returns(true),
      contentContainer: sandbox.stub().returns({}),
      describe: sandbox.stub(),
      destroy: sandbox.stub(),
      fitSideBySide: sandbox.stub().returns(false),
      getMetadata: sandbox.stub().resolves({
        title: 'Test title',
        documentFingerprint: 'test-fingerprint',
      }),
      scrollToAnchor: sandbox.stub().resolves(),
      uri: sandbox.stub().resolves('https://example.com/test.pdf'),
    };

    fakeHypothesisInjector = {
      destroy: sandbox.stub(),
      injectClient: sandbox.stub().resolves(),
    };
    FakeHypothesisInjector = sandbox.stub().returns(fakeHypothesisInjector);

    fakePortFinder = {
      discover: sandbox.stub(),
      destroy: sandbox.stub(),
    };

    class FakeSelectionObserver {
      constructor(callback) {
        notifySelectionChanged = callback;
        this.disconnect = sandbox.stub();
      }
    }

    $imports.$mock({
      '../shared/bridge': { Bridge: sandbox.stub().returns(fakeBridge) },
      '../shared/port-finder': {
        PortFinder: sandbox.stub().returns(fakePortFinder),
      },
      './adder': { Adder: FakeAdder },
      './anchoring/text-range': {
        TextRange: FakeTextRange,
      },
      './integrations': {
        createIntegration: sandbox.stub().returns(fakeIntegration),
      },
      './highlighter': highlighter,
      './hypothesis-injector': { HypothesisInjector: FakeHypothesisInjector },
      './range-util': rangeUtil,
      './selection-observer': {
        SelectionObserver: FakeSelectionObserver,
      },
    });

    guest = createGuest();
  });

  afterEach(() => {
    guests.forEach(guest => guest.destroy());
    sandbox.restore();
    $imports.$restore();
  });

  describe('communication with sidebar component', () => {
    describe('event subscription', () => {
      let emitter;

      beforeEach(() => {
        emitter = eventBus.createEmitter();
      });

      afterEach(() => {
        emitter.destroy();
      });

      it('proxies the event into the annotator event system', () => {
        const fooHandler = sandbox.stub();
        const barHandler = sandbox.stub();

        emitter.subscribe('foo', fooHandler);
        emitter.subscribe('bar', barHandler);

        guest._emitter.publish('foo', '1', '2');
        guest._emitter.publish('bar', '1', '2');

        assert.calledWith(fooHandler, '1', '2');
        assert.calledWith(barHandler, '1', '2');
      });
    });

    describe('event publication', () => {
      let emitter;

      beforeEach(() => {
        emitter = eventBus.createEmitter();
      });

      it('proxies all other events into the annotator event system', () => {
        const fooHandler = sandbox.stub();
        const barHandler = sandbox.stub();

        guest._emitter.subscribe('foo', fooHandler);
        guest._emitter.subscribe('bar', barHandler);

        emitter.publish('foo', '1', '2');
        emitter.publish('bar', '1', '2');

        assert.calledWith(fooHandler, '1', '2');
        assert.calledWith(barHandler, '1', '2');
      });
    });
  });

  describe('events from sidebar frame', () => {
    describe('on "focusAnnotations" event', async () => {
      it('focuses any annotations with a matching tag', () => {
        const { annotation, highlights } = makeAnchor();

        emitSidebarEvent('focusAnnotations', [annotation.$tag]);

        assert.calledWith(highlighter.setHighlightsFocused, highlights, true);
      });

      it('unfocuses any annotations without a matching tag', () => {
        const { annotation, highlights } = makeAnchor();
        emitSidebarEvent('focusAnnotations', [annotation.$tag]);
        highlighter.setHighlightsFocused.resetHistory();

        emitSidebarEvent('focusAnnotations', ['dummy']);

        assert.calledWith(highlighter.setHighlightsFocused, highlights, false);
      });
    });

    describe('on "scrollToAnnotation" event', () => {
      it('scrolls to the anchor with the matching tag', () => {
        const { annotation } = makeAnchor();

        emitSidebarEvent('scrollToAnnotation', annotation.$tag);

        assert.called(fakeIntegration.scrollToAnchor);
        assert.calledWith(fakeIntegration.scrollToAnchor, guest.anchors[0]);
      });

      it('emits a "scrolltorange" DOM event', () => {
        const { annotation } = makeAnchor({ range: () => [1] });
        const callback = sandbox.stub();
        guest.element.addEventListener('scrolltorange', callback);

        emitSidebarEvent('scrollToAnnotation', annotation.$tag);

        assert.calledWith(callback, sandbox.match({ detail: [1] }));
      });

      it('allows the default scroll behaviour to be prevented', () => {
        const { annotation } = makeAnchor();
        guest.element.addEventListener('scrolltorange', event =>
          event.preventDefault()
        );

        emitSidebarEvent('scrollToAnnotation', annotation.$tag);

        assert.notCalled(fakeIntegration.scrollToAnchor);
      });

      it('does nothing if the anchor has no highlights', () => {
        const { annotation } = makeAnchor({ highlights: null });

        emitSidebarEvent('scrollToAnnotation', annotation.$tag);

        assert.notCalled(fakeIntegration.scrollToAnchor);
      });

      it("does nothing if the anchor's range cannot be resolved", () => {
        const { annotation } = makeAnchor({
          range: () => {
            throw new Error('Something went wrong');
          },
        });
        const callback = sandbox.stub();
        guest.element.addEventListener('scrolltorange', callback);

        emitSidebarEvent('scrollToAnnotation', annotation.$tag);

        assert.notCalled(callback);
        assert.notCalled(fakeIntegration.scrollToAnchor);
      });
    });

    describe('on "getDocumentInfo" event', () => {
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
        const annotation1 = makeAnnotation();
        const annotation2 = makeAnnotation();

        emitSidebarEvent('loadAnnotations', [annotation1, annotation2]);
        await delay(0);

        assert.calledTwice(fakeBridge.call);
        assert.calledWith(
          fakeBridge.call,
          'syncAnchoringStatus',
          sandbox.match(annotation1)
        );
        assert.calledWith(
          fakeBridge.call,
          'syncAnchoringStatus',
          sandbox.match(annotation2)
        );
      });
    });

    describe('on "deleteAnnotation" event', () => {
      it('defers detach annotation until it is anchored', async () => {
        const annotation = makeAnnotation();
        const callback = sandbox.stub();
        guest._emitter.subscribe('anchorsChanged', callback);

        emitSidebarEvent('deleteAnnotation', annotation.$tag);

        assert.notCalled(callback);

        emitSidebarEvent('loadAnnotations', [annotation]);
        await delay(0);

        assert.calledOnce(callback);
        assert.calledWith(callback, []);
      });
    });
  });

  describe('document events', () => {
    let fakeHighlight;
    let fakeSidebarFrame;
    let rootElement;

    beforeEach(() => {
      fakeSidebarFrame = null;
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

    ['mousedown', 'touchstart'].forEach(event =>
      it(`hides sidebar on user "${event}" event in the document`, () => {
        rootElement.dispatchEvent(new Event(event));

        assert.calledWith(fakeBridge.call, 'closeSidebar');
      })
    );

    ['mousedown', 'touchstart'].forEach(event =>
      it(`does not hide sidebar on "${event}" event if side-by-side mode is active`, () => {
        // Activate side-by-side mode
        fakeIntegration.fitSideBySide.returns(true);
        guest.fitSideBySide({ expanded: true, width: 100 });

        rootElement.dispatchEvent(new Event(event));

        assert.notCalled(fakeBridge.call);
      })
    );

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
      assert.calledWith(fakeBridge.call, 'focusAnnotations', [
        'highlight-ann-tag',
      ]);

      // Un-hover the highlight
      fakeHighlight.dispatchEvent(new Event('mouseout', { bubbles: true }));
      assert.calledWith(fakeBridge.call, 'focusAnnotations', []);
    });

    it('does not focus annotations in the sidebar when a non-highlight element is hovered', () => {
      rootElement.dispatchEvent(new Event('mouseover', { bubbles: true }));

      assert.calledWith(highlighter.getHighlightsContainingNode, rootElement);
      assert.notCalled(fakeBridge.call);
    });

    it('does not focus or select annotations in the sidebar if highlights are hidden', () => {
      guest.setHighlightsVisible(false);

      fakeHighlight.dispatchEvent(new Event('mouseover', { bubbles: true }));
      fakeHighlight.dispatchEvent(new Event('mouseup', { bubbles: true }));

      assert.calledWith(highlighter.getHighlightsContainingNode, fakeHighlight);
      assert.notCalled(fakeBridge.call);
    });

    it('selects annotations in the sidebar when clicking on a highlight', () => {
      fakeHighlight.dispatchEvent(new Event('mouseup', { bubbles: true }));

      assert.calledWith(fakeBridge.call, 'showAnnotations', [
        'highlight-ann-tag',
      ]);
      assert.calledWith(fakeBridge.call, 'openSidebar');
    });

    it('toggles selected annotations in the sidebar when Ctrl/Cmd-clicking a highlight', () => {
      fakeHighlight.dispatchEvent(
        new MouseEvent('mouseup', { bubbles: true, ctrlKey: true })
      );

      assert.calledWith(fakeBridge.call, 'toggleAnnotationSelection', [
        'highlight-ann-tag',
      ]);
      assert.calledWith(fakeBridge.call, 'openSidebar');
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
      simulateSelectionWithText();
      assert.called(FakeAdder.instance.show);
    });

    it('sets the annotations associated with the selection', () => {
      const annotation = makeAnnotation();
      container._annotation = annotation;
      rangeUtil.itemsForRange.callsFake((range, callback) => [
        callback(range.startContainer),
      ]);
      simulateSelectionWithText();

      assert.deepEqual(FakeAdder.instance.annotationsForSelection, [
        annotation,
      ]);
    });

    it('hides the adder if the selection does not contain text', () => {
      simulateSelectionWithoutText();

      assert.called(FakeAdder.instance.hide);
      assert.notCalled(FakeAdder.instance.show);
    });

    it('hides the adder if the selection is empty', () => {
      notifySelectionChanged(null);
      assert.called(FakeAdder.instance.hide);
    });

    it('hides the adder if the integration indicates that the selection cannot be annotated', () => {
      // Simulate integration indicating text is not part of annotatable content
      // (eg. text that is part of the PDF.js UI)
      fakeIntegration.canAnnotate.returns(false);

      simulateSelectionWithText();

      assert.notCalled(FakeAdder.instance.show);
    });

    it('emits `hasSelectionChanged` event with argument `true` if selection is non-empty', () => {
      const callback = sandbox.stub();
      guest._emitter.subscribe('hasSelectionChanged', callback);

      simulateSelectionWithText();

      assert.calledWith(callback, true);
    });

    it('emits `hasSelectionChanged` event with argument `false` if selection is empty', () => {
      const callback = sandbox.stub();
      guest._emitter.subscribe('hasSelectionChanged', callback);

      simulateSelectionWithoutText();

      assert.calledWith(callback, false);
    });
  });

  describe('when adder toolbar buttons are clicked', () => {
    // nb. Detailed tests for properties of new annotations are in the
    // `createAnnotation` tests.
    it('creates a new annotation if "Annotate" is clicked', async () => {
      await FakeAdder.instance.options.onAnnotate();

      assert.calledWith(fakeBridge.call, 'createAnnotation');
    });

    it('creates a new highlight if "Highlight" is clicked', async () => {
      await FakeAdder.instance.options.onHighlight();

      assert.calledWith(
        fakeBridge.call,
        'createAnnotation',
        sandbox.match({ $highlight: true })
      );
    });

    it('shows annotations if "Show" is clicked', () => {
      FakeAdder.instance.options.onShowAnnotations([{ $tag: 'ann1' }]);

      assert.calledWith(fakeBridge.call, 'openSidebar');
      assert.calledWith(fakeBridge.call, 'showAnnotations', ['ann1']);
    });
  });

  describe('#selectAnnotations', () => {
    it('selects the specified annotations in the sidebar', () => {
      const annotations = [{ $tag: 'ann1' }, { $tag: 'ann2' }];

      guest.selectAnnotations(annotations);

      assert.calledWith(fakeBridge.call, 'showAnnotations', ['ann1', 'ann2']);
    });

    it('toggles the annotations if `toggle` is true', () => {
      const annotations = [{ $tag: 'ann1' }, { $tag: 'ann2' }];

      guest.selectAnnotations(annotations, true /* toggle */);

      assert.calledWith(fakeBridge.call, 'toggleAnnotationSelection', [
        'ann1',
        'ann2',
      ]);
    });

    it('opens the sidebar', () => {
      guest.selectAnnotations([]);

      assert.calledWith(fakeBridge.call, 'openSidebar');
    });
  });

  describe('#scrollToAnchor', () => {
    it("invokes the document integration's `scrollToAnchor` implementation", () => {
      const anchor = {};

      guest.scrollToAnchor(anchor);

      assert.calledWith(fakeIntegration.scrollToAnchor, anchor);
    });
  });

  describe('#getDocumentInfo', () => {
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
      fakeIntegration.uri.rejects(new Error('Failed to get URI'));
      await assert.rejects(guest.getDocumentInfo(), 'Failed to get URI');
    });

    it('rejects if getting the document metadata fails', async () => {
      fakeIntegration.getMetadata.rejects(new Error('Failed to get URI'));
      await assert.rejects(guest.getDocumentInfo(), 'Failed to get URI');
    });
  });

  describe('#createAnnotation', () => {
    it('adds document metadata to the annotation', async () => {
      const annotation = await guest.createAnnotation();

      assert.equal(annotation.uri, await fakeIntegration.uri());
      assert.deepEqual(
        annotation.document,
        await fakeIntegration.getMetadata()
      );
    });

    it('adds selectors for selected ranges to the annotation', async () => {
      const fakeRange = {};
      guest.selectedRanges = [fakeRange];

      const selectorA = { type: 'TextPositionSelector', start: 0, end: 10 };
      const selectorB = { type: 'TextQuoteSelector', exact: 'foobar' };
      fakeIntegration.anchor.resolves({});
      fakeIntegration.describe.resolves([selectorA, selectorB]);

      const annotation = await guest.createAnnotation();

      assert.calledWith(fakeIntegration.describe, guest.element, fakeRange);
      assert.deepEqual(annotation.target, [
        {
          source: await fakeIntegration.uri(),
          selector: [selectorA, selectorB],
        },
      ]);
    });

    it('sets `$tag` property', async () => {
      const annotation = await guest.createAnnotation();
      assert.match(annotation.$tag, /a:\w{8}/);
    });

    it('sets falsey `$highlight` if `highlight` is false', async () => {
      const annotation = await guest.createAnnotation();
      assert.notOk(annotation.$highlight);
    });

    it('sets `$highlight` to true if `highlight` is true', async () => {
      const annotation = await guest.createAnnotation({ highlight: true });
      assert.equal(annotation.$highlight, true);
    });

    it('triggers a "createAnnotation" event', async () => {
      const annotation = await guest.createAnnotation();

      assert.calledWith(fakeBridge.call, 'createAnnotation', annotation);
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
      const annotation = makeAnnotation({ target: [] });

      return guest
        .anchor(annotation)
        .then(() => assert.isFalse(annotation.$orphan));
    });

    it("doesn't mark an annotation with a selectorless target as an orphan", () => {
      const annotation = makeAnnotation({ target: [{ source: 'wibble' }] });

      return guest
        .anchor(annotation)
        .then(() => assert.isFalse(annotation.$orphan));
    });

    it("doesn't mark an annotation with only selectorless targets as an orphan", () => {
      const annotation = makeAnnotation({
        target: [{ source: 'foo' }, { source: 'bar' }],
      });

      return guest
        .anchor(annotation)
        .then(() => assert.isFalse(annotation.$orphan));
    });

    it("doesn't mark an annotation in which the target anchors as an orphan", () => {
      const annotation = makeAnnotation({
        target: [{ selector: [{ type: 'TextQuoteSelector', exact: 'hello' }] }],
      });
      fakeIntegration.anchor.resolves(range);

      return guest
        .anchor(annotation)
        .then(() => assert.isFalse(annotation.$orphan));
    });

    it("doesn't mark an annotation in which at least one target anchors as an orphan", () => {
      const annotation = makeAnnotation({
        target: [
          { selector: [{ type: 'TextQuoteSelector', exact: 'notinhere' }] },
          { selector: [{ type: 'TextQuoteSelector', exact: 'hello' }] },
        ],
      });
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
      const annotation = makeAnnotation({
        target: [
          { selector: [{ type: 'TextQuoteSelector', exact: 'notinhere' }] },
        ],
      });
      fakeIntegration.anchor.rejects(new Error('Failed to anchor'));

      return guest
        .anchor(annotation)
        .then(() => assert.isTrue(annotation.$orphan));
    });

    it('marks an annotation in which all (suitable) targets fail to anchor as an orphan', () => {
      const annotation = makeAnnotation({
        target: [
          { selector: [{ type: 'TextQuoteSelector', exact: 'notinhere' }] },
          { selector: [{ type: 'TextQuoteSelector', exact: 'neitherami' }] },
        ],
      });
      fakeIntegration.anchor.rejects(new Error('Failed to anchor'));

      return guest
        .anchor(annotation)
        .then(() => assert.isTrue(annotation.$orphan));
    });

    it('marks an annotation where the target has no TextQuoteSelectors as an orphan', () => {
      const annotation = makeAnnotation({
        target: [
          { selector: [{ type: 'TextPositionSelector', start: 0, end: 5 }] },
        ],
      });
      // This shouldn't be called, but if it is, we successfully anchor so that
      // this test is guaranteed to fail.
      fakeIntegration.anchor.resolves(range);

      return guest
        .anchor(annotation)
        .then(() => assert.isTrue(annotation.$orphan));
    });

    it('does not attempt to anchor targets which have no TextQuoteSelector', () => {
      const annotation = makeAnnotation({
        target: [
          { selector: [{ type: 'TextPositionSelector', start: 0, end: 5 }] },
        ],
      });

      return guest
        .anchor(annotation)
        .then(() => assert.notCalled(fakeIntegration.anchor));
    });

    it('syncs annotations to the sidebar', () => {
      const annotation = makeAnnotation();
      return guest.anchor(annotation).then(() => {
        assert.calledWith(fakeBridge.call, 'syncAnchoringStatus', annotation);
      });
    });

    it('emits an `anchorsChanged` event', async () => {
      const annotation = makeAnnotation();
      const callback = sandbox.stub();
      guest._emitter.subscribe('anchorsChanged', callback);

      await guest.anchor(annotation);

      assert.calledWith(callback, guest.anchors);
    });

    it('returns a promise of the anchors for the annotation', () => {
      const annotation = makeAnnotation({
        target: [{ selector: [{ type: 'TextQuoteSelector', exact: 'hello' }] }],
      });
      fakeIntegration.anchor.resolves(range);

      return guest
        .anchor(annotation)
        .then(anchors => assert.equal(anchors.length, 1));
    });

    it('adds the anchor to the "anchors" instance property"', () => {
      const annotation = makeAnnotation({
        target: [{ selector: [{ type: 'TextQuoteSelector', exact: 'hello' }] }],
      });
      fakeIntegration.anchor.resolves(range);
      const highlights = [document.createElement('span')];
      highlighter.highlightRange.returns(highlights);

      return guest.anchor(annotation).then(() => {
        assert.equal(guest.anchors.length, 1);
        assert.strictEqual(guest.anchors[0].annotation, annotation);
        assert.strictEqual(guest.anchors[0].target, annotation.target[0]);
        assert.strictEqual(guest.anchors[0].range.toRange(), range);
        assert.strictEqual(guest.anchors[0].highlights, highlights);
      });
    });

    it('destroys targets that have been removed from the annotation', () => {
      const { annotation, highlights } = makeAnchor();
      const { removeHighlights } = highlighter;

      return guest.anchor(annotation).then(() => {
        assert.equal(guest.anchors.length, 0);
        assert.calledOnce(removeHighlights);
        assert.calledWith(removeHighlights, highlights);
      });
    });

    it('focuses the new highlights if the annotation is already focused', async () => {
      const annotation = makeAnnotation({
        target: [{ selector: [{ type: 'TextQuoteSelector', exact: 'hello' }] }],
      });
      fakeIntegration.anchor.resolves(range);

      // Focus the annotation (in the sidebar) before it is anchored in the page.
      emitSidebarEvent('focusAnnotations', [annotation.$tag]);
      const anchors = await guest.anchor(annotation);

      // Check that the new highlights are already in the focused state.
      assert.equal(anchors.length, 1);
      assert.calledWith(
        highlighter.setHighlightsFocused,
        anchors[0].highlights,
        true
      );
    });
  });

  describe('#detach', () => {
    it('removes anchors associated with the removed annotation', () => {
      const anchor = makeAnchor();

      guest.detach(anchor.annotation.$tag);

      assert.equal(guest.anchors.length, 0);
    });

    it('removes any highlights associated with the annotation', () => {
      const anchor = makeAnchor();
      const { removeHighlights } = highlighter;

      guest.detach(anchor.annotation.$tag);

      assert.calledOnce(removeHighlights);
      assert.calledWith(removeHighlights, anchor.highlights);
    });

    it('keeps anchors and highlights associated with other annotations', () => {
      const anchor1 = makeAnchor();
      const anchor2 = makeAnchor();

      guest.detach(anchor1.annotation.$tag);

      assert.include(guest.anchors, anchor2);
      assert.isFalse(
        highlighter.removeHighlights.calledWith(anchor2.highlights)
      );
    });

    it('emits an `anchorsChanged` event with updated anchors', () => {
      const anchor = makeAnchor();
      const callback = sandbox.stub();
      guest._emitter.subscribe('anchorsChanged', callback);

      guest.detach(anchor.annotation.$tag);

      assert.calledWith(callback, guest.anchors);
    });
  });

  describe('#destroy', () => {
    it('disconnects from sidebar events', () => {
      guest.destroy();
      assert.calledOnce(fakeBridge.destroy);
    });

    it('removes the adder toolbar', () => {
      guest.destroy();

      assert.calledOnce(FakeAdder.instance.destroy);
    });

    it('cleans up integration', () => {
      guest.destroy();
      assert.calledOnce(fakeIntegration.destroy);
    });

    it('removes all highlights', () => {
      guest.destroy();
      assert.calledWith(highlighter.removeAllHighlights, guest.element);
    });

    it('disconnects from sidebar', () => {
      guest.destroy();
      assert.called(fakeBridge.destroy);
    });

    it('notifies host frame that guest has been unloaded', () => {
      guest = createGuest({ subFrameIdentifier: 'frame-id' });

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
    guest.destroy();
    assert.calledWith(fakeHypothesisInjector.destroy);
  });

  it('discovers and creates a channel for communication with the sidebar', async () => {
    const { port1 } = new MessageChannel();
    fakePortFinder.discover.resolves(port1);
    createGuest();

    await delay(0);

    assert.calledWith(fakeBridge.createChannel, port1);
  });

  describe('#contentContainer', () => {
    it('returns document content container', () => {
      assert.equal(
        guest.contentContainer(),
        fakeIntegration.contentContainer()
      );
    });
  });

  describe('#fitSideBySide', () => {
    it('attempts to fit content alongside sidebar', () => {
      fakeIntegration.fitSideBySide.returns(false);
      const layout = { expanded: true, width: 100 };

      guest.fitSideBySide(layout);

      assert.calledWith(fakeIntegration.fitSideBySide, layout);
    });

    it('enables closing sidebar on document click if side-by-side is not activated', () => {
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
      guest = createGuest({});
      const frame = {};

      await guest.injectClient(frame);

      assert.calledWith(FakeHypothesisInjector, guest.element, config);
      assert.calledWith(fakeHypothesisInjector.injectClient, frame);
    });
  });
});
