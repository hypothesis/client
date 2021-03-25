import Guest from '../guest';
import { EventBus } from '../util/emitter';
import { $imports } from '../guest';

const scrollIntoView = sinon.stub();

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
  let highlighter;
  let guestConfig;
  let htmlAnchoring;
  let rangeUtil;
  let notifySelectionChanged;

  let CrossFrame;
  let fakeCrossFrame;

  let DocumentMeta;
  let fakeDocumentMeta;

  let PDFIntegration;
  let fakePDFIntegration;

  const createGuest = (config = {}) => {
    const element = document.createElement('div');
    const eventBus = new EventBus();
    return new Guest(element, eventBus, { ...guestConfig, ...config });
  };

  beforeEach(() => {
    FakeAdder.instance = null;
    guestConfig = {};
    highlighter = {
      highlightRange: sinon.stub().returns([]),
      removeHighlights: sinon.stub(),
      removeAllHighlights: sinon.stub(),
      setHighlightsFocused: sinon.stub(),
      setHighlightsVisible: sinon.stub(),
    };
    htmlAnchoring = {
      anchor: sinon.stub(),
      describe: sinon.stub(),
    };
    rangeUtil = {
      itemsForRange: sinon.stub().returns([]),
      isSelectionBackwards: sinon.stub(),
      selectionFocusRect: sinon.stub(),
    };
    notifySelectionChanged = null;

    fakeCrossFrame = {
      onConnect: sinon.stub(),
      on: sinon.stub(),
      call: sinon.stub(),
      sync: sinon.stub(),
      destroy: sinon.stub(),
    };
    CrossFrame = sandbox.stub().returns(fakeCrossFrame);

    fakeDocumentMeta = {
      destroy: sinon.stub(),
      getDocumentMetadata: sinon.stub().returns({ title: 'Test title' }),
      uri: sinon.stub().returns('https://example.com/test.html'),
    };
    DocumentMeta = sandbox.stub().returns(fakeDocumentMeta);

    fakePDFIntegration = {
      contentContainer: sinon.stub().returns({}),
      destroy: sinon.stub(),
      fitSideBySide: sinon.stub().returns(false),
      getMetadata: sinon
        .stub()
        .resolves({ documentFingerprint: 'test-fingerprint' }),
      uri: sinon.stub().resolves('https://example.com/test.pdf'),
    };
    PDFIntegration = sinon.stub().returns(fakePDFIntegration);

    class FakeSelectionObserver {
      constructor(callback) {
        notifySelectionChanged = callback;
        this.disconnect = sinon.stub();
      }
    }

    $imports.$mock({
      './adder': { Adder: FakeAdder },
      './anchoring/html': htmlAnchoring,
      './anchoring/text-range': {
        TextRange: FakeTextRange,
      },
      './integrations/pdf': { PDFIntegration },
      './highlighter': highlighter,
      './range-util': rangeUtil,
      './plugin/cross-frame': CrossFrame,
      './plugin/document': DocumentMeta,
      './selection-observer': {
        SelectionObserver: FakeSelectionObserver,
      },
      'scroll-into-view': scrollIntoView,
    });
  });

  afterEach(() => {
    sandbox.restore();
    $imports.$restore();
  });

  describe('cross frame', () => {
    it('provides an event bus for the annotation sync module', () => {
      createGuest();
      const options = CrossFrame.lastCall.args[1];
      assert.isFunction(options.on);
      assert.isFunction(options.emit);
    });

    it('publishes the "panelReady" event when a connection is established', () => {
      const handler = sandbox.stub();
      const guest = createGuest();
      guest._emitter.subscribe('panelReady', handler);
      fakeCrossFrame.onConnect.yield();
      assert.called(handler);
    });

    describe('event subscription', () => {
      let options;
      let guest;

      beforeEach(() => {
        guest = createGuest();
        options = CrossFrame.lastCall.args[1];
      });

      it('proxies the event into the annotator event system', () => {
        const fooHandler = sandbox.stub();
        const barHandler = sandbox.stub();

        options.on('foo', fooHandler);
        options.on('bar', barHandler);

        guest._emitter.publish('foo', '1', '2');
        guest._emitter.publish('bar', '1', '2');

        assert.calledWith(fooHandler, '1', '2');
        assert.calledWith(barHandler, '1', '2');
      });
    });

    describe('event publication', () => {
      let options;
      let guest;

      beforeEach(() => {
        guest = createGuest();
        options = CrossFrame.lastCall.args[1];
      });

      it('detaches annotations on "annotationDeleted"', () => {
        const ann = { id: 1, $tag: 'tag1' };
        sandbox.stub(guest, 'detach');
        options.emit('annotationDeleted', ann);
        assert.calledOnce(guest.detach);
        assert.calledWith(guest.detach, ann);
      });

      it('anchors annotations on "annotationsLoaded"', () => {
        const ann1 = { id: 1, $tag: 'tag1' };
        const ann2 = { id: 2, $tag: 'tag2' };
        sandbox.stub(guest, 'anchor');
        options.emit('annotationsLoaded', [ann1, ann2]);
        assert.calledTwice(guest.anchor);
        assert.calledWith(guest.anchor, ann1);
        assert.calledWith(guest.anchor, ann2);
      });

      it('proxies all other events into the annotator event system', () => {
        const fooHandler = sandbox.stub();
        const barHandler = sandbox.stub();

        guest._emitter.subscribe('foo', fooHandler);
        guest._emitter.subscribe('bar', barHandler);

        options.emit('foo', '1', '2');
        options.emit('bar', '1', '2');

        assert.calledWith(fooHandler, '1', '2');
        assert.calledWith(barHandler, '1', '2');
      });
    });
  });

  describe('events from sidebar', () => {
    const emitGuestEvent = (event, ...args) => {
      for (let [evt, fn] of fakeCrossFrame.on.args) {
        if (event === evt) {
          fn(...args);
        }
      }
    };

    describe('on "focusAnnotations" event', () => {
      it('focuses any annotations with a matching tag', () => {
        const highlight0 = document.createElement('span');
        const highlight1 = document.createElement('span');
        const guest = createGuest();
        guest.anchors = [
          { annotation: { $tag: 'tag1' }, highlights: [highlight0] },
          { annotation: { $tag: 'tag2' }, highlights: [highlight1] },
        ];

        emitGuestEvent('focusAnnotations', ['tag1']);

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

        emitGuestEvent('focusAnnotations', ['tag1']);

        assert.calledWith(
          highlighter.setHighlightsFocused,
          guest.anchors[1].highlights,
          false
        );
      });
    });

    describe('on "scrollToAnnotation" event', () => {
      beforeEach(() => {
        scrollIntoView.reset();
      });

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

        emitGuestEvent('scrollToAnnotation', 'tag1');

        assert.called(scrollIntoView);
        assert.calledWith(scrollIntoView, highlight);
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

          emitGuestEvent('scrollToAnnotation', 'tag1');
        });
      });

      it('allows the default scroll behaviour to be prevented', () => {
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
        guest.element.addEventListener('scrolltorange', event =>
          event.preventDefault()
        );

        emitGuestEvent('scrollToAnnotation', 'tag1');

        assert.notCalled(scrollIntoView);
      });

      it("does nothing if the anchor's range cannot be resolved", () => {
        const highlight = document.createElement('span');
        const guest = createGuest();
        guest.anchors = [
          {
            annotation: { $tag: 'tag1' },
            highlights: [highlight],
            range: {
              toRange: sinon.stub().throws(new Error('Something went wrong')),
            },
          },
        ];
        const eventEmitted = sinon.stub();
        guest.element.addEventListener('scrolltorange', eventEmitted);

        emitGuestEvent('scrollToAnnotation', 'tag1');

        assert.notCalled(eventEmitted);
        assert.notCalled(scrollIntoView);
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

      context('in an HTML document', () => {
        it('calls the callback with HTML URL and metadata', done => {
          guest = createGuest();

          emitGuestEvent(
            'getDocumentInfo',
            createCallback(
              fakeDocumentMeta.uri(),
              fakeDocumentMeta.getDocumentMetadata(),
              done
            )
          );
        });
      });

      context('in a PDF document', () => {
        it('calls the callback with PDF URL and metadata', done => {
          guest = createGuest({ documentType: 'pdf' });
          const metadata = { title: 'hi' };

          fakePDFIntegration.getMetadata.resolves(metadata);

          emitGuestEvent(
            'getDocumentInfo',
            createCallback('https://example.com/test.pdf', metadata, done)
          );
        });

        it('calls the callback with fallback URL if PDF URL cannot be determined', done => {
          guest = createGuest({ documentType: 'pdf' });

          fakePDFIntegration.getMetadata.resolves({});
          fakePDFIntegration.uri.rejects(new Error('Not a PDF document'));

          emitGuestEvent(
            'getDocumentInfo',
            createCallback(window.location.href, {}, done)
          );
        });

        it('calls the callback with fallback metadata if PDF metadata extraction fails', done => {
          guest = createGuest({ documentType: 'pdf' });
          const metadata = {
            title: document.title,
            link: [{ href: window.location.href }],
          };

          fakePDFIntegration.getMetadata.rejects(
            new Error('Not a PDF document')
          );

          emitGuestEvent(
            'getDocumentInfo',
            createCallback('https://example.com/test.pdf', metadata, done)
          );
        });
      });
    });

    describe('on "setVisibleHighlights" event', () => {
      it('sets visibility of highlights in document', () => {
        const guest = createGuest();

        emitGuestEvent('setVisibleHighlights', true);
        assert.calledWith(
          highlighter.setHighlightsVisible,
          guest.element,
          true
        );

        emitGuestEvent('setVisibleHighlights', false);
        assert.calledWith(
          highlighter.setHighlightsVisible,
          guest.element,
          false
        );
      });
    });
  });

  describe('document events', () => {
    let fakeSidebarFrame;
    let guest;
    let rootElement;

    beforeEach(() => {
      fakeSidebarFrame = null;
      guest = createGuest();
      rootElement = guest.element;
    });

    afterEach(() => {
      fakeSidebarFrame?.remove();
    });

    it('hides sidebar when the user taps or clicks in the page', () => {
      for (let event of ['click', 'touchstart']) {
        rootElement.dispatchEvent(new Event(event));
        assert.calledWith(guest.crossframe.call, 'closeSidebar');
      }
    });

    it('does not hide sidebar if configured not to close sidebar on document click', () => {
      for (let event of ['click', 'touchstart']) {
        guest.closeSidebarOnDocumentClick = false;
        rootElement.dispatchEvent(new Event(event));
        assert.notCalled(guest.crossframe.call);
      }
    });

    it('does not hide sidebar if event occurs inside annotator UI', () => {
      fakeSidebarFrame = document.createElement('div');
      fakeSidebarFrame.className = 'annotator-frame';
      rootElement.appendChild(fakeSidebarFrame);

      for (let event of ['click', 'touchstart']) {
        fakeSidebarFrame.dispatchEvent(new Event(event, { bubbles: true }));
        assert.notCalled(guest.crossframe.call);
      }
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

    it('emits `hasSelectionChanged` event with argument `true` if selection is non-empty', () => {
      const guest = createGuest();
      const callback = sinon.stub();
      guest._emitter.subscribe('hasSelectionChanged', callback);

      simulateSelectionWithText();

      assert.calledWith(callback, true);
    });

    it('emits `hasSelectionChanged` event with argument `false` if selection is empty', () => {
      const guest = createGuest();
      const callback = sinon.stub();
      guest._emitter.subscribe('hasSelectionChanged', callback);

      simulateSelectionWithoutText();

      assert.calledWith(callback, false);
    });
  });

  describe('when adder toolbar buttons are clicked', () => {
    // nb. Detailed tests for properties of new annotations are in the
    // `createAnnotation` tests.
    it('creates a new annotation if "Annotate" is clicked', async () => {
      const guest = createGuest();
      const callback = sinon.stub();
      guest._emitter.subscribe('beforeAnnotationCreated', callback);

      await FakeAdder.instance.options.onAnnotate();

      assert.called(callback);
    });

    it('creates a new highlight if "Highlight" is clicked', async () => {
      const guest = createGuest();
      const callback = sinon.stub();
      guest._emitter.subscribe('beforeAnnotationCreated', callback);

      await FakeAdder.instance.options.onHighlight();

      assert.calledWith(callback, sinon.match({ $highlight: true }));
    });

    it('shows annotations if "Show" is clicked', () => {
      createGuest();

      FakeAdder.instance.options.onShowAnnotations([{ $tag: 'ann1' }]);

      assert.calledWith(fakeCrossFrame.call, 'openSidebar');
      assert.calledWith(fakeCrossFrame.call, 'showAnnotations', ['ann1']);
    });
  });

  describe('#getDocumentInfo', () => {
    let guest;

    beforeEach(() => {
      guest = createGuest();
    });

    it('preserves the components of the URI other than the fragment', () => {
      fakeDocumentMeta.uri.returns('http://foobar.com/things?id=42');
      return guest
        .getDocumentInfo()
        .then(({ uri }) => assert.equal(uri, 'http://foobar.com/things?id=42'));
    });

    it('removes the fragment identifier from URIs', () => {
      fakeDocumentMeta.uri.returns('http://foobar.com/things?id=42#ignoreme');
      return guest
        .getDocumentInfo()
        .then(({ uri }) => assert.equal(uri, 'http://foobar.com/things?id=42'));
    });
  });

  describe('#createAnnotation', () => {
    it('adds document metadata to the annotation', async () => {
      const guest = createGuest();

      const annotation = await guest.createAnnotation();

      assert.equal(annotation.uri, fakeDocumentMeta.uri());
      assert.deepEqual(
        annotation.document,
        fakeDocumentMeta.getDocumentMetadata()
      );
    });

    it('adds selectors for selected ranges to the annotation', async () => {
      const guest = createGuest();
      const fakeRange = {};
      guest.selectedRanges = [fakeRange];

      const selectorA = { type: 'TextPositionSelector', start: 0, end: 10 };
      const selectorB = { type: 'TextQuoteSelector', exact: 'foobar' };
      htmlAnchoring.anchor.resolves({});
      htmlAnchoring.describe.returns([selectorA, selectorB]);

      const annotation = await guest.createAnnotation({});

      assert.calledWith(htmlAnchoring.describe, guest.element, fakeRange);
      assert.deepEqual(annotation.target, [
        {
          source: fakeDocumentMeta.uri(),
          selector: [selectorA, selectorB],
        },
      ]);
    });

    it('sets `$tag` to a falsey value', async () => {
      const guest = createGuest();
      const annotation = await guest.createAnnotation();
      assert.notOk(annotation.$tag);
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

    it('opens sidebar if `highlight` is false', async () => {
      const guest = createGuest();
      await guest.createAnnotation();
      assert.calledWith(fakeCrossFrame.call, 'openSidebar');
    });

    it('does not open sidebar if `highlight` is true', async () => {
      const guest = createGuest();
      await guest.createAnnotation({ highlight: true });
      assert.notCalled(fakeCrossFrame.call);
    });

    it('triggers a "beforeAnnotationCreated" event', async () => {
      const guest = createGuest();
      const callback = sinon.stub();
      guest._emitter.subscribe('beforeAnnotationCreated', callback);

      const annotation = await guest.createAnnotation();

      assert.calledWith(callback, annotation);
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
      document.body.removeChild(el);
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
      htmlAnchoring.anchor.returns(Promise.resolve(range));

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
      htmlAnchoring.anchor
        .onFirstCall()
        .returns(Promise.reject())
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
      htmlAnchoring.anchor.returns(Promise.reject());

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
      htmlAnchoring.anchor.returns(Promise.reject());

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
      htmlAnchoring.anchor.returns(Promise.resolve(range));

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
        .then(() => assert.notCalled(htmlAnchoring.anchor));
    });

    it('syncs annotations to the sidebar', () => {
      const guest = createGuest();
      guest.crossframe = { sync: sinon.stub() };
      const annotation = {};
      return guest.anchor(annotation).then(() => {
        assert.called(guest.crossframe.sync);
      });
    });

    it('emits an `anchorsChanged` event', async () => {
      const guest = createGuest();
      const annotation = {};
      const anchorsChanged = sinon.stub();
      guest._emitter.subscribe('anchorsChanged', anchorsChanged);

      await guest.anchor(annotation);

      assert.calledWith(anchorsChanged, guest.anchors);
    });

    it('returns a promise of the anchors for the annotation', () => {
      const guest = createGuest();
      const highlights = [document.createElement('span')];
      htmlAnchoring.anchor.returns(Promise.resolve(range));
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
      htmlAnchoring.anchor.returns(Promise.resolve(range));
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

    it('does not reanchor targets that are already anchored', () => {
      const guest = createGuest();
      const annotation = {
        target: [{ selector: [{ type: 'TextQuoteSelector', exact: 'hello' }] }],
      };
      htmlAnchoring.anchor.returns(Promise.resolve(range));
      return guest.anchor(annotation).then(() =>
        guest.anchor(annotation).then(() => {
          assert.equal(guest.anchors.length, 1);
          assert.calledOnce(htmlAnchoring.anchor);
        })
      );
    });
  });

  describe('#detach', () => {
    it('removes the anchors from the "anchors" instance variable', () => {
      const guest = createGuest();
      const annotation = {};
      guest.anchors.push({ annotation });

      guest.detach(annotation);

      assert.equal(guest.anchors.length, 0);
    });

    it('emits an `anchorsChanged` event', () => {
      const guest = createGuest();
      const annotation = {};
      guest.anchors.push({ annotation });
      const anchorsChanged = sinon.stub();
      guest._emitter.subscribe('anchorsChanged', anchorsChanged);

      guest.detach(annotation);

      assert.calledWith(anchorsChanged, guest.anchors);
    });

    it('removes any highlights associated with the annotation', () => {
      const guest = createGuest();
      const annotation = {};
      const highlights = [document.createElement('span')];
      const { removeHighlights } = highlighter;
      guest.anchors.push({ annotation, highlights });

      guest.detach(annotation);

      assert.calledOnce(removeHighlights);
      assert.calledWith(removeHighlights, highlights);
    });
  });

  describe('#destroy', () => {
    it('disconnects from sidebar events', () => {
      const guest = createGuest();
      guest.destroy();
      assert.calledOnce(fakeCrossFrame.destroy);
    });

    it('removes the adder toolbar', () => {
      const guest = createGuest();
      guest.destroy();

      assert.calledOnce(FakeAdder.instance.destroy);
    });

    it('cleans up PDF integration', () => {
      const guest = createGuest({ documentType: 'pdf' });
      guest.destroy();
      assert.calledOnce(fakePDFIntegration.destroy);
    });

    it('removes all highlights', () => {
      const guest = createGuest();
      guest.destroy();
      assert.calledWith(highlighter.removeAllHighlights, guest.element);
    });
  });

  describe('#contentContainer', () => {
    it('returns root element in HTML document', () => {
      const guest = createGuest();
      assert.equal(guest.contentContainer(), guest.element);
    });

    it('returns PDF viewer content container in PDF documents', () => {
      const guest = createGuest({ documentType: 'pdf' });
      assert.equal(
        guest.contentContainer(),
        fakePDFIntegration.contentContainer()
      );
    });
  });

  describe('#fitSideBySide', () => {
    it('does nothing in HTML documents', () => {
      const guest = createGuest();
      guest.fitSideBySide({ expanded: true, width: 100 });
      assert.isTrue(guest.closeSidebarOnDocumentClick);
    });

    it('attempts to fit content alongside sidebar in PDF documents', () => {
      const guest = createGuest({ documentType: 'pdf' });
      fakePDFIntegration.fitSideBySide.returns(false);
      const layout = { expanded: true, width: 100 };

      guest.fitSideBySide(layout);

      assert.calledWith(fakePDFIntegration.fitSideBySide, layout);
    });

    it('enables closing sidebar on document click if side-by-side is not activated', () => {
      const guest = createGuest({ documentType: 'pdf' });
      fakePDFIntegration.fitSideBySide.returns(false);
      const layout = { expanded: true, width: 100 };

      guest.fitSideBySide(layout);
      assert.isTrue(guest.closeSidebarOnDocumentClick);

      fakePDFIntegration.fitSideBySide.returns(true);
      guest.fitSideBySide(layout);
      assert.isFalse(guest.closeSidebarOnDocumentClick);
    });
  });
});
