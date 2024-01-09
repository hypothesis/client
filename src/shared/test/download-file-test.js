import {
  downloadCSVFile,
  downloadHTMLFile,
  downloadJSONFile,
  downloadTextFile,
} from '../download-file';

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

  it('downloadJSONFile generates JSON file with provided data', () => {
    const data = { foo: ['bar', 'baz'] };
    const filename = 'my-file.json';

    const fileContent = downloadJSONFile(data, filename, fakeDocument);

    assert.equal(fileContent, JSON.stringify(data, null, 2));
    assertDownloadHappened(filename, fileContent, 'application/json');
  });

  it('downloadTextFile generates text file with provided data', () => {
    const data = 'The content of the file';
    const filename = 'my-file.txt';

    downloadTextFile(data, filename, fakeDocument);

    assertDownloadHappened(filename, data, 'text/plain');
  });

  it('downloadCSVFile generates csv file with provided data', () => {
    const data = 'foo,bar,baz';
    const filename = 'my-file.csv';

    downloadCSVFile(data, filename, fakeDocument);

    assertDownloadHappened(filename, data, 'text/csv');
  });

  it('downloadHTMLFile generates HTML file with provided data', () => {
    const data = '<p>Hello</p>';
    const filename = 'my-file.html';

    downloadHTMLFile(data, filename, fakeDocument);

    assertDownloadHappened(filename, data, 'text/html');
  });
});
