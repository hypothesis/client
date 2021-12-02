import { delay } from '../../test-util/wait';
import {
  captureErrors,
  handleErrorsInFrames,
  sendError,
  sendErrorsTo,
} from '../frame-error-capture';

describe('shared/frame-error-capture', () => {
  let errorEvents;

  function handleMessage(event) {
    if (event.data.type === 'hypothesis-error') {
      errorEvents.push(event.data);
    }
  }

  beforeEach(() => {
    errorEvents = [];
    window.addEventListener('message', handleMessage);
  });

  afterEach(() => {
    window.removeEventListener('message', handleMessage);
    sendErrorsTo(null);
  });

  describe('captureErrors', () => {
    it('returns wrapped callback', () => {
      const callback = captureErrors((a, b) => a * b, 'Testing captureErrors');
      const result = callback(7, 8);
      assert.equal(result, 56);
    });

    it('captures errors and forwards them to the current handler frame', async () => {
      sendErrorsTo(window);

      const error = new Error('Test error');
      const callback = captureErrors(() => {
        throw error;
      }, 'Testing captureErrors');

      assert.throws(() => {
        callback();
      }, 'Test error');

      await delay(0);

      assert.equal(errorEvents.length, 1);
      assert.match(errorEvents[0], {
        context: 'Testing captureErrors',
        error: sinon.match({ message: 'Test error' }),
        type: 'hypothesis-error',
      });
    });
  });

  describe('sendError', () => {
    it('sends error to handler frame', async () => {
      sendErrorsTo(window);
      sendError(new Error('Test error'), 'some context');

      await delay(0);

      assert.equal(errorEvents.length, 1);
      assert.match(errorEvents[0], {
        context: 'some context',
        error: sinon.match({ message: 'Test error' }),
        type: 'hypothesis-error',
      });
    });

    it('does not forward errors if there is no handler frame', async () => {
      sendError(new Error('Test error'));
      await delay(0);
      assert.equal(errorEvents.length, 0);
    });

    it('ignores errors forwarding error to handler frame', () => {
      try {
        sinon
          .stub(window, 'postMessage')
          .throws(new Error('postMessage error'));
        sinon.stub(console, 'warn');

        sendErrorsTo(window);
        sendError(new Error('Test error'), 'some context');

        assert.calledOnce(window.postMessage);
        assert.calledOnce(console.warn);
      } finally {
        console.warn.restore();
        window.postMessage.restore();
      }
    });
  });

  describe('handleErrorsInFrames', () => {
    it('invokes callback when an error is received', async () => {
      const receivedErrors = [];

      const removeHandler = handleErrorsInFrames((error, context) => {
        receivedErrors.push({ error, context });
      });

      try {
        sendErrorsTo(window);
        sendError(new Error('Test error'), 'Test context');

        await delay(0);

        assert.equal(receivedErrors.length, 1);
        assert.equal(receivedErrors[0].error.message, 'Test error');
        assert.equal(receivedErrors[0].context, 'Test context');
      } finally {
        removeHandler();
      }
    });
  });

  // Integration test that combines `captureErrors` and `handleErrorsInFrames`.
  it('captures and forwards errors from wrapped callbacks', async () => {
    const receivedErrors = [];
    const removeHandler = handleErrorsInFrames((error, context) => {
      receivedErrors.push({ error, context });
    });

    try {
      sendErrorsTo(window);
      const callback = captureErrors(() => {
        throw new Error('Test error');
      }, 'Test context');

      try {
        callback();
      } catch {
        // Ignored
      }
      await delay(0);

      assert.equal(receivedErrors.length, 1);
      assert.equal(receivedErrors[0].error.message, 'Test error');
      assert.equal(receivedErrors[0].context, 'Test context');
    } finally {
      removeHandler();
    }
  });
});
