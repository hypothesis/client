'use strict';

const time = require('../time');

const minute = 60;
const hour = minute * 60;
const day = hour * 24;
const msPerSecond = 1000;

describe('sidebar.util.time', function() {
  let sandbox;
  let fakeIntl;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.useFakeTimers();

    fakeIntl = {
      DateTimeFormat: sinon.stub().returns({
        format: sinon.stub(),
      }),
    };
    // Clear the formatters cache so that mocked formatters
    // from one test run don't affect the next.
    time.clearFormatters();
  });

  afterEach(function() {
    sandbox.restore();
  });

  const fakeDate = isoString => {
    // Since methods like Date.getFullYear output the year in
    // whatever timezone the node timezone is set to, these
    // methods must be mocked/mapped to their UTC equivalents when
    // testing such as getUTCFullYear in order to have timezone
    // agnostic tests.
    // Example:
    // An annotation was posted at 2019-01-01T01:00:00 UTC and now the
    // current date is a few days later; 2019-01-10.
    // - A user in the UK who views the annotation will see “Jan 1”
    //   on the annotation card (correct)
    // - A user in San Francisco who views the annotation will see
    //   “Dec 31st 2018" on the annotation card (also correct from
    //   their point of view).
    const date = new Date(isoString);
    date.getFullYear = sinon.stub().returns(date.getUTCFullYear());
    return date;
  };

  describe('.toFuzzyString', function() {
    it('Handles empty dates', function() {
      const date = null;
      const expect = '';
      assert.equal(time.toFuzzyString(date, undefined), expect);
    });

    [
      { now: '1970-01-01T00:00:10.000Z', text: 'Just now' },
      { now: '1970-01-01T00:00:29.000Z', text: 'Just now' },
      { now: '1970-01-01T00:00:49.000Z', text: '49 secs' },
      { now: '1970-01-01T00:01:05.000Z', text: '1 min' },
      { now: '1970-01-01T00:03:05.000Z', text: '3 mins' },
      { now: '1970-01-01T01:00:00.000Z', text: '1 hr' },
      { now: '1970-01-01T04:00:00.000Z', text: '4 hrs' },
    ].forEach(test => {
      it('creates correct fuzzy string for fixture ' + test.now, () => {
        const timeStamp = fakeDate('1970-01-01T00:00:00.000Z');
        const now = fakeDate(test.now);
        assert.equal(time.toFuzzyString(timeStamp, now), test.text);
      });
    });

    [
      {
        now: '1970-01-02T03:00:00.000Z',
        text: '2 Jan',
        options: { day: 'numeric', month: 'short' },
      },
      {
        now: '1970-01-04T00:30:00.000Z',
        text: '4 Jan',
        options: { day: 'numeric', month: 'short' },
      },
      {
        now: '1970-07-03T00:00:00.000Z',
        text: '3 July',
        options: { day: 'numeric', month: 'short' },
      },
      {
        now: '1971-01-01T00:00:00.000Z',
        text: '1 Jan 1970',
        options: { day: 'numeric', month: 'short', year: 'numeric' },
      },
      {
        now: '1971-03-01T00:00:00.000Z',
        text: '1 Jan 1970',
        options: { day: 'numeric', month: 'short', year: 'numeric' },
      },
      {
        now: '1972-01-01T00:00:00.000Z',
        text: '1 Jan 1970',
        options: { day: 'numeric', month: 'short', year: 'numeric' },
      },
      {
        now: '1978-01-01T00:00:00.000Z',
        text: '1 Jan 1970',
        options: { day: 'numeric', month: 'short', year: 'numeric' },
      },
    ].forEach(test => {
      it(
        'passes correct arguments to `Intl.DateTimeFormat.format` for fixture ' +
          test.now,
        () => {
          const timeStamp = fakeDate('1970-01-01T00:00:00.000Z');
          const now = fakeDate(test.now);

          fakeIntl.DateTimeFormat().format.returns(test.text); // eslint-disable-line new-cap
          assert.equal(time.toFuzzyString(timeStamp, now, fakeIntl), test.text);
          assert.calledWith(fakeIntl.DateTimeFormat, undefined, test.options);
          assert.calledWith(fakeIntl.DateTimeFormat().format, timeStamp); // eslint-disable-line new-cap
        }
      );
    });

    it('falls back to simple strings for >24hrs ago', function() {
      // If window.Intl is not available then the date formatting for dates
      // more than one day ago falls back to a simple date string.
      const timeStamp = fakeDate('1970-01-01T00:00:00.000Z');
      timeStamp.toDateString = sinon.stub().returns('Thu Jan 01 1970');
      const now = fakeDate('1970-01-02T00:00:00.000Z');

      const formattedDate = time.toFuzzyString(timeStamp, now, null);
      assert.calledOnce(timeStamp.toDateString);
      assert.equal(formattedDate, 'Thu Jan 01 1970');
    });

    it('falls back to simple strings for >1yr ago', function() {
      // If window.Intl is not available then the date formatting for dates
      // more than one year ago falls back to a simple date string.
      const timeStamp = fakeDate('1970-01-01T00:00:00.000Z');
      timeStamp.toDateString = sinon.stub().returns('Thu Jan 01 1970');
      const now = fakeDate('1972-01-01T00:00:00.000Z');

      const formattedDate = time.toFuzzyString(timeStamp, now, null);
      assert.calledOnce(timeStamp.toDateString);
      assert.equal(formattedDate, 'Thu Jan 01 1970');
    });
  });

  describe('.decayingInterval', function() {
    it('Handles empty dates', function() {
      const date = null;
      time.decayingInterval(date, undefined);
    });

    it('uses a short delay for recent timestamps', function() {
      const date = new Date().toISOString();
      const callback = sandbox.stub();
      time.decayingInterval(date, callback);
      sandbox.clock.tick(6 * msPerSecond);
      assert.calledWith(callback, date);
      sandbox.clock.tick(6 * msPerSecond);
      assert.calledTwice(callback);
    });

    it('uses a longer delay for older timestamps', function() {
      const date = new Date().toISOString();
      const ONE_MINUTE = minute * msPerSecond;
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

    it('returned function cancels the timer', function() {
      const date = new Date().toISOString();
      const callback = sandbox.stub();
      const cancel = time.decayingInterval(date, callback);
      cancel();
      sandbox.clock.tick(minute * msPerSecond);
      assert.notCalled(callback);
    });

    it('does not set a timeout for dates > 24hrs ago', function() {
      const date = new Date().toISOString();
      const ONE_DAY = day * msPerSecond;
      sandbox.clock.tick(10 * ONE_DAY);
      const callback = sandbox.stub();

      time.decayingInterval(date, callback);
      sandbox.clock.tick(ONE_DAY * 2);

      assert.notCalled(callback);
    });
  });

  describe('.nextFuzzyUpdate', function() {
    it('Handles empty dates', function() {
      const date = null;
      const expect = null;
      assert.equal(time.nextFuzzyUpdate(date, undefined), expect);
    });

    [
      { now: '1970-01-01T00:00:10.000Z', expectedUpdateTime: 5 }, // we have a minimum of 5 secs
      { now: '1970-01-01T00:00:20.000Z', expectedUpdateTime: 5 },
      { now: '1970-01-01T00:00:49.000Z', expectedUpdateTime: 5 },
      { now: '1970-01-01T00:01:05.000Z', expectedUpdateTime: minute },
      { now: '1970-01-01T00:03:05.000Z', expectedUpdateTime: minute },
      { now: '1970-01-01T04:00:00.000Z', expectedUpdateTime: hour },
      { now: '1970-01-02T03:00:00.000Z', expectedUpdateTime: null },
      { now: '1970-01-04T00:30:00.000Z', expectedUpdateTime: null },
      { now: '1970-07-02T00:00:00.000Z', expectedUpdateTime: null },
      { now: '1978-01-01T00:00:00.000Z', expectedUpdateTime: null },
    ].forEach(test => {
      it('gives correct next fuzzy update time for fixture ' + test.now, () => {
        const timeStamp = fakeDate('1970-01-01T00:00:00.000Z');
        const now = fakeDate(test.now);
        assert.equal(
          time.nextFuzzyUpdate(timeStamp, now),
          test.expectedUpdateTime
        );
      });
    });
  });
});
