'use strict';

var cleanContext = require('../clean-context');

beforeEach('reset the global document object', function() {
  cleanContext.reset();
});

describe('clean-context', function() {
  context('if the parent context overwrites Function.prototype.bind()', function() {

    var originalFunctionBind = Function.prototype.bind;
    var originalFunctionBindCall = Function.prototype.bind.call;

    afterEach('reset properties of global objects', function() {
      Function.prototype.bind = originalFunctionBind;
      Function.prototype.bind.call = originalFunctionBindCall;
    });

    it('returns a clean copy of Function.prototype.bind()', function() {
      Function.prototype.bind = function() { assert.fail(); };

      cleanContext.bind.call(function() {}, this);
    });

    it('returns a clean bind() even if bind() is modified after it has already been called', function() {
      cleanContext.bind.call(function() {}, this);
      Function.prototype.bind.call = function() { assert.fail(); };

      cleanContext.bind.call(function() {}, this);
    });

    it('only injects one iframe even if called multiple times', function() {
      Function.prototype.bind = function() { assert.fail(); };

      cleanContext.bind.call(function() {}, this);
      cleanContext.bind.call(function() {}, this);
      cleanContext.bind.call(function() {}, this);

      assert.equal(document.getElementsByTagName('iframe').length, 1);
    });

    context('if the parent context Function.prototype.bind is not even a function', function() {
      it('returns a clean copy of Function.prototype.bind()', function() {
        Function.prototype.bind = 'not_a_function';

        cleanContext.bind.call(function() {}, this);
      });
    });
  });

  context("if the parent context doesn't overwrite any globals", function() {
    it('returns the global Function.bind', function() {
      assert.strictEqual(cleanContext.bind, Function.prototype.bind);
    });

    it("doesn't append an iframe to the document", function() {
      cleanContext.bind.call(function() {}, this);

      assert.equal(document.getElementsByTagName('iframe').length, 0);
    });
  });
});
