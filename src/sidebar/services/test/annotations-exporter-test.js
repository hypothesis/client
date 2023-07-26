import {
  newAnnotation,
  publicAnnotation,
} from '../../test/annotation-fixtures';
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
    const firstBaseAnnotation = publicAnnotation();
    const secondBaseAnnotation = publicAnnotation();
    const draftAnnotation = newAnnotation();
    const annotations = [
      {
        ...firstBaseAnnotation,
        $tag: '',
      },
      {
        ...secondBaseAnnotation,
        $highlight: true,
      },

      // These two annotations will be excluded from the export, as they don't
      // have an id, which means they have not been saved yet
      draftAnnotation,
      draftAnnotation,
    ];
    fakeStore.allAnnotations.returns(annotations);

    const { content, excludedAnnotations } = exporter.buildExportContent(now);

    assert.deepEqual(content, {
      export_date: now.toISOString(),
      export_userid: 'userId',
      client_version: '__VERSION__',
      annotations: [firstBaseAnnotation, secondBaseAnnotation],
    });
    assert.equal(excludedAnnotations, 2);
  });
});
