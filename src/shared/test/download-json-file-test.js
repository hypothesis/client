import { downloadJSONFile } from '../download-json-file';

describe('download-json-file', () => {
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
  });

  it('generates export file with provided annotations', () => {
    const filename = 'my-file.json';
    const data = { foo: ['bar', 'baz'] };

    const fileContent = downloadJSONFile(data, filename, fakeDocument);

    assert.equal(fileContent, JSON.stringify(data, null, 2));

    assert.calledWith(fakeDocument.createElement, 'a');
    assert.calledWith(fakeDocument.body.appendChild, fakeLink);
    assert.calledWith(fakeDocument.body.removeChild, fakeLink);

    assert.calledWith(
      fakeLink.setAttribute.firstCall,
      'href',
      sinon.match.string,
    );
    assert.calledWith(fakeLink.setAttribute.secondCall, 'download', filename);
    assert.equal('hidden', fakeLink.style.visibility);
  });
});
