'use strict';

var mutex = require('../mutex');

class FakeLocalStorage {
  constructor() {
    this._store = {};
  }

  setObject(key, obj) {
    assert.isObject(obj);
    this._store[key] = obj;
  }

  getObject(key) {
    return this._store[key] || null;
  }

  removeItem(key) {
    delete this._store[key];
  }
}

describe('sidebar.mutex', () => {
  var fakeLocalStorage;

  function createMutex(id) {
    var fakeRandom = {
      generateHexString: () => id,
    };

    var mtx = mutex(fakeLocalStorage, fakeRandom);

    // Reduce spin delay to speed up tests.
    mtx.setSpinDelay(5);

    return mtx;
  }

  beforeEach(() => {
    fakeLocalStorage = new FakeLocalStorage;
  });

  describe('#lock', () => {
    it('locks the mutex', () => {
      var mtx = createMutex('id');
      return mtx.lock('foo').then(() => {
        assert.isObject(fakeLocalStorage.getObject('hypothesis.mutex.foo'));
      });
    });

    it('waits until the mutex is unlocked', () => {
      var mtxA = createMutex('a');
      var mtxB = createMutex('b');

      var lockTimeA;
      var lockTimeB;

      var lockedA = mtxA.lock('foo').then(() => {
        lockTimeA = Date.now();
      });
      var lockedB = mtxB.lock('foo').then(() => {
        lockTimeB = Date.now();
      });

      setTimeout(() => {
        mtxA.unlock('foo');
      }, 50);

      return Promise.all([lockedA, lockedB]).then(() => {
        var delta = lockTimeB - lockTimeA;
        assert.isAbove(delta, 50);
      });
    });

    context('if another client fails to unlock the mutex', () => {
      it('waits until the mutex expires', () => {
        var mtxA = createMutex('a');
        var mtxB = createMutex('b');

        var lockTimeA;
        var lockTimeB;

        var lockedA = mtxA.lock('foo', 50).then(() => {
          lockTimeA = Date.now();
        });
        var lockedB = mtxB.lock('foo', 50).then(() => {
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
    it('throws an error if the mutex is not locked', () => {
      var mtx = createMutex('id');
      assert.throws(() => {
        return mtx.unlock('foo');
      });
    });

    it('throws an error if a different client locked the mutex', () => {
      var mtxA = createMutex('a');
      var mtxB = createMutex('b');

      return mtxA.lock('foo').then(() => {
        assert.throws(() => {
          mtxB.unlock('foo');
        });
      });
    });

    it('unlocks the mutex', () => {
      var mtx = createMutex('id');
      return mtx.lock('foo').then(() => {
        mtx.unlock('foo');

        assert.isNull(fakeLocalStorage.getObject('hypothesis.mutex.foo'));
      });
    });
  });
});
