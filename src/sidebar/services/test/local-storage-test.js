'use strict';

var angular = require('angular');
var service = require('../local-storage');

function windowWithLocalStoragePropertyThatThrows() {
  var win = {};
  Object.defineProperty(win, 'localStorage', {
    get() {
      throw Error('denied');
    },
  });
  return win;
}

function windowWithLocalStorageMethodsThatThrow() {
  var throwErr = sinon.stub.throws(new Error('Denied'));

  return {
    localStorage: {
      getItem: throwErr,
      removeItem: throwErr,
      setItem: throwErr,
    },
  };
}

describe('sidebar.localStorage', () => {
  var fakeWindow;

  before(() =>
    angular.module('h', [])
      .service('localStorage', service)
  );

  [
    windowWithLocalStorageMethodsThatThrow(),
    windowWithLocalStoragePropertyThatThrows(),
  ].forEach(($window) => {
    context('when browser localStorage is *not* accessible', () => {
      var localStorage = null;
      var key = null;

      beforeEach(() => {
        angular.mock.module('h', {
          $window,
        });
      });

      beforeEach(angular.mock.inject((_localStorage_) => {
        localStorage = _localStorage_;
        key = 'test.memory.key';
      }));

      it('sets/gets Item', () => {
        var value = 'What shall we do with a drunken sailor?';
        localStorage.setItem(key, value);
        var actual = localStorage.getItem(key);
        assert.equal(value, actual);
      });

      it('removes item', () => {
        localStorage.setItem(key, '');
        localStorage.removeItem(key);
        var result = localStorage.getItem(key);
        assert.isNull(result);
      });

      it('sets/gets Object', () => {
        var data = {'foo': 'bar'};
        localStorage.setObject(key, data);
        var stringified = localStorage.getItem(key);
        assert.equal(stringified, JSON.stringify(data));

        var actual = localStorage.getObject(key);
        assert.deepEqual(actual, data);
      });
    });
  });

  context('when browser localStorage is accessible', () => {
    var localStorage;

    beforeEach(() => {
      fakeWindow = {
        localStorage: {
          getItem: sinon.stub(),
          setItem: sinon.stub(),
          removeItem: sinon.stub(),
        },
      };

      angular.mock.module('h', {
        $window: fakeWindow,
      });
    });

    beforeEach(() => {
      angular.mock.inject(_localStorage_ => localStorage = _localStorage_);
    });

    it('uses window.localStorage functions to handle data', () => {
      var key = 'test.storage.key';
      var data = 'test data';

      localStorage.setItem(key, data);
      assert.calledWith(fakeWindow.localStorage.setItem, key, data);
    });
  });
});
