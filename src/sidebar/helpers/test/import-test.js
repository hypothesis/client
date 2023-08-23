import { readExportFile } from '../import';

function createFile(content, name = 'example.json') {
  if (typeof content === 'object') {
    content = JSON.stringify(content);
  }
  return new File([content], name);
}

describe('readExportFile', () => {
  it('throws error if file is not JSON', async () => {
    let error;
    try {
      await readExportFile(createFile('foo bar'));
    } catch (err) {
      error = err;
    }
    assert.instanceOf(error, Error);
    assert.equal(error.message, 'Not a valid JSON file');
  });

  [
    // Top-level is not an object
    [],
    123,
    // Missing `annotations` field
    {},
    // Invalid `annotations` field
    { annotations: 'not an array' },
  ].forEach(content => {
    it('throws error if validation fails', async () => {
      let error;
      try {
        await readExportFile(createFile(content));
      } catch (err) {
        error = err;
      }
      assert.instanceOf(error, Error);
      assert.equal(error.message, 'Not a valid Hypothesis JSON file');
    });
  });

  it('returns annotations from the file', async () => {
    const annotations = [{ id: 'abc' }, { id: 'def' }];
    const file = createFile({ annotations });

    const parsedAnnotations = await readExportFile(file);

    assert.deepEqual(parsedAnnotations, annotations);
  });
});
