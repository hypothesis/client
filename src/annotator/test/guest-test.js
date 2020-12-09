import Delegator from '../delegator';
import Guest from '../guest';
import { $imports } from '../guest';

const scrollIntoView = sinon.stub();

class FakeAdder {
  constructor(container, options) {
    FakeAdder.instance = this;

    this.hide = sinon.stub();
    this.show = sinon.stub();
    this.options = options;
  }
}
FakeAdder.instance = null;

class FakePlugin extends Delegator {
  constructor(element, config, annotator) {
    super(element, config);
    this.annotator = annotator;
    FakePlugin.instance = this;
  }
}
FakePlugin.instance = null;

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

// A little helper which returns a promise that resolves after a timeout
const timeoutPromise = (millis = 0) =>
  new Promise(resolve => setTimeout(resolve, millis));

describe('Guest', () => {
  const sandbox = sinon.createSandbox();
  let CrossFrame;
  let fakeCrossFrame;
  let highlighter;
  let guestConfig;
  let htmlAnchoring;
  let rangeUtil;
  let notifySelectionChanged;

  const createGuest = (config = {}) => {
    const element = document.createElement('div');
    return new Guest(element, { ...guestConfig, ...config });
  };

  beforeEach(() => {
    FakeAdder.instance = null;
    guestConfig = { pluginClasses: {} };
    highlighter = {
      highlightRange: sinon.stub().returns([]),
      removeHighlights: sinon.stub(),
      removeAllHighlights: sinon.stub(),
      setHighlightsFocused: sinon.stub(),
      setHighlightsVisible: sinon.stub(),
    };
    htmlAnchoring = {
      anchor: sinon.stub(),
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

    class FakeSelectionObserver {
      constructor(callback) {
        notifySelectionChanged = callback;
        this.disconnect = sinon.stub();
      }
    }

    CrossFrame = sandbox.stub().returns(fakeCrossFrame);
    guestConfig.pluginClasses.CrossFrame = CrossFrame;

    $imports.$mock({
      './adder': { Adder: FakeAdder },
      './anchoring/html': htmlAnchoring,
      './anchoring/text-range': {
        TextRange: FakeTextRange,
      },
      './highlighter': highlighter,
      './range-util': rangeUtil,
      './selection-observer': {
        SelectionObserver: FakeSelectionObserver,
      },
      './delegator': Delegator,
      'scroll-into-view': scrollIntoView,
    });
  });

  afterEach(() => {
    sandbox.restore();
    $imports.$restore();
  });

  describe('plugins', () => {
    let fakePlugin;
    let guest;

    beforeEach(() => {
      FakePlugin.instance = null;
      guestConfig.pluginClasses.FakePlugin = FakePlugin;
      guest = createGuest({ FakePlugin: {} });
      fakePlugin = FakePlugin.instance;
    });

    it('passes guest reference to constructor', () => {
      assert.equal(fakePlugin.annotator, guest);
    });

    it('calls `destroy` method of plugins when guest is destroyed', () => {
      sandbox.spy(fakePlugin, 'destroy');
      guest.destroy();
      assert.called(fakePlugin.destroy);
    });
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
      guest.subscribe('panelReady', handler);
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

        guest.publish('foo', ['1', '2']);
        guest.publish('bar', ['1', '2']);

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

        guest.subscribe('foo', fooHandler);
        guest.subscribe('bar', barHandler);

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

      beforeEach(() => {
        document.title = 'hi';
        guest = createGuest();
        guest.plugins.PDF = {
          uri: sandbox.stub().returns(window.location.href),
          getMetadata: sandbox.stub(),
        };
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('calls the callback with the href and pdf metadata', done => {
        const metadata = { title: 'hi' };
        const assertComplete = (err, payload) => {
          try {
            assert.equal(payload.uri, document.location.href);
            assert.equal(payload.metadata, metadata);
            done();
          } catch (e) {
            done(e);
          }
        };

        const promise = Promise.resolve(metadata);
        guest.plugins.PDF.getMetadata.returns(promise);

        emitGuestEvent('getDocumentInfo', assertComplete);
      });

      it('calls the callback with the href and basic metadata if pdf fails', done => {
        const metadata = {
          title: 'hi',
          link: [{ href: window.location.href }],
        };
        const assertComplete = (err, payload) => {
          try {
            assert.equal(payload.uri, window.location.href);
            assert.deepEqual(payload.metadata, metadata);
            done();
          } catch (e) {
            done(e);
          }
        };

        const promise = Promise.reject(new Error('Not a PDF document'));
        guest.plugins.PDF.getMetadata.returns(promise);

        emitGuestEvent('getDocumentInfo', assertComplete);
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
        assert.calledWith(guest.plugins.CrossFrame.call, 'hideSidebar');
      }
    });

    it('does not hide sidebar if configured not to close sidebar on document click', () => {
      for (let event of ['click', 'touchstart']) {
        guest.closeSidebarOnDocumentClick = false;
        rootElement.dispatchEvent(new Event(event));
        assert.notCalled(guest.plugins.CrossFrame.call);
      }
    });

    it('does not hide sidebar if event occurs inside annotator UI', () => {
      fakeSidebarFrame = document.createElement('div');
      fakeSidebarFrame.className = 'annotator-frame';
      rootElement.appendChild(fakeSidebarFrame);

      for (let event of ['click', 'touchstart']) {
        fakeSidebarFrame.dispatchEvent(new Event(event, { bubbles: true }));
        assert.notCalled(guest.plugins.CrossFrame.call);
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

    it("sets the toolbar's `newAnnotationType` to 'annotation' if there is a selection", () => {
      const guest = createGuest();
      guest.toolbar = {};

      simulateSelectionWithText();

      assert.equal(guest.toolbar.newAnnotationType, 'annotation');
    });

    it("sets the toolbar's `newAnnotationType` to 'note' if the selection is empty", () => {
      const guest = createGuest();
      guest.toolbar = {};

      simulateSelectionWithoutText();

      assert.equal(guest.toolbar.newAnnotationType, 'note');
    });
  });

  describe('when adder toolbar buttons are clicked', () =>
    // TODO - Add tests for "Annotate" and "Highlight" buttons.

    it('shows annotations if "Show" is clicked', () => {
      createGuest();

      FakeAdder.instance.options.onShowAnnotations([{ $tag: 'ann1' }]);

      assert.calledWith(fakeCrossFrame.call, 'showSidebar');
      assert.calledWith(fakeCrossFrame.call, 'showAnnotations', ['ann1']);
    }));

  describe('#getDocumentInfo', () => {
    let guest;

    beforeEach(() => {
      guest = createGuest();
      guest.plugins.PDF = {
        uri() {
          return 'urn:x-pdf:001122';
        },
        getMetadata: sandbox.stub(),
      };
    });

    it('preserves the components of the URI other than the fragment', () => {
      guest.plugins.PDF = null;
      guest.plugins.Document = {
        uri() {
          return 'http://foobar.com/things?id=42';
        },
        metadata: {},
      };
      return guest
        .getDocumentInfo()
        .then(({ uri }) => assert.equal(uri, 'http://foobar.com/things?id=42'));
    });

    it('removes the fragment identifier from URIs', () => {
      guest.plugins.PDF.uri = () => 'urn:x-pdf:aabbcc#ignoreme';
      return guest
        .getDocumentInfo()
        .then(({ uri }) => assert.equal(uri, 'urn:x-pdf:aabbcc'));
    });
  });

  describe('#createAnnotation', () => {
    it('adds metadata to the annotation object', () => {
      const guest = createGuest();
      sinon.stub(guest, 'getDocumentInfo').returns(
        Promise.resolve({
          metadata: { title: 'hello' },
          uri: 'http://example.com/',
        })
      );
      const annotation = {};

      guest.createAnnotation(annotation);

      return timeoutPromise().then(() => {
        assert.equal(annotation.uri, 'http://example.com/');
        assert.deepEqual(annotation.document, { title: 'hello' });
      });
    });

    it('merges properties of input object into returned annotation', () => {
      const guest = createGuest();
      let annotation = { foo: 'bar' };
      annotation = guest.createAnnotation(annotation);
      assert.equal(annotation.foo, 'bar');
    });

    it('triggers a "beforeAnnotationCreated" event', done => {
      const guest = createGuest();
      guest.subscribe('beforeAnnotationCreated', () => done());
      guest.createAnnotation();
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

    it('updates the cross frame and bucket bar plugins', () => {
      const guest = createGuest();
      guest.plugins.CrossFrame = { sync: sinon.stub() };
      guest.plugins.BucketBar = { update: sinon.stub() };
      const annotation = {};
      return guest.anchor(annotation).then(() => {
        assert.called(guest.plugins.BucketBar.update);
        assert.called(guest.plugins.CrossFrame.sync);
      });
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

    it('updates the bucket bar plugin', () => {
      const guest = createGuest();
      guest.plugins.BucketBar = { update: sinon.stub() };
      const annotation = {};
      guest.anchors.push({ annotation });

      guest.detach(annotation);

      assert.calledOnce(guest.plugins.BucketBar.update);
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
});
