import {
  newAnnotation,
  newReply,
  publicAnnotation,
} from '../../test/annotation-fixtures';
import { formatDateTime } from '../../util/time';
import { AnnotationsExporter } from '../annotations-exporter';

describe('AnnotationsExporter', () => {
  let now;
  let formattedNow;
  let baseAnnotation;
  let exporter;
  const groupName = 'My group';

  const pageSelector = page => ({
    type: 'PageSelector',
    label: `${page}`,
  });
  const quoteSelector = quote => ({
    type: 'TextQuoteSelector',
    exact: quote,
  });
  const targetWithSelectors = (...selectors) => [
    {
      selector: selectors,
    },
  ];

  beforeEach(() => {
    now = new Date();
    formattedNow = formatDateTime(now);
    baseAnnotation = {
      ...newAnnotation(),
      ...publicAnnotation(),
      created: now.toISOString(),
    };
    // Title should actually be an array
    baseAnnotation.document.title = [baseAnnotation.document.title];

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
    it('throws error when empty list of annotations is provided', () => {
      assert.throws(
        () => exporter.buildTextExportContent([]),
        'No annotations to export',
      );
    });

    it('generates text content with provided annotations', () => {
      const annotations = [
        {
          ...baseAnnotation,
          target: targetWithSelectors(quoteSelector('this is the quote')),
        },
        baseAnnotation,
        {
          ...baseAnnotation,
          user: 'acct:jane@localhost',
          tags: ['foo', 'bar'],
        },
        {
          ...baseAnnotation,
          ...newReply(),
          target: targetWithSelectors(pageSelector(23)),
        },
        {
          ...baseAnnotation,
          tags: [],
          target: targetWithSelectors(pageSelector('iii')),
        },
      ];

      const result = exporter.buildTextExportContent(annotations, {
        groupName,
        now,
      });

      assert.equal(
        result,
        `${formattedNow}
A special document
http://example.com
Group: ${groupName}
Total users: 2
Users: bill, jane
Total annotations: 5
Total replies: 1

Annotation 1:
${formattedNow}
Comment: Annotation text
bill
Quote: "this is the quote"
Tags: tag_1, tag_2

Annotation 2:
${formattedNow}
Comment: Annotation text
bill
Quote: "null"
Tags: tag_1, tag_2

Annotation 3:
${formattedNow}
Comment: Annotation text
jane
Quote: "null"
Tags: foo, bar

Annotation 4:
${formattedNow}
Comment: Annotation text
bill
Quote: "null"
Tags: tag_1, tag_2
Page: 23

Annotation 5:
${formattedNow}
Comment: Annotation text
bill
Quote: "null"
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

      const result = exporter.buildTextExportContent([annotation], {
        displayNamesEnabled: true,
        groupName,
        now,
      });

      assert.equal(
        result,
        `${formattedNow}
A special document
http://example.com
Group: ${groupName}
Total users: 1
Users: John Doe
Total annotations: 1
Total replies: 0

Annotation 1:
${formattedNow}
Comment: Annotation text
John Doe
Quote: "null"
Tags: tag_1, tag_2`,
      );
    });
  });

  describe('buildCSVExportContent', () => {
    it('throws error when empty list of annotations is provided', () => {
      assert.throws(
        () => exporter.buildCSVExportContent([]),
        'No annotations to export',
      );
    });

    it('generates CSV content with expected annotations', () => {
      const annotations = [
        {
          ...baseAnnotation,
          user: 'acct:jane@localhost',
          tags: ['foo', 'bar'],
        },
        {
          ...baseAnnotation,
          ...newReply(),
          target: targetWithSelectors(
            quoteSelector('includes "double quotes", and commas'),
            pageSelector(23),
          ),
        },
        {
          ...baseAnnotation,
          tags: [],
          target: targetWithSelectors(pageSelector('iii')),
        },
      ];

      const result = exporter.buildCSVExportContent(annotations, {
        groupName,
      });

      assert.equal(
        result,
        `Creation Date,URL,Group,Annotation/Reply Type,Quote,User,Body,Tags,Page
${formattedNow},http://example.com,My group,Annotation,,jane,Annotation text,"foo,bar",
${formattedNow},http://example.com,My group,Reply,"includes ""double quotes"", and commas",bill,Annotation text,"tag_1,tag_2",23
${formattedNow},http://example.com,My group,Annotation,,bill,Annotation text,,iii`,
      );
    });

    it('uses display names if `displayNamesEnabled` is set', () => {
      const annotation = {
        ...baseAnnotation,
        user_info: {
          display_name: 'John Doe',
        },
      };

      const result = exporter.buildCSVExportContent([annotation], {
        displayNamesEnabled: true,
        groupName,
      });

      assert.equal(
        result,
        `Creation Date,URL,Group,Annotation/Reply Type,Quote,User,Body,Tags,Page
${formattedNow},http://example.com,My group,Annotation,,John Doe,Annotation text,"tag_1,tag_2",`,
      );
    });
  });
});
