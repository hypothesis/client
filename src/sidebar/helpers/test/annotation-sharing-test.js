import * as sharingUtil from '../annotation-sharing';

describe('sidebar/helpers/annotation-sharing', () => {
  describe('pageSharingLink', () => {
    it('generates a bouncer link based on the document URI and group id', () => {
      assert.equal(
        sharingUtil.pageSharingLink('https://www.example.com', 'testprivate'),
        'https://hyp.is/go?url=https%3A%2F%2Fwww.example.com&group=testprivate',
      );
    });

    it('returns null if the `documentURI` is not a shareable URI', () => {
      assert.isNull(
        sharingUtil.pageSharingLink('file://on-my-computer.pdf', 'testprivate'),
      );
    });
  });

  describe('isShareableURI', () => {
    [
      'http://www.example.com',
      'http://www.foo.bar',
      'http://hi',
      'http:foo',
      'https://www.foo.bar/baz/ding.html',
      'HTTP://WWW.FOO.BAR/BAZ',
      'HTTPS://WWW.FOO.COM',
    ].forEach(validURI => {
      it('returns true for URLs with http and https protocols', () => {
        assert.isTrue(sharingUtil.isShareableURI(validURI));
      });
    });

    [
      'httf://www.example.com',
      'htt://whatever',
      'ftp://warez.napster.nostalgia',
      'file://hithere',
      'chrome://extensions',
      'http//www.wrong',
      'www.example.com',
    ].forEach(invalidURI => {
      it('returns false for any URL not beginning with http or https', () => {
        assert.isFalse(sharingUtil.isShareableURI(invalidURI));
      });
    });
  });
});
