import { trustMarkup } from '../trusted';

describe('trustMarkup', () => {
  it('returns the provided object wrapped in a key called `trustedHTML`', () => {
    assert.match(trustMarkup('some object'), {
      trustedHTML: 'some object',
    });
  });
});
