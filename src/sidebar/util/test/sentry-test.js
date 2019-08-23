'use strict';

const sentry = require('../sentry');

describe('sidebar/util/sentry', () => {
  let fakeSentry;
  let fakeWarnOnce;

  beforeEach(() => {
    fakeSentry = {
      init: sinon.stub(),
      setUser: sinon.stub(),
    };

    fakeWarnOnce = sinon.stub();

    sentry.$imports.$mock({
      '@sentry/browser': fakeSentry,
      '../../shared/warn-once': fakeWarnOnce,
    });
  });

  afterEach(() => {
    sentry.$imports.$restore();
  });

  it('limits the number of events sent to Sentry per session', () => {
    sentry.init({ dsn: 'test-dsn' });
    assert.called(fakeSentry.init);

    // The first `maxEvents` events should be sent to Sentry.
    const maxEvents = 5;
    const beforeSend = fakeSentry.init.getCall(0).args[0].beforeSend;
    for (let i = 0; i < maxEvents; i++) {
      const val = {};

      // These events should not be modified.
      assert.equal(beforeSend(val), val);
    }
    assert.notCalled(fakeWarnOnce);

    // Subsequent events should not be sent and a warning should be logged.
    assert.equal(beforeSend({}), null);
    assert.equal(beforeSend({}), null); // Verify this works a second time.
    assert.called(fakeWarnOnce);
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
