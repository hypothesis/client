import { waitFor } from '@hypothesis/frontend-testing';

import { observeElementSize } from '../observe-element-size';

/**
 * Give MutationObserver, ResizeObserver etc. a chance to deliver their
 * notifications.
 *
 * This waits for a fixed amount of time. If you can wait for a specific event
 * using `waitFor`, you should do so.
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

  it('notifies when the element size changes', async () => {
    startObserving();

    content.innerHTML = '<p>different content</p>';
    await waitFor(() => sizeChanged.called);

    stopObserving();
    sizeChanged.reset();

    content.innerHTML = '<p>other content</p>';
    await waitForObservations();
    assert.notCalled(sizeChanged);
  });
});
