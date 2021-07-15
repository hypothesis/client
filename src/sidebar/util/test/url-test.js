import { replaceURLParams } from '../url';

describe('sidebar/util/url', () => {
  describe('replaceURLParams()', () => {
    it('should replace params in URLs', () => {
      const replaced = replaceURLParams('http://foo.com/things/:id', {
        id: 'test',
      });
      assert.equal(replaced.url, 'http://foo.com/things/test');
    });

    it('should throw if param value is an array', () => {
      assert.throws(() => {
        replaceURLParams('http://foo.com/things/:id', {
          id: ['foo', 'bar'],
        });
      }, 'Cannot use array as URL parameter');
    });

    it('should URL encode params in URLs', () => {
      const replaced = replaceURLParams('http://foo.com/things/:id', {
        id: 'foo=bar',
      });
      assert.equal(replaced.url, 'http://foo.com/things/foo%3Dbar');
    });

    it('should return unused params', () => {
      const replaced = replaceURLParams('http://foo.com/:id', {
        id: 'test',
        q: 'unused',
      });
      assert.deepEqual(replaced.unusedParams, { q: 'unused' });
    });
  });
});
