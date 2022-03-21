import { delay, waitFor } from '../../test-util/wait';
import {
  FrameObserver,
  onDocumentReady,
  onNextDocumentReady,
  $imports,
} from '../frame-observer';

function waitForEvent(target, event) {
  return new Promise(resolve => {
    target.addEventListener(event, () => resolve());
  });
}

function waitForCall(spy) {
  return waitFor(() => spy.called, 300 /* timeout */);
}

describe('annotator/frame-observer', () => {
  let container;

  afterEach(() => {
    container.remove();
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
  });

  describe('FrameObserver', () => {
    let frameObserver;
    let onFrameAdded;
    let onFrameRemoved;
    const sandbox = sinon.createSandbox();

    function createAnnotatableIFrame(
      attribute = 'enable-annotation',
      value = ''
    ) {
      const iframe = document.createElement('iframe');
      iframe.setAttribute(attribute, value);
      container.appendChild(iframe);
      return iframe;
    }

    function waitForIFrameUnload(iframe) {
      return new Promise(resolve =>
        iframe.contentWindow.addEventListener('unload', resolve)
      );
    }

    beforeEach(() => {
      sandbox.stub(console, 'warn');
      $imports.$mock({
        // Disable debouncing
        'lodash.debounce': callback => callback,
      });

      onFrameAdded = sandbox.stub();
      onFrameRemoved = sandbox.stub();
      frameObserver = new FrameObserver(
        container,
        onFrameAdded,
        onFrameRemoved
      );
    });

    afterEach(() => {
      container.remove();
      frameObserver.disconnect();
      sandbox.restore();
      $imports.$restore();
    });

    it('triggers onFrameAdded when an annotatable iframe is added', async () => {
      const iframe = createAnnotatableIFrame();
      await waitForCall(onFrameAdded);
      assert.calledWith(onFrameAdded, iframe);
    });

    it("doesn't trigger onFrameAdded when non-annotatable iframes are added", async () => {
      createAnnotatableIFrame('dummy-attribute');
      await delay(10);
      assert.notCalled(onFrameAdded);
    });

    it('removal of the annotatable iframe triggers onFrameRemoved', async () => {
      const iframe = createAnnotatableIFrame();

      await waitForCall(onFrameAdded);
      assert.calledOnce(onFrameAdded);
      assert.calledWith(onFrameAdded, iframe);

      iframe.remove();

      await waitForCall(onFrameRemoved);
      assert.calledOnce(onFrameRemoved);
      assert.calledWith(onFrameRemoved, iframe);
    });

    it('removal of the `enable-annotation` attribute triggers onFrameRemoved', async () => {
      const iframe = createAnnotatableIFrame();
      await waitForCall(onFrameAdded);
      assert.calledOnce(onFrameAdded);
      assert.calledWith(onFrameAdded, iframe);

      iframe.removeAttribute('enable-annotation');

      await waitForCall(onFrameRemoved);
      assert.calledOnce(onFrameRemoved);
      assert.calledWith(onFrameRemoved, iframe);
    });

    it('changing the `src` attribute triggers onFrameRemoved', async () => {
      const iframe = createAnnotatableIFrame();

      await waitForCall(onFrameAdded);
      assert.calledOnce(onFrameAdded);
      assert.calledWith(onFrameAdded, iframe);

      iframe.setAttribute('src', 'http://localhost:1');
      await waitForIFrameUnload(iframe);

      assert.calledOnce(onFrameRemoved);
      assert.calledWith(onFrameRemoved, iframe);
    });

    it(`doesn't call onFrameAdded if FrameObserver is disconnected`, async () => {
      frameObserver.disconnect();
      const iframe = createAnnotatableIFrame();

      frameObserver._discoverFrames(); // Emulate a race condition
      await onNextDocumentReady(iframe);

      assert.notCalled(onFrameAdded);
    });

    it("doesn't trigger onFrameAdded when annotatable iframe is from a different domain", async () => {
      const iframe = createAnnotatableIFrame();
      iframe.setAttribute('src', 'http://localhost:1');

      await waitForCall(console.warn);

      assert.notCalled(onFrameAdded);
      assert.calledOnce(console.warn);
    });
  });

  function createFrame(src) {
    const frame = document.createElement('iframe');
    frame.src = src;
    container.append(frame);
    return frame;
  }

  const sameOriginURL = new URL(
    '/base/annotator/test/empty.html',
    document.location.href
  ).href;

  // A cross-origin local URL that "loads" fast (whether the load succeeds or
  // fails doesn't matter for these tests). We assume that nothing else is
  // listening on the port.
  const crossOriginURL = 'http://localhost:12345/test.html';

  describe('onDocumentReady', () => {
    it('invokes callback with current document if it is already ready', async () => {
      const callback = sinon.stub();
      const frame = createFrame(sameOriginURL);
      await waitForEvent(frame, 'load');

      onDocumentReady(frame, callback);
      await waitForCall(callback);

      assert.calledOnce(callback);
      assert.calledWith(callback, null);
      const doc = callback.args[0][1];
      assert.equal(doc.location.href, sameOriginURL);
    });

    it('invokes callback when current document becomes ready', async () => {
      let resolveDocReady;
      const docReady = new Promise(resolve => (resolveDocReady = resolve));
      const callback = sinon
        .stub()
        .callsFake((err, doc) => resolveDocReady(doc));

      // We use a randomized URL so that the browser won't have a cached copy
      // that loads instantly. This will force execution through the code path
      // that waits for 'DOMContentLoaded' before triggering the callback.
      const docURL = `${sameOriginURL}?random=${Math.random()}`;
      const frame = createFrame(docURL);
      onDocumentReady(frame, callback, { pollInterval: 0 });
      await docReady;

      assert.calledOnce(callback);
      assert.calledWith(callback, null);
      const doc = callback.args[0][1];
      assert.equal(doc.location.href, docURL);
    });

    it('invokes callback for subsequent navigations to same-origin documents', async () => {
      const callback = sinon.stub();
      const frame = createFrame(sameOriginURL);
      await waitForEvent(frame, 'load');

      onDocumentReady(frame, callback);
      await waitForCall(callback);

      frame.src = sameOriginURL + 'v2';
      await waitForEvent(frame, 'load');

      assert.calledTwice(callback);
    });

    it('invokes callback with error if document is cross-origin', async () => {
      const callback = sinon.stub();
      const frame = createFrame(crossOriginURL);
      await waitForEvent(frame, 'load');

      onDocumentReady(frame, callback);
      await waitForCall(callback);

      assert.calledOnce(callback);
      assert.calledWith(callback, sinon.match.instanceOf(Error));
      const error = callback.args[0][0];
      assert.equal(error.message, 'Frame is cross-origin');
    });

    it('stops polling when subscription is canceled', async () => {
      const callback = sinon.stub();
      const frame = createFrame(sameOriginURL);
      await waitForEvent(frame, 'load');

      const unsubscribe = onDocumentReady(frame, callback);
      await waitForCall(callback);

      unsubscribe();
      frame.src = sameOriginURL + '?v2';
      await waitForEvent(frame, 'load');

      assert.calledOnce(callback);
    });

    it('does not start polling if "unload" event is received after subscription is canceled', async () => {
      const clock = sinon.useFakeTimers();
      try {
        const callback = sinon.stub();
        const frame = createFrame(sameOriginURL);
        await waitForEvent(frame, 'load');

        const unsubscribe = onDocumentReady(frame, callback);
        clock.tick();
        assert.calledOnce(callback);

        const contentWindow = frame.contentWindow;
        unsubscribe();
        contentWindow.dispatchEvent(new Event('unload'));

        frame.src = sameOriginURL + '?v2';
        await waitForEvent(frame, 'load');
        clock.tick(50); // Wait for any active polling to trigger

        assert.calledOnce(callback);
      } finally {
        clock.restore();
      }
    });

    it('does not invoke callback if subscription is immediately canceled', async () => {
      const callback = sinon.stub();
      const frame = createFrame(sameOriginURL);
      await waitForEvent(frame, 'load');

      const unsubscribe = onDocumentReady(frame, callback);
      unsubscribe();

      frame.src = sameOriginURL + '?v2';
      await waitForEvent(frame, 'load');

      assert.notCalled(callback);
    });
  });

  describe('onNextDocumentReady', () => {
    it('it resolves when a document first becomes ready in the frame', async () => {
      const frame = createFrame(sameOriginURL);
      const doc = await onNextDocumentReady(frame);
      assert.equal(doc.location.href, sameOriginURL);
    });

    it('it rejects if frame document is cross-origin', async () => {
      const frame = createFrame(crossOriginURL);

      let error;
      try {
        await onNextDocumentReady(frame);
      } catch (e) {
        error = e;
      }

      assert.instanceOf(error, Error);
      assert.equal(error.message, 'Frame is cross-origin');
    });
  });
});
