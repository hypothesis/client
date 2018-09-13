'use strict';

const time = require('../time');

const minute = 60;
const hour = minute * 60;
const day = hour * 24;
const month = day * 30;
const year = day * 365;

const FIXTURES_TO_FUZZY_STRING = [
  [10, 'Just now'],
  [29, 'Just now'],
  [49, '49 secs'],
  [minute + 5, '1 min'],
  [3 * minute + 5, '3 mins'],
  [hour, '1 hr'],
  [4 * hour, '4 hrs'],
  [27 * hour, '1 Jan'],
  [3 * day + 30 * minute, '1 Jan'],
  [6 * month + 2 * day, '1 Jan'],
  [1 * year, '1 Jan 1970'],
  [1 * year + 2 * month, '1 Jan 1970'],
  [2 * year, '1 Jan 1970'],
  [8 * year, '1 Jan 1970'],
];

const FIXTURES_NEXT_FUZZY_UPDATE = [
  [10, 5], // we have a minimum of 5 secs
  [29, 5],
  [49, 5],
  [minute + 5, minute],
  [3 * minute + 5, minute],
  [4 * hour, hour],
  [27 * hour, null],
  [3 * day + 30 * minute, null],
  [6 * month + 2 * day, null],
  [8 * year, null],
];

describe('sidebar.util.time', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.useFakeTimers();

    // Ensure that the current local date is 01/01/1970, as this is assumed by
    // test expectations
    const offset = new Date().getTimezoneOffset();
    if (offset > 0) {
      sandbox.clock.tick(offset * 60 * 1000);
    }
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('.toFuzzyString', function () {

    function mockIntl() {
      return {
        DateTimeFormat: function () {
          return {
            format: function () {
              if (new Date().getYear() === 70) {
                return '1 Jan';
              } else {
                return '1 Jan 1970';
              }
            },
          };
        },
      };
    }

    it('Handles empty dates', function () {
      const t = null;
      const expect = '';
      assert.equal(time.toFuzzyString(t, mockIntl()), expect);
    });

    const testFixture = function (f) {
      return function () {
        const t = new Date().toISOString();
        const expect = f[1];
        sandbox.clock.tick(f[0] * 1000);
        assert.equal(time.toFuzzyString(t, mockIntl()), expect);
      };
    };

    for (let i = 0, f; i < FIXTURES_TO_FUZZY_STRING.length; i++) {
      f = FIXTURES_TO_FUZZY_STRING[i];
      it('creates correct fuzzy string for fixture ' + i,
        testFixture(f));
    }

    it('falls back to simple strings for >24hrs ago', function () {
      // If window.Intl is not available then the date formatting for dates
      // more than one day ago falls back to a simple date string.
      const d = new Date().toISOString();
      sandbox.clock.tick(day * 2 * 1000);

      assert.equal(time.toFuzzyString(d, null), 'Thu Jan 01 1970');
    });

    it('falls back to simple strings for >1yr ago', function () {
      // If window.Intl is not available then the date formatting for dates
      // more than one year ago falls back to a simple date string.
      const d = new Date().toISOString();
      sandbox.clock.tick(year * 2 * 1000);

      assert.equal(time.toFuzzyString(d, null), 'Thu Jan 01 1970');
    });

  });

  describe('.decayingInterval', function () {
    it('uses a short delay for recent timestamps', function () {
      const date = new Date();
      const callback = sandbox.stub();
      time.decayingInterval(date, callback);
      sandbox.clock.tick(6 * 1000);
      assert.calledWith(callback, date);
      sandbox.clock.tick(6 * 1000);
      assert.calledTwice(callback);
    });

    it('uses a longer delay for older timestamps', function () {
      const date = new Date();
      const ONE_MINUTE = minute * 1000;
      sandbox.clock.tick(10 * ONE_MINUTE);
      const callback = sandbox.stub();
      time.decayingInterval(date, callback);
      sandbox.clock.tick(ONE_MINUTE / 2);
      assert.notCalled(callback);
      sandbox.clock.tick(ONE_MINUTE);
      assert.calledWith(callback, date);
      sandbox.clock.tick(ONE_MINUTE);
      assert.calledTwice(callback);
    });

    it('returned function cancels the timer', function () {
      const date = new Date();
      const callback = sandbox.stub();
      const cancel = time.decayingInterval(date, callback);
      cancel();
      sandbox.clock.tick(minute * 1000);
      assert.notCalled(callback);
    });

    it('does not set a timeout for dates > 24hrs ago', function () {
      const date = new Date();
      const ONE_DAY = day * 1000;
      sandbox.clock.tick(10 * ONE_DAY);
      const callback = sandbox.stub();

      time.decayingInterval(date, callback);
      sandbox.clock.tick(ONE_DAY * 2);

      assert.notCalled(callback);
    });
  });

  describe('.nextFuzzyUpdate', function () {
    it('Handles empty dates', function () {
      const t = null;
      const expect = null;
      assert.equal(time.nextFuzzyUpdate(t), expect);
    });

    const testFixture = function (f) {
      return function () {
        const t = new Date().toISOString();
        const expect = f[1];
        sandbox.clock.tick(f[0] * 1000);
        assert.equal(time.nextFuzzyUpdate(t), expect);
      };
    };

    for (let i = 0, f; i < FIXTURES_NEXT_FUZZY_UPDATE.length; i++) {
      f = FIXTURES_NEXT_FUZZY_UPDATE[i];
      it('gives correct next fuzzy update time for fixture ' + i,
        testFixture(f));
    }
  });
});
