'use strict';

var observable = require('../observable');

describe('observable', function () {
  describe('delay()', function () {
    var clock;

    beforeEach(function () {
      clock = sinon.useFakeTimers();
    });

    afterEach(function () {
      clock.restore();
    });

    it('defers events', function () {
      var received = [];
      var obs = observable.delay(50, observable.Observable.of('foo'));
      obs.forEach(function (v) {
        received.push(v);
      });
      assert.deepEqual(received, []);
      clock.tick(100);
      assert.deepEqual(received, ['foo']);
    });

    it('delivers events in sequence', function () {
      var received = [];
      var obs = observable.delay(10, observable.Observable.of(1,2));
      obs.forEach(function (v) {
        received.push(v);
      });
      clock.tick(20);
      assert.deepEqual(received, [1,2]);
    });
  });
});
