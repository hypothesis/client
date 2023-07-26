import { publicAnnotation } from '../../test/annotation-fixtures';
import { AnnotationsExporter } from '../annotations-exporter';

describe('AnnotationsExporter', () => {
  let fakeStore;
  let exporter;

  beforeEach(() => {
    fakeStore = {
      profile: sinon.stub().returns({ userid: 'userId' }),
    };
    exporter = new AnnotationsExporter(fakeStore);
  });

  it('generates export content with provided annotations', () => {
    const now = new Date();
    const firstBaseAnnotation = publicAnnotation();
    const secondBaseAnnotation = publicAnnotation();
    const annotations = [
      {
        ...firstBaseAnnotation,
        $tag: '',
      },
      {
        ...secondBaseAnnotation,
        $highlight: true,
      },
    ];

    const result = exporter.buildExportContent(annotations, now);

    assert.deepEqual(result, {
      export_date: now.toISOString(),
      export_userid: 'userId',
      client_version: '__VERSION__',
      annotations: [firstBaseAnnotation, secondBaseAnnotation],
    });
  });
});
