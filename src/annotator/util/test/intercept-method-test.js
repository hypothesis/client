'use strict';

const interceptMethod = require('../intercept-method');

describe('annotator.util.intercept-method', () => {
  let someWebApi;

  beforeEach(() => {
    someWebApi = {
      aMethod: sinon.stub(),
    };
  });

  describe('interceptMethod', () => {
    it('invokes callback when method is called', () => {
      const intercept = sinon.stub();

      interceptMethod(someWebApi, 'aMethod', intercept);
      someWebApi.aMethod(1, 2, 3);

      assert.calledWith(intercept, 1, 2, 3);
    });

    it('passes arguments to original method', () => {
      const originalMethod = someWebApi.aMethod;

      interceptMethod(someWebApi, 'aMethod', sinon.stub());
      someWebApi.aMethod(1, 2, 3);

      assert.calledWith(originalMethod, 1, 2, 3);
    });

    it('returns result of original method', () => {
      const originalMethod = someWebApi.aMethod;
      originalMethod.returns(42);

      interceptMethod(someWebApi, 'aMethod', sinon.stub());
      assert.equal(someWebApi.aMethod(1, 2, 3), 42);
    });

    it('reverts patch when returned function is called', () => {
      const originalMethod = someWebApi.aMethod;
      const revert = interceptMethod(someWebApi, 'aMethod', sinon.stub());

      revert();

      assert.equal(someWebApi.aMethod, originalMethod);
    });

    it('does not revert patch if method is patched again', () => {
      const originalMethod = someWebApi.aMethod;
      const revert = interceptMethod(someWebApi, 'aMethod', sinon.stub());

      // Simulate some other code patching the same method after it has already
      // been patched by us.
      interceptMethod(someWebApi, 'aMethod', sinon.stub());
      revert();

      assert.notEqual(someWebApi.aMethod, originalMethod);
    });
  });
});
