'use strict';

var mutex = require('../mutex');

// The tests for the mutex service are designed to be generic enough that we
// could swap out the underlying mutex implementation in future, eg. if browsers
// provide better primitives for this, and continue to re-use the same tests.
describe('sidebar.mutex', () => {
  var mutexes;

  function createMutex() {
    var mu = mutex();

    // Reduce spin delay to speed up tests.
    mu.setSpinDelay(5);

    // Save this mutex so we can unlock it after the test completes.
    mutexes.push(mu);

    return mu;
  }

  beforeEach(() => {
    mutexes = [];
  });

  afterEach(() => {
    return Promise.all(mutexes.map(mu => mu.unlock()));
  });

  describe('#lock', () => {
    it('locks the mutex', () => {
      var mtxA = createMutex();
      var mtxB = createMutex();

      var aIsLocked = false;
      var bIsLocked = false;

      var aLocked = mtxA.lock().then(() => aIsLocked = true);
      var bLocked = mtxB.lock().then(() => bIsLocked = true);

      return Promise.race([aLocked, bLocked]).then(() => {
        // Check that only one lock was acquired.
        assert.isTrue(aIsLocked !== bIsLocked);

        // Now let the other `lock()` complete before the test finishes.
        mtxA.unlock();
        mtxB.unlock();

        return Promise.all([aLocked, bLocked]);
      });
    });

    it('waits until the mutex is unlocked', () => {
      var mtxA = createMutex();
      var mtxB = createMutex();

      var lockTimeA;
      var lockTimeB;

      var lockedA = mtxA.lock().then(() => {
        lockTimeA = Date.now();
        setTimeout(() => {
          mtxA.unlock();
        }, 50);
      });
      var lockedB = mtxB.lock().then(() => {
        lockTimeB = Date.now();
      });

      return Promise.all([lockedA, lockedB]).then(() => {
        var delta = lockTimeB - lockTimeA;

        assert.isAbove(delta, 45);
      });
    });

    context('if another client fails to unlock the mutex', () => {
      it('waits until the mutex expires', () => {
        var mtxA = createMutex();
        var mtxB = createMutex();

        mtxA.setExpiry(50);
        mtxB.setExpiry(50);

        var lockTimeA;
        var lockTimeB;

        var lockedA = mtxA.lock().then(() => {
          lockTimeA = Date.now();
        });
        var lockedB = mtxB.lock().then(() => {
          lockTimeB = Date.now();
        });

        return Promise.all([lockedA, lockedB]).then(() => {
          var delta = lockTimeB - lockTimeA;
          assert.isAbove(delta, 45);
        });
      });
    });
  });

  describe('#unlock', () => {
    it('unlocks the mutex', () => {
      var mtxA = createMutex();
      var mtxB = createMutex();

      return mtxA.lock().then(() => {
        // Unlock `mtxA`, allowing `mtxB` to acquire the lock.
        return Promise.all([mtxA.unlock(), mtxB.lock()]);
      });
    });
  });
});
