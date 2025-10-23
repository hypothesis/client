import {
  newAnnotation,
  newHighlight,
  newReply,
  publicAnnotation,
} from '../../test/annotation-fixtures';
import { formatSortableDateTime } from '../../util/time';
import { AnnotationsExporter } from '../annotations-exporter';

describe('AnnotationsExporter', () => {
  let now;
  let formattedNow;
  let baseAnnotation;
  let exporter;
  const groupName = 'My group';

  const shapeSelector = {
    type: 'ShapeSelector',
    shape: {
      type: 'point',
      x: 0,
      y: 1,
    },
  };
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
    formattedNow = formatSortableDateTime(now);
    baseAnnotation = {
      ...newAnnotation(),
      ...publicAnnotation(),
      created: now.toISOString(),
    };
    // Title should actually be an array
    baseAnnotation.document.title = [baseAnnotation.document.title];

    exporter = new AnnotationsExporter({});
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
          target: targetWithSelectors(quoteSelector('The quote')),
        },
        {
          ...baseAnnotation,
          target: [
            {
              description: 'An image',
              selector: [shapeSelector],
            },
          ],
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
Total annotations: 6
Total replies: 1

Annotation 1:
Created at: ${formattedNow}
Author: bill
Type: Annotation
Quote: "this is the quote"
Comment: Annotation text
Tags: tag_1, tag_2

Annotation 2:
Created at: ${formattedNow}
Author: bill
Type: Annotation
Comment: Annotation text
Tags: tag_1, tag_2

Annotation 3:
Created at: ${formattedNow}
Author: jane
Type: Annotation
Quote: "The quote"
Comment: Annotation text
Tags: foo, bar

Annotation 4:
Created at: ${formattedNow}
Author: bill
Type: Annotation
Description: An image
Comment: Annotation text
Tags: tag_1, tag_2

Annotation 5:
Created at: ${formattedNow}
Author: bill
Page: 23
Type: Reply
Comment: Annotation text
Tags: tag_1, tag_2

Annotation 6:
Created at: ${formattedNow}
Author: bill
Page: iii
Type: Annotation
Comment: Annotation text`,
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
Created at: ${formattedNow}
Author: John Doe
Type: Annotation
Comment: Annotation text
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

    [
      {
        separator: ',',
        buildExpectedContent:
          date => `Created at,Author,Page,URL,Group,Type,Quote/description,Comment,Tags
${date},jane,,http://example.com,My group,Annotation,includes \t tabs,Annotation text,"foo,bar"
${date},bill,23,http://example.com,My group,Reply,"includes ""double quotes"", and commas",Annotation text,"tag_1,tag_2"
${date},bill,iii,http://example.com,My group,Highlight,,Annotation text,
${date},bill,,http://example.com,My group,Annotation,an image,Annotation text,`,
      },
      {
        separator: '\t',
        buildExpectedContent:
          date => `Created at\tAuthor\tPage\tURL\tGroup\tType\tQuote/description\tComment\tTags
${date}\tjane\t\thttp://example.com\tMy group\tAnnotation\t"includes \t tabs"\tAnnotation text\tfoo,bar
${date}\tbill\t23\thttp://example.com\tMy group\tReply\t"includes ""double quotes"", and commas"\tAnnotation text\ttag_1,tag_2
${date}\tbill\tiii\thttp://example.com\tMy group\tHighlight\t\tAnnotation text\t
${date}\tbill\t\thttp://example.com\tMy group\tAnnotation\tan image\tAnnotation text\t`,
      },
    ].forEach(({ separator, buildExpectedContent }) => {
      it('generates CSV content with expected annotations and separator', () => {
        const annotations = [
          {
            ...baseAnnotation,
            user: 'acct:jane@localhost',
            tags: ['foo', 'bar'],
            target: targetWithSelectors(quoteSelector('includes \t tabs')),
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
            ...newHighlight(),
            tags: [],
            target: targetWithSelectors(pageSelector('iii')),
          },
          {
            ...baseAnnotation,
            tags: [],
            target: [
              {
                description: 'an image',
                selector: [shapeSelector],
              },
            ],
          },
        ];

        const result = exporter.buildCSVExportContent(annotations, {
          groupName,
          now,
          separator,
        });

        assert.equal(result, buildExpectedContent(formattedNow));
      });
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
        now,
      });

      assert.equal(
        result,
        `Created at,Author,Page,URL,Group,Type,Quote/description,Comment,Tags
${formattedNow},John Doe,,http://example.com,My group,Annotation,,Annotation text,"tag_1,tag_2"`,
      );
    });
  });

  describe('buildHTMLExportContent', () => {
    it('throws error when empty list of annotations is provided', () => {
      assert.throws(
        () => exporter.buildHTMLExportContent([]),
        'No annotations to export',
      );
    });

    it('generates HTML content with expected annotations', () => {
      const isoDate = now.toISOString();
      const annotations = [
        {
          ...baseAnnotation,
          text: `This includes markdown

1. First item
2. Second item

**bold text** and [a link](https://example.com)`,
          user: 'acct:jane@localhost',
          tags: ['foo', 'bar'],
          target: targetWithSelectors(quoteSelector('The quote')),
        },
        {
          ...baseAnnotation,
          target: targetWithSelectors(
            quoteSelector('includes <p>HTML</p> tags'),
            pageSelector(23),
          ),
        },
        {
          ...baseAnnotation,
          ...newReply(),
          tags: [],
          target: targetWithSelectors(pageSelector('iii')),
        },
        {
          ...baseAnnotation,
          tags: [],
          target: [
            {
              description: 'an image',
              selector: [shapeSelector],
            },
          ],
        },
      ];

      const result = exporter.buildHTMLExportContent(annotations, {
        groupName,
        now,
      });

      assert.equal(
        result,
        `<html lang="en">
  <head>
    <title>
      Annotations on &quot;A special document&quot;
    </title>
    <meta charset="UTF-8" />
  </head>
  <body>
    <section>
      <h1>Summary</h1>
      <p>
        <time datetime="${isoDate}">${formattedNow}</time>
      </p>
      <p>
        <strong>A special document</strong>
      </p>
      <p>
        <a
          href="http://example.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          http://example.com
        </a>
      </p>
      <table>
        <tbody style="vertical-align:top;">
          <tr>
            <td>Group:</td>
            <td>My group</td>
          </tr>
          <tr>
            <td>Total users:</td>
            <td>2</td>
          </tr>
          <tr>
            <td>Users:</td>
            <td>jane, bill</td>
          </tr>
          <tr>
            <td>Total annotations:</td>
            <td>4</td>
          </tr>
          <tr>
            <td>Total replies:</td>
            <td>1</td>
          </tr>
        </tbody>
      </table>
    </section>
    <hr />
    <section>
      <h1>Annotations</h1>
      <article>
        <h2>Annotation 1:</h2>
        <table>
          <tbody style="vertical-align:top;">
            <tr>
              <td>Created at:</td>
              <td>
                <time datetime="${isoDate}">${formattedNow}</time>
              </td>
            </tr>
            <tr>
              <td>Author:</td>
              <td>jane</td>
            </tr>
            <tr>
              <td>Type:</td>
              <td>Annotation</td>
            </tr>
            <tr>
              <td>Quote:</td>
              <td>
                <blockquote style="margin:0px;">The quote</blockquote>
              </td>
            </tr>
            <tr>
              <td>Comment:</td>
              <td>
                <p>This includes markdown</p>
                <ol>
                <li>First item</li>
                <li>Second item</li>
                </ol>
                <p><strong>bold text</strong> and <a href="https://example.com" target="_blank">a link</a></p>
              </td>
            </tr>
            <tr>
              <td>Tags:</td>
              <td>foo, bar</td>
            </tr>
          </tbody>
        </table>
      </article>
      <article>
        <h2>Annotation 2:</h2>
        <table>
          <tbody style="vertical-align:top;">
            <tr>
              <td>Created at:</td>
              <td>
                <time datetime="${isoDate}">${formattedNow}</time>
              </td>
            </tr>
            <tr>
              <td>Author:</td>
              <td>bill</td>
            </tr>
            <tr>
              <td>Page:</td>
              <td>23</td>
            </tr>
            <tr>
              <td>Type:</td>
              <td>Annotation</td>
            </tr>
            <tr>
              <td>Quote:</td>
              <td>
                <blockquote style="margin:0px;">includes &lt;p>HTML&lt;/p> tags</blockquote>
              </td>
            </tr>
            <tr>
              <td>Comment:</td>
              <td>Annotation text</td>
            </tr>
            <tr>
              <td>Tags:</td>
              <td>tag_1, tag_2</td>
            </tr>
          </tbody>
        </table>
      </article>
      <article>
        <h2>Annotation 3:</h2>
        <table>
          <tbody style="vertical-align:top;">
            <tr>
              <td>Created at:</td>
              <td>
                <time datetime="${isoDate}">${formattedNow}</time>
              </td>
            </tr>
            <tr>
              <td>Author:</td>
              <td>bill</td>
            </tr>
            <tr>
              <td>Page:</td>
              <td>iii</td>
            </tr>
            <tr>
              <td>Type:</td>
              <td>Reply</td>
            </tr>
            <tr>
              <td>Comment:</td>
              <td>Annotation text</td>
            </tr>
          </tbody>
        </table>
      </article>
      <article>
        <h2>Annotation 4:</h2>
        <table>
          <tbody style="vertical-align:top;">
            <tr>
              <td>Created at:</td>
              <td>
                <time datetime="${isoDate}">${formattedNow}</time>
              </td>
            </tr>
            <tr>
              <td>Author:</td>
              <td>bill</td>
            </tr>
            <tr>
              <td>Type:</td>
              <td>Annotation</td>
            </tr>
            <tr>
              <td>Description:</td>
              <td>an image</td>
            </tr>
            <tr>
              <td>Comment:</td>
              <td>Annotation text</td>
            </tr>
          </tbody>
        </table>
      </article>
    </section>
  </body>
</html>`,
      );
    });
  });
});
