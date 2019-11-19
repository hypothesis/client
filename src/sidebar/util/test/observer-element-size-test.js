'use strict';

const observeElementSize = require('../observe-element-size');

/**
 * Give MutationObserver, ResizeObserver etc. a chance to deliver their
 * notifications.
 */
function waitForObservations() {
  return new Promise(resolve => setTimeout(resolve, 1));
}

describe('observeElementSize', () => {
  let content;
  let sizeChanged;
  let stopObserving;

  beforeEach(() => {
    sizeChanged = sinon.stub();
    content = document.createElement('div');
    content.innerHTML = '<p>Some test content</p>';
    document.body.appendChild(content);
  });

  afterEach(() => {
    stopObserving();
    content.remove();
  });

  function startObserving() {
    stopObserving = observeElementSize(content, sizeChanged);
  }

  context('when `ResizeObserver` is available', function() {
    if (typeof ResizeObserver === 'undefined') {
      this.skip();
    }

    it('notifies when the element size changes', async () => {
      startObserving();

      content.innerHTML = '<p>different content</p>';
      await waitForObservations();
      assert.called(sizeChanged);

      stopObserving();
      sizeChanged.reset();

      content.innerHTML = '<p>other content</p>';
      await waitForObservations();
      assert.notCalled(sizeChanged);
    });
  });

  context('when `ResizeObserver` is not available', () => {
    let origResizeObserver;
    beforeEach(() => {
      origResizeObserver = window.ResizeObserver;
      window.ResizeObserver = undefined;
    });

    afterEach(() => {
      window.ResizeObserver = origResizeObserver;
    });

    [
      {
        description: 'media loads inside the element',
        triggerCheck: () =>
          content.dispatchEvent(new Event('load', { bubbles: true })),
      },
      {
        description: 'the window is resized',
        triggerCheck: () => window.dispatchEvent(new Event('resize')),
      },
      {
        description: "the element's DOM structure changes",
        triggerCheck: () => (content.innerHTML += '<p>more content</p>'),
      },
    ].forEach(({ description, triggerCheck }) => {
      it(`checks for changes when ${description}`, async () => {
        startObserving();

        // Change the content height, which is not directly observed.
        content.style.minHeight = '500px';
        triggerCheck();
        await waitForObservations();
        assert.called(sizeChanged);

        sizeChanged.reset();
        stopObserving();

        content.style.minHeight = '200px';
        triggerCheck();
        await waitForObservations();
        assert.notCalled(sizeChanged);
      });
    });
  });
});
