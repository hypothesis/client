import processUrlTemplate from '../url-template';

describe('processUrlTemplate', () => {
  let fakeDocument;

  beforeEach(() => {
    fakeDocument = { currentScript: null, querySelectorAll: sinon.stub() };
  });

  context('when `document.currentScript` is set', () => {
    beforeEach(() => {
      fakeDocument.currentScript = {
        src: 'https://john-smith-mbp.local/hypothesis',
      };
    });

    it('replaces {current_host} in template', () => {
      const url = processUrlTemplate(
        'https://{current_host}:3000/script.js',
        fakeDocument
      );
      assert.equal(url, 'https://john-smith-mbp.local:3000/script.js');
    });

    it('replaces {current_scheme} in template', () => {
      const url = processUrlTemplate(
        '{current_scheme}://localhost/script.js',
        fakeDocument
      );
      assert.equal(url, 'https://localhost/script.js');
    });
  });

  context('when `document.currentScript` is not set', () => {
    beforeEach(() => {
      fakeDocument.querySelectorAll
        .withArgs('script')
        .returns([{ src: 'http://test-host:3001/script.js' }]);
    });

    it('falls back to using origin info from the last <script> tag in the document', () => {
      const url = processUrlTemplate(
        '{current_scheme}://{current_host}:2000/style.css',
        fakeDocument
      );
      assert.equal(url, 'http://test-host:2000/style.css');
    });

    it('does not try to determine the origin if there are no URL template params', () => {
      const url = processUrlTemplate(
        'https://hypothes.is/embed.js',
        fakeDocument
      );
      assert.equal(url, 'https://hypothes.is/embed.js');
      assert.notCalled(fakeDocument.querySelectorAll);
    });
  });
});
