'use strict';

const angular = require('angular');
const service = require('../local-storage');

function windowWithLocalStoragePropertyThatThrows() {
  const win = {};
  Object.defineProperty(win, 'localStorage', {
    get() {
      throw Error('denied');
    },
  });
  return win;
}

function windowWithLocalStorageMethodsThatThrow() {
  const throwErr = sinon.stub().throws(new Error('Denied'));

  return {
    localStorage: {
      getItem: throwErr,
      removeItem: throwErr,
      setItem: throwErr,
    },
  };
}

describe('sidebar.localStorage', () => {
  let fakeWindow;

  before(() => angular.module('h', []).service('localStorage', service));

  [
    windowWithLocalStorageMethodsThatThrow(),
    windowWithLocalStoragePropertyThatThrows(),
  ].forEach($window => {
    context('when browser localStorage is *not* accessible', () => {
      let localStorage = null;
      let key = null;

      beforeEach(() => {
        angular.mock.module('h', {
          $window,
        });
      });

      beforeEach(
        angular.mock.inject(_localStorage_ => {
          localStorage = _localStorage_;
          key = 'test.memory.key';
        })
      );

      it('sets/gets Item', () => {
        const value = 'What shall we do with a drunken sailor?';
        localStorage.setItem(key, value);
        const actual = localStorage.getItem(key);
        assert.equal(value, actual);
      });

      it('removes item', () => {
        localStorage.setItem(key, '');
        localStorage.removeItem(key);
        const result = localStorage.getItem(key);
        assert.isNull(result);
      });

      it('sets/gets Object', () => {
        const data = { foo: 'bar' };
        localStorage.setObject(key, data);
        const stringified = localStorage.getItem(key);
        assert.equal(stringified, JSON.stringify(data));

        const actual = localStorage.getObject(key);
        assert.deepEqual(actual, data);
      });
    });
  });

  context('when browser localStorage is accessible', () => {
    let localStorage;

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
      angular.mock.inject(_localStorage_ => (localStorage = _localStorage_));
    });

    it('uses window.localStorage functions to handle data', () => {
      const key = 'test.storage.key';
      const data = 'test data';

      localStorage.setItem(key, data);
      assert.calledWith(fakeWindow.localStorage.setItem, key, data);
    });
  });
});
