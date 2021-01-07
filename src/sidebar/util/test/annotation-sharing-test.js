import * as sharingUtil from '../annotation-sharing';

describe('sidebar.util.annotation-sharing', () => {
  let fakeAnnotation;
  let fakeServiceConfig;
  let fakeServiceSettings;

  beforeEach(() => {
    fakeServiceSettings = {};
    fakeServiceConfig = sinon.stub().returns(fakeServiceSettings);
    fakeAnnotation = {
      links: {
        incontext: 'https://www.example.com',
        html: 'https://www.example2.com',
      },
    };

    sharingUtil.$imports.$mock({
      '../service-config': fakeServiceConfig,
    });
  });

  afterEach(() => {
    sharingUtil.$imports.$restore();
  });

  describe('getSharingLink', () => {
    it('generates a bouncer link based on the document URI and group id', () => {
      assert.equal(
        sharingUtil.getSharingLink('https://www.example.com', 'testprivate'),
        'https://hyp.is/go?url=https%3A%2F%2Fwww.example.com&group=testprivate'
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

  describe('sharingEnabled', () => {
    it('returns true if no service settings present', () => {
      fakeServiceConfig.returns(null);
      assert.isTrue(sharingUtil.sharingEnabled({}));
    });

    it('returns true if service settings do not have a `enableShareLinks` prop', () => {
      // service config is an empty object
      assert.isTrue(sharingUtil.sharingEnabled({}));
    });

    it('returns true if service settings `enableShareLinks` is non-boolean', () => {
      fakeServiceConfig.returns({ enableShareLinks: 'foo' });
      assert.isTrue(sharingUtil.sharingEnabled({}));
    });

    it('returns false if service settings really sets it to nope', () => {
      fakeServiceConfig.returns({ enableShareLinks: false });
      assert.isFalse(sharingUtil.sharingEnabled({}));
    });
  });

  describe('shareURI', () => {
    it('returns `incontext` link if set on annotation', () => {
      assert.equal(
        sharingUtil.shareURI(fakeAnnotation),
        'https://www.example.com'
      );
    });

    it('returns `html` link if `incontext` link not set on annotation', () => {
      delete fakeAnnotation.links.incontext;

      assert.equal(
        sharingUtil.shareURI(fakeAnnotation),
        'https://www.example2.com'
      );
    });

    it('returns `undefined` if links empty', () => {
      delete fakeAnnotation.links.incontext;
      delete fakeAnnotation.links.html;

      assert.isUndefined(sharingUtil.shareURI(fakeAnnotation));
    });

    it('returns `undefined` if no links on annotation', () => {
      delete fakeAnnotation.links;

      assert.isUndefined(sharingUtil.shareURI(fakeAnnotation));
    });
  });
});
