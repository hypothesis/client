import { readJSONFile } from '../read-json-file';

describe('readJSONFile', () => {
  const file = new File([], 'my-file');

  function createFakeFileReader(fileContent) {
    return {
      addEventListener: sinon.stub().callsArgWith(1, {
        target: {
          result: fileContent,
        },
      }),
      readAsText: sinon.stub(),
    };
  }

  it('rejects when content is not valid JSON', async () => {
    const fakeFileReader = createFakeFileReader('not JSON');

    await assert.rejects(
      readJSONFile(file, fakeFileReader),
      'Unexpected token \'o\', "not JSON" is not valid JSON',
    );
    assert.calledWith(fakeFileReader.readAsText, file);
    assert.calledWith(
      fakeFileReader.addEventListener,
      'loadend',
      sinon.match.func,
    );
  });

  it('resolves when content is valid JSON', async () => {
    const fakeFileReader = createFakeFileReader('{ "foo": "bar" }');

    const content = await readJSONFile(file, fakeFileReader);

    assert.deepEqual(content, { foo: 'bar' });
    assert.calledWith(fakeFileReader.readAsText, file);
    assert.calledWith(
      fakeFileReader.addEventListener,
      'loadend',
      sinon.match.func,
    );
  });
});
