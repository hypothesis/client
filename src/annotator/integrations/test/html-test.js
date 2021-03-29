import { HTMLIntegration, $imports } from '../html';

describe('HTMLIntegration', () => {
  let fakeHTMLAnchoring;
  let fakeHTMLMetadata;

  beforeEach(() => {
    fakeHTMLAnchoring = {
      anchor: sinon.stub(),
      describe: sinon.stub(),
    };

    fakeHTMLMetadata = {
      getDocumentMetadata: sinon.stub().returns({ title: 'Example site' }),
      uri: sinon.stub().returns('https://example.com/'),
    };

    const HTMLMetadata = sinon.stub().returns(fakeHTMLMetadata);
    $imports.$mock({
      '../anchoring/html': fakeHTMLAnchoring,
      './html-metadata': { HTMLMetadata },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('implements `anchor` and `destroy` using HTML anchoring', () => {
    const integration = new HTMLIntegration();
    assert.equal(integration.anchor, fakeHTMLAnchoring.anchor);
    assert.equal(integration.describe, fakeHTMLAnchoring.describe);
  });

  describe('#contentContainer', () => {
    it('returns body by default', () => {
      const integration = new HTMLIntegration();
      assert.equal(integration.contentContainer(), document.body);
    });
  });

  describe('#destroy', () => {
    it('does nothing', () => {
      new HTMLIntegration().destroy();
    });
  });

  describe('#fitSideBySide', () => {
    it('does nothing', () => {
      new HTMLIntegration().fitSideBySide({});
    });
  });

  describe('#getMetadata', () => {
    it('returns document metadata', async () => {
      const integration = new HTMLIntegration();
      assert.deepEqual(await integration.getMetadata(), {
        title: 'Example site',
      });
    });
  });

  describe('#uri', () => {
    it('returns main document URL', async () => {
      const integration = new HTMLIntegration();
      assert.deepEqual(await integration.uri(), 'https://example.com/');
    });
  });
});
