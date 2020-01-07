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

  describe('#annotationSharingEnabled', () => {
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

  describe('#shareURI', () => {
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

  describe('#isShareable', () => {
    it('returns `true` if sharing enabled and there is a share link available', () => {
      fakeServiceConfig.returns(null);
      assert.isTrue(sharingUtil.isShareable(fakeAnnotation, {}));
    });

    it('returns `false` if sharing not enabled', () => {
      fakeServiceConfig.returns({ enableShareLinks: false });
      assert.isFalse(sharingUtil.isShareable(fakeAnnotation, {}));
    });

    it('returns `false` if no sharing link available on annotation', () => {
      fakeServiceConfig.returns(null);
      delete fakeAnnotation.links;

      assert.isFalse(sharingUtil.isShareable(fakeAnnotation, {}));
    });
  });
});
