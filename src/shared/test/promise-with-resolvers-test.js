import { promiseWithResolvers } from '../promise-with-resolvers';

describe('promiseWithResolvers', () => {
  it('resolves returned promise with `resolve` callback', async () => {
    const { promise, resolve } = promiseWithResolvers();
    const expected = 'some value';

    resolve(expected);

    const result = await promise;

    assert.equal(result, expected);
  });

  it('rejects returned promise with `reject` callback', async () => {
    const { promise, reject } = promiseWithResolvers();
    const expected = 'some error';

    reject(new Error(expected));

    await assert.rejects(promise, expected);
  });
});
