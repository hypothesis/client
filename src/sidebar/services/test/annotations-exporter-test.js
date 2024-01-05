import {
  newAnnotation,
  newReply,
  publicAnnotation,
} from '../../test/annotation-fixtures';
import { AnnotationsExporter } from '../annotations-exporter';

describe('AnnotationsExporter', () => {
  let now;
  let exporter;

  beforeEach(() => {
    now = new Date();
    exporter = new AnnotationsExporter();
  });

  describe('buildJSONExportContent', () => {
    it('generates JSON content with provided annotations', () => {
      const profile = { userid: 'userId' };
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

      const result = exporter.buildJSONExportContent(annotations, {
        now,
        profile,
      });

      assert.deepEqual(result, {
        export_date: now.toISOString(),
        export_userid: 'userId',
        client_version: '__VERSION__',
        annotations: [firstBaseAnnotation, secondBaseAnnotation],
      });
    });
  });

  describe('buildTextExportContent', () => {
    let baseAnnotation;

    beforeEach(() => {
      baseAnnotation = {
        ...newAnnotation(),
        ...publicAnnotation(),
        created: now.toISOString(),
      };
      // Title should actually be an array
      baseAnnotation.document.title = [baseAnnotation.document.title];
    });

    it('throws error when empty list of annotations is provided', () => {
      assert.throws(
        () => exporter.buildTextExportContent([]),
        'No annotations to export',
      );
    });

    it('generates text content with provided annotations', () => {
      const isoDate = baseAnnotation.created;
      const targetWithPageSelector = page => [
        {
          selector: [
            {
              type: 'PageSelector',
              label: `${page}`,
            },
          ],
        },
      ];
      const annotations = [
        baseAnnotation,
        baseAnnotation,
        {
          ...baseAnnotation,
          user: 'acct:jane@localhost',
          tags: ['foo', 'bar'],
        },
        {
          ...baseAnnotation,
          ...newReply(),
          target: targetWithPageSelector(23),
        },
        {
          ...baseAnnotation,
          tags: [],
          target: targetWithPageSelector('iii'),
        },
      ];
      const groupName = 'My group';

      const result = exporter.buildTextExportContent(annotations, {
        groupName,
        now,
      });

      assert.equal(
        result,
        `${isoDate}
A special document
http://example.com
Group: ${groupName}
Total users: 2
Users: bill, jane
Total annotations: 5
Total replies: 1

Annotation 1:
${isoDate}
Annotation text
bill
"null"
Tags: tag_1, tag_2

Annotation 2:
${isoDate}
Annotation text
bill
"null"
Tags: tag_1, tag_2

Annotation 3:
${isoDate}
Annotation text
jane
"null"
Tags: foo, bar

Annotation 4:
${isoDate}
Annotation text
bill
"null"
Tags: tag_1, tag_2
Page: 23

Annotation 5:
${isoDate}
Annotation text
bill
"null"
Page: iii`,
      );
    });

    it('uses display names if `displayNamesEnabled` is set', () => {
      const annotation = {
        ...baseAnnotation,
        user_info: {
          display_name: 'John Doe',
        },
      };
      const isoDate = annotation.created;
      const groupName = 'My group';

      const result = exporter.buildTextExportContent([annotation], {
        displayNamesEnabled: true,
        groupName,
        now,
      });
      assert.equal(
        result,
        `${isoDate}
A special document
http://example.com
Group: ${groupName}
Total users: 1
Users: John Doe
Total annotations: 1
Total replies: 0

Annotation 1:
${isoDate}
Annotation text
John Doe
"null"
Tags: tag_1, tag_2`,
      );
    });
  });
});
