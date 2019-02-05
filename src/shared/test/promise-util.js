'use strict';

/**
 * Helper to assert a promise is rejected.
 *
 * IMPORTANT NOTE: If you use this you must _return_ the result of this function
 * from your test, otherwise the test runner will not know when your test is
 * finished.
 *
 * @param {Promise} promise
 * @param {string} expectedErr - Expected `message` property of error
 */
function assertPromiseIsRejected(promise, expectedErr) {
  const rejectFlag = {};
  return promise
    .catch(err => {
      assert.equal(err.message, expectedErr);
      return rejectFlag;
    })
    .then(result => {
      assert.equal(
        result,
        rejectFlag,
        'expected promise to be rejected but it was fulfilled'
      );
    });
}

/**
 * Takes a Promise<T> and returns a Promise<Result>
 * where Result = { result: T } | { error: any }.
 *
 * This is useful for testing that promises are rejected
 * as expected in tests.
 *
 * Consider using `assertPromiseIsRejected` instead.
 */
function toResult(promise) {
  return promise
    .then(function(result) {
      return { result: result };
    })
    .catch(function(err) {
      return { error: err };
    });
}

module.exports = {
  assertPromiseIsRejected,
  toResult,
};
