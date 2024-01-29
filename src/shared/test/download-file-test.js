import { downloadFile } from '../download-file';

describe('download-file', () => {
  let fakeLink;
  let fakeDocument;

  beforeEach(() => {
    fakeLink = {
      setAttribute: sinon.stub(),
      click: sinon.stub(),
      style: {},
    };

    fakeDocument = {
      createElement: sinon.stub().returns(fakeLink),
      body: {
        appendChild: sinon.stub(),
        removeChild: sinon.stub(),
      },
    };

    sinon.spy(window, 'Blob');
  });

  afterEach(() => {
    window.Blob.restore();
  });

  function assertDownloadHappened(filename, fileContent, type) {
    assert.calledWith(fakeDocument.createElement, 'a');
    assert.calledWith(fakeDocument.body.appendChild, fakeLink);
    assert.calledWith(fakeDocument.body.removeChild, fakeLink);

    assert.calledWith(window.Blob, [fileContent], { type });

    assert.calledWith(
      fakeLink.setAttribute.firstCall,
      'href',
      sinon.match.string,
    );
    assert.calledWith(fakeLink.setAttribute.secondCall, 'download', filename);
    assert.equal('hidden', fakeLink.style.visibility);
  }

  ['application/json', 'text/plain', 'text/csv', 'text/html'].forEach(type => {
    it('downloadTextFile generates text file with provided data', () => {
      const data = 'The content of the file';
      const filename = 'my-file.txt';

      downloadFile(data, type, filename, fakeDocument);

      assertDownloadHappened(filename, data, type);
    });
  });
});
