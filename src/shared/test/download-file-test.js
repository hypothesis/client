import { downloadFile } from '../download-file';

describe('download-file', () => {
  let fakeLink;
  let fakeDocument;
  let sandbox;

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

    sandbox = sinon.createSandbox();
    sandbox.spy(window, 'Blob');

    // We stub `URL.createObjectURL` both to control the returned URL but also
    // because it can occassionally be slow if called in the middle of a large
    // test run, leading to a slow test warning.
    //
    // Possibly relevant: https://issues.chromium.org/issues/40269900.
    sandbox.stub(URL, 'createObjectURL').returns('blob:1234');
  });

  afterEach(() => {
    sandbox.restore();
  });

  function assertDownloadHappened(filename, fileContent, type) {
    assert.calledWith(fakeDocument.createElement, 'a');
    assert.calledWith(fakeDocument.body.appendChild, fakeLink);
    assert.calledWith(fakeDocument.body.removeChild, fakeLink);

    assert.calledWith(window.Blob, [fileContent], { type });
    assert.calledWith(URL.createObjectURL, window.Blob.returnValues[0]);

    assert.calledWith(fakeLink.setAttribute.firstCall, 'href', 'blob:1234');
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
