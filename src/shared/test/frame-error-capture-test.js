import { delay } from '@hypothesis/frontend-testing';

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

  // Simulate behavior of `window.postMessage` in browsers (eg. Firefox, Safari)
  // which cannot clone errors.
  function patchPostMessageToFailWhenCloningErrors() {
    const origPostMessage = window.postMessage;
    const stub = sinon.stub(window, 'postMessage').callsFake((data, origin) => {
      if (data.error instanceof Error) {
        throw new DOMException('Object cannot be cloned', 'DataCloneError');
      }
      origPostMessage.call(window, data, origin);
    });
    return stub;
  }

  let origPrepareStackTrace;

  beforeEach(() => {
    // Replace the `prepareStackTrace` handler installed by source-map-support
    // for the duration of these tests, as they make accesses to the `error.stack`
    // property much more expensive, which sometimes caused timeouts in CI.
    origPrepareStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = undefined;

    errorEvents = [];
    window.addEventListener('message', handleMessage);
  });

  afterEach(() => {
    window.removeEventListener('message', handleMessage);
    sendErrorsTo(null);

    Error.prepareStackTrace = origPrepareStackTrace;
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
    [new Error('Test error'), 'non-Error value'].forEach(errorValue => {
      it('sends error to handler frame', async () => {
        sendErrorsTo(window);
        sendError(errorValue, 'some context');

        await delay(0);

        assert.equal(errorEvents.length, 1);
        assert.match(errorEvents[0], {
          context: 'some context',
          error: sinon.match({
            message: errorValue.message ?? String(errorValue),
          }),
          type: 'hypothesis-error',
        });
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

    it('serializes errors in browsers that cannot clone Error objects', async () => {
      sendErrorsTo(window);

      const postMessageStub = patchPostMessageToFailWhenCloningErrors();
      try {
        const error = new Error('Test error');
        sendError(error, 'some context');
        await delay(0);

        assert.deepEqual(errorEvents, [
          {
            type: 'hypothesis-error',
            context: 'some context',
            error: {
              message: error.message,
              stack: error.stack,
            },
          },
        ]);
      } finally {
        postMessageStub.restore();
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

    it('deserializes errors in browsers that cannot clone Error objects', async () => {
      const receivedErrors = [];

      const removeHandler = handleErrorsInFrames((error, context) => {
        receivedErrors.push({ error, context });
      });

      const postMessageStub = patchPostMessageToFailWhenCloningErrors();
      try {
        sendErrorsTo(window);
        sendError(new Error('Test error'), 'Test context');

        await delay(0);

        assert.equal(receivedErrors.length, 1);
        assert.equal(receivedErrors[0].error.message, 'Test error');
        assert.equal(receivedErrors[0].context, 'Test context');
      } finally {
        removeHandler();
        postMessageStub.restore();
      }
    });
  });

  // Integration test that combines `captureErrors` and `handleErrorsInFrames`.
  [true, false].forEach(cloningErrorsSupported => {
    it('captures and forwards errors from wrapped callbacks', async () => {
      const receivedErrors = [];
      const removeHandler = handleErrorsInFrames((error, context) => {
        receivedErrors.push({ error, context });
      });

      let postMessageStub;
      if (!cloningErrorsSupported) {
        postMessageStub = patchPostMessageToFailWhenCloningErrors();
      }

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
        postMessageStub?.restore();
      }
    });
  });
});
