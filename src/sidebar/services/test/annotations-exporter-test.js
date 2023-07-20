import { AnnotationsExporter } from '../annotations-exporter';

describe('AnnotationsExporter', () => {
  let fakeStore;
  let exporter;

  beforeEach(() => {
    fakeStore = {
      profile: sinon.stub().returns({ userid: 'userId' }),
      allAnnotations: sinon.stub(),
    };
    exporter = new AnnotationsExporter(fakeStore);
  });

  it('generates export content with provided annotations', () => {
    const now = new Date();
    const annotations = [{}, {}];
    fakeStore.allAnnotations.returns(annotations);

    const result = exporter.buildExportContent(now);

    assert.deepEqual(result, {
      export_date: now.toISOString(),
      export_userid: 'userId',
      client_version: '__VERSION__',
      annotations,
    });
  });
});
