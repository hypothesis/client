'use strict';

const processUrlTemplate = require('../url-template');

describe('processUrlTemplate', () => {
  let fakeDocument;

  beforeEach(() => {
    fakeDocument = { currentScript: null };
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
    it('does not replace parameters', () => {
      const url = processUrlTemplate(
        '{current_scheme}://{current_host}:2000/style.css',
        fakeDocument
      );
      assert.equal(url, '{current_scheme}://{current_host}:2000/style.css');
    });
  });
});
