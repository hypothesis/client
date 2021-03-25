import { HTMLIntegration, $imports } from '../html';

describe('HTMLIntegration', () => {
  let fakeHtmlAnchoring;
  let fakeHtmlMetadata;

  beforeEach(() => {
    fakeHtmlAnchoring = {
      anchor: sinon.stub(),
      describe: sinon.stub(),
    };

    fakeHtmlMetadata = {
      getDocumentMetadata: sinon.stub().returns({ title: 'Example site' }),
      uri: sinon.stub().returns('https://example.com/'),
    };

    const HTMLMetadata = sinon.stub().returns(fakeHtmlMetadata);
    $imports.$mock({
      '../anchoring/html': fakeHtmlAnchoring,
      './html-metadata': { HTMLMetadata },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('implements `anchor` and `destroy` using HTML anchoring', () => {
    const integration = new HTMLIntegration();
    assert.equal(integration.anchor, fakeHtmlAnchoring.anchor);
    assert.equal(integration.describe, fakeHtmlAnchoring.describe);
  });

  describe('#contentContainer', () => {
    it('returns body by default', () => {
      const integration = new HTMLIntegration();
      assert.equal(integration.contentContainer(), document.body);
    });
  });

  describe('#destroy', () => {
    it('cleans up integration', () => {
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
