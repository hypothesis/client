import { delay, waitFor } from '../../../test-util/wait';
import { DEBOUNCE_WAIT, onNextDocumentReady } from '../../frame-observer';
import {
  HypothesisInjector,
  injectClient,
  $imports,
} from '../../hypothesis-injector';

describe('HypothesisInjector integration test', () => {
  let container;
  let hypothesisInjectors;

  let hostJSONConfig;

  const sandbox = sinon.createSandbox();
  const config = {
    clientUrl: 'data:,Hypothesis', // empty data uri
  };

  // Wait for `FrameObserver` to discover added or removed iframes.
  async function waitForFrameObserver() {
    await delay(DEBOUNCE_WAIT + 10);
  }

  // Wait for `HypothesisInjector.injectClient` to finish injecting the client
  // into the page.
  async function waitForInjectClient(frame) {
    await waitFor(() => getHypothesisScript(frame));
  }

  function getHypothesisScript(iframe) {
    return iframe.contentDocument.querySelector(
      'script[src="data:,Hypothesis"]'
    );
  }

  function createHypothesisInjector() {
    const injector = new HypothesisInjector(container, config);
    hypothesisInjectors.push(injector);
    return injector;
  }

  function createAnnotatableIFrame(attribute = 'enable-annotation') {
    const iframe = document.createElement('iframe');
    iframe.setAttribute(attribute, '');
    container.appendChild(iframe);
    return iframe;
  }

  beforeEach(() => {
    hypothesisInjectors = [];

    container = document.createElement('div');
    document.body.appendChild(container);

    hostJSONConfig = {};

    $imports.$mock({
      '../boot/parse-json-config': {
        parseJsonConfig: () => hostJSONConfig,
      },
    });
  });

  afterEach(() => {
    sandbox.restore();
    hypothesisInjectors.forEach(injector => injector.destroy());
    container.remove();
  });

  describe('injectClient', () => {
    it('configures client', async () => {
      const frame = document.createElement('iframe');
      container.append(frame);

      await injectClient(frame, { clientUrl: 'https://hyp.is' });

      const configElement = frame.contentDocument.querySelector(
        '.js-hypothesis-config'
      );
      const config = JSON.parse(configElement.textContent);

      assert.match(config.subFrameIdentifier, /[a-f0-9]+/);
      assert.notOk(config.assetRoot);
      assert.notOk(config.notebookAppUrl);
      assert.notOk(config.sidebarAppUrl);
    });

    it('copies client asset locations from host frame', async () => {
      hostJSONConfig = {
        clientUrl: 'chrome-extension://abc/client/build/boot.js',
        assetRoot: 'chrome-extension://abc/client',
        notebookAppUrl: 'chrome-extension://abc/client/notebook.html',
        sidebarAppUrl: 'chrome-extension://abc/client/sidebar.html',
      };

      const frame = document.createElement('iframe');
      container.append(frame);

      await injectClient(frame, hostJSONConfig);

      const configElement = frame.contentDocument.querySelector(
        '.js-hypothesis-config'
      );
      const config = JSON.parse(configElement.textContent);

      assert.equal(config.assetRoot, 'chrome-extension://abc/client');
      assert.equal(
        config.notebookAppUrl,
        'chrome-extension://abc/client/notebook.html'
      );
      assert.equal(
        config.sidebarAppUrl,
        'chrome-extension://abc/client/sidebar.html'
      );
    });
  });

  it('detects iframes on page', async () => {
    const validFrame = createAnnotatableIFrame();
    // Create another that mimics the sidebar iframe
    // This one should should not be detected
    const invalidFrame = createAnnotatableIFrame('dummy-attribute');

    // Now initialize
    createHypothesisInjector();

    await waitForInjectClient(validFrame);

    assert.isNotNull(
      getHypothesisScript(validFrame),
      'expected valid iframe to include the Hypothesis script'
    );

    assert.isNull(
      getHypothesisScript(invalidFrame),
      'expected invalid iframe to not include the Hypothesis script'
    );
  });

  it('injects embed script in iframe', async () => {
    const iframe = createAnnotatableIFrame();

    createHypothesisInjector();
    await waitForInjectClient(iframe);

    const scriptElement = getHypothesisScript(iframe);
    assert.isNotNull(
      scriptElement,
      'expected the iframe to include the Hypothesis script'
    );
    assert.equal(
      scriptElement.src,
      config.clientUrl,
      'unexpected embed script source'
    );
  });

  it('excludes injection from already injected iframes', async () => {
    const iframe = createAnnotatableIFrame();

    // Add a client config in the same way as the injector.
    const configScript = document.createElement('script');
    configScript.className = 'js-hypothesis-config';
    iframe.contentDocument.body.append(configScript);

    createHypothesisInjector();
    await onNextDocumentReady(iframe);

    assert.isNull(
      getHypothesisScript(iframe),
      'expected iframe to not include the Hypothesis script'
    );
  });

  it('detects dynamically added iframes', async () => {
    // Initialize with no initial iframe, unlike before
    createHypothesisInjector();

    // Add an iframe to the DOM
    const iframe = createAnnotatableIFrame();

    await waitForFrameObserver();
    await waitForInjectClient(iframe);
    assert.isNotNull(
      getHypothesisScript(iframe),
      'expected dynamically added iframe to include the Hypothesis script'
    );
  });

  it('detects an iframe dynamically removed, and added again', async () => {
    const iframe = createAnnotatableIFrame();

    // Now initialize
    createHypothesisInjector();
    await waitForInjectClient(iframe);

    assert.isNotNull(
      getHypothesisScript(iframe),
      'expected initial iframe to include the Hypothesis script'
    );

    iframe.remove();
    await waitForFrameObserver();

    container.appendChild(iframe);
    assert.isNull(getHypothesisScript(iframe));

    await waitForFrameObserver();
    await waitForInjectClient(iframe);

    assert.isNotNull(
      getHypothesisScript(iframe),
      'expected dynamically added iframe to include the Hypothesis script'
    );
  });

  it('detects an iframe dynamically added, removed, and added again', async () => {
    // Initialize with no initial iframe
    createHypothesisInjector();

    // Add an iframe to the DOM
    const iframe = createAnnotatableIFrame();

    await waitForFrameObserver();
    await waitForInjectClient(iframe);

    assert.isNotNull(
      getHypothesisScript(iframe),
      'expected dynamically added iframe to include the Hypothesis script'
    );

    iframe.remove();
    await waitForFrameObserver();

    container.appendChild(iframe);
    assert.isNull(getHypothesisScript(iframe));

    await waitForFrameObserver();
    await waitForInjectClient(iframe);

    assert.isNotNull(
      getHypothesisScript(iframe),
      'expected dynamically added iframe to include the Hypothesis script'
    );
  });
});
