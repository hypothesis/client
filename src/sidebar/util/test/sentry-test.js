import * as sentry from '../sentry';

describe('sidebar/util/sentry', () => {
  let fakeHandleErrorsInFrames;
  let fakeParseConfigFragment;
  let fakeSentry;
  let fakeWarnOnce;

  beforeEach(() => {
    fakeHandleErrorsInFrames = sinon.stub().returns(() => {});
    fakeParseConfigFragment = sinon.stub().returns({});

    fakeSentry = {
      captureException: sinon.stub(),
      init: sinon.stub(),
      setExtra: sinon.stub(),
      setUser: sinon.stub(),
    };

    fakeWarnOnce = sinon.stub();

    sentry.$imports.$mock({
      '@sentry/browser': fakeSentry,
      '../../shared/config-fragment': {
        parseConfigFragment: fakeParseConfigFragment,
      },
      '../../shared/frame-error-capture': {
        handleErrorsInFrames: fakeHandleErrorsInFrames,
      },
      '../../shared/warn-once': { warnOnce: fakeWarnOnce },
    });
  });

  afterEach(() => {
    sentry.$imports.$restore();
  });

  describe('init', () => {
    const originalURL = import.meta.url;

    beforeEach(() => {
      // Reset rate limiting counters.
      sentry.reset();
    });

    afterEach(() => {
      import.meta.url = originalURL;
    });

    it('configures Sentry', () => {
      sentry.init({
        dsn: 'test-dsn',
        environment: 'dev',
      });

      assert.calledWith(
        fakeSentry.init,
        sinon.match({
          dsn: 'test-dsn',
          environment: 'dev',
          release: '1.0.0-dummy-version',
        })
      );
    });

    it('configures Sentry to only report errors that can be attributed to our code', () => {
      import.meta.url =
        'https://cdn.hypothes.is/hypothesis/1.940.0/build/scripts/sidebar.bundle.js';

      sentry.init({
        dsn: 'test-dsn',
        environment: 'dev',
      });

      assert.calledWith(
        fakeSentry.init,
        sinon.match({
          allowUrls: ['https://cdn.hypothes.is'],
        })
      );
    });

    it('configures Sentry to ignore certain errors', () => {
      sentry.init({
        dsn: 'test-dsn',
        environment: 'dev',
      });

      assert.calledWith(
        fakeSentry.init,
        sinon.match({
          ignoreErrors: sinon.match.array,
        })
      );
    });

    it('disables the URL allowlist if the script URL is unavailable', () => {
      import.meta.url = null;

      sentry.init({
        dsn: 'test-dsn',
        environment: 'dev',
      });

      assert.calledWith(
        fakeSentry.init,
        sinon.match({
          allowUrls: undefined,
        })
      );
    });

    it('adds "host_config" context to reports', () => {
      fakeParseConfigFragment.returns({ appType: 'via' });

      sentry.init({ dsn: 'test-dsn', environment: 'dev' });

      assert.calledWith(fakeParseConfigFragment, window.location.href);
      assert.calledWith(fakeSentry.setExtra, 'host_config', { appType: 'via' });
    });

    it('does not add "host_config" context if `parseConfigFragment` throws', () => {
      fakeParseConfigFragment.throws(new Error('Parse error'));
      sentry.init({ dsn: 'test-dsn', environment: 'dev' });
      assert.neverCalledWith(fakeSentry.setExtra, 'host_config');
    });

    it('adds "loaded_scripts" context to reports', () => {
      sentry.init({ dsn: 'test-dsn', environment: 'dev' });
      assert.calledWith(fakeSentry.setExtra, 'loaded_scripts');

      const urls = fakeSentry.setExtra
        .getCalls()
        .find(call => call.args[0] === 'loaded_scripts').args[1];
      assert.isTrue(urls.length > 0);
      urls.forEach(url => assert.match(url, /<inline>|http:.*\.js/));
    });

    function getBeforeSendHook() {
      return fakeSentry.init.getCall(0).args[0].beforeSend;
    }

    it('limits the number of events sent to Sentry per session', () => {
      sentry.init({ dsn: 'test-dsn' });
      assert.called(fakeSentry.init);

      // The first `maxEvents` events should be sent to Sentry.
      const maxEvents = 5;
      const beforeSend = getBeforeSendHook();
      for (let i = 0; i < maxEvents; i++) {
        const val = { extra: {} };

        // These events should not be modified.
        assert.equal(beforeSend(val), val);
      }
      assert.notCalled(fakeWarnOnce);

      // Subsequent events should not be sent and a warning should be logged.
      assert.equal(beforeSend({}), null);
      assert.equal(beforeSend({}), null); // Verify this works a second time.
      assert.called(fakeWarnOnce);
    });

    it('extracts metadata from thrown `Event`s', () => {
      sentry.init({ dsn: 'test-dsn' });
      const beforeSend = getBeforeSendHook();
      const event = {};

      beforeSend(event, {
        originalException: new CustomEvent('unexpectedevent', {
          detail: 'Details of the unexpected event',
        }),
      });

      assert.deepEqual(event, {
        extra: {
          type: 'unexpectedevent',
          detail: 'Details of the unexpected event',
          isTrusted: false,
        },
      });
    });

    it('ignores errors serializing non-Error exception values', () => {
      sentry.init({ dsn: 'test-dsn' });
      const beforeSend = getBeforeSendHook();
      const event = {};
      const originalException = new CustomEvent('unexpectedevent');
      Object.defineProperty(originalException, 'detail', {
        get: () => {
          throw new Error('Something went wrong');
        },
      });

      beforeSend(event, { originalException });

      // Serializing the custom event detail will fail, so that data will simply
      // be omitted from the report.
      assert.deepEqual(event.extra, {});
    });

    it('registers a handler for errors in other frames', () => {
      sentry.init({ dsn: 'test-dsn' });

      assert.calledOnce(fakeHandleErrorsInFrames);
      const callback = fakeHandleErrorsInFrames.getCall(0).args[0];

      const error = new Error('Some error in host frame');
      const context = 'some-context';
      callback(error, context);

      assert.calledWith(fakeSentry.captureException, error, {
        tags: { context },
      });
    });
  });

  describe('setUserInfo', () => {
    it('sets the Sentry user', () => {
      sentry.setUserInfo({ id: 'acct:jimsmith@hypothes.is' });

      // `setUserInfo` is currently a trivial wrapper.
      assert.calledWith(fakeSentry.setUser, {
        id: 'acct:jimsmith@hypothes.is',
      });
    });
  });
});
