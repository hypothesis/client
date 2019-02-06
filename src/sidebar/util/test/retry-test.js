'use strict';

const retryUtil = require('../retry');
const toResult = require('../../../shared/test/promise-util').toResult;

describe('sidebar.util.retry', function() {
  describe('.retryPromiseOperation', function() {
    it('should return the result of the operation function', function() {
      const operation = sinon.stub().returns(Promise.resolve(42));
      const wrappedOperation = retryUtil.retryPromiseOperation(operation);
      return wrappedOperation.then(function(result) {
        assert.equal(result, 42);
      });
    });

    it('should retry the operation if it fails', function() {
      const results = [new Error('fail'), 'ok'];
      const operation = sinon.spy(function() {
        const nextResult = results.shift();
        if (nextResult instanceof Error) {
          return Promise.reject(nextResult);
        } else {
          return Promise.resolve(nextResult);
        }
      });
      const wrappedOperation = retryUtil.retryPromiseOperation(operation, {
        minTimeout: 1,
      });
      return wrappedOperation.then(function(result) {
        assert.equal(result, 'ok');
      });
    });

    it('should return the error if it repeatedly fails', function() {
      const error = new Error('error');
      const operation = sinon.spy(function() {
        return Promise.reject(error);
      });
      const wrappedOperation = retryUtil.retryPromiseOperation(operation, {
        minTimeout: 3,
        retries: 2,
      });
      return toResult(wrappedOperation).then(function(result) {
        assert.equal(result.error, error);
      });
    });
  });
});
