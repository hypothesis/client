'use strict';

const renderMarkdown = require('../render-markdown');

describe('render-markdown', function() {
  let render;

  beforeEach(function() {
    renderMarkdown.$imports.$mock({
      katex: {
        renderToString: function(input, opts) {
          if (opts && opts.displayMode) {
            return 'math+display:' + input;
          } else {
            return 'math:' + input;
          }
        },
      },
    });
    render = function(markdown) {
      return renderMarkdown(markdown);
    };
  });

  afterEach(() => {
    renderMarkdown.$imports.$restore();
  });

  describe('autolinking', function() {
    it('should autolink URLs', function() {
      assert.equal(
        render('See this link - http://arxiv.org/article'),
        '<p>See this link - <a href="http://arxiv.org/article" target="_blank">' +
          'http://arxiv.org/article</a></p>'
      );
    });

    it("should autolink URLs with _'s in them correctly", function() {
      assert.equal(
        render(
          'See this https://hypothes.is/stream?q=tag:group_test_needs_card'
        ),
        '<p>See this <a ' +
          'href="https://hypothes.is/stream?q=tag:group_test_needs_card" ' +
          'target="_blank">' +
          'https://hypothes.is/stream?q=tag:group_test_needs_card</a></p>'
      );
    });
  });

  describe('markdown rendering', function() {
    it('should render markdown', function() {
      assert.equal(
        render('one **two** three'),
        '<p>one <strong>two</strong> three</p>'
      );
    });

    it('should sanitize the result', function() {
      // Check that the rendered HTML is fed through the HTML sanitization
      // library. This is not an extensive test of sanitization behavior, that
      // is left to DOMPurify's tests.
      assert.equal(
        renderMarkdown('one **two** <script>alert("three")</script>'),
        '<p>one <strong>two</strong> </p>'
      );
    });

    it('should open links in a new window', () => {
      assert.equal(
        renderMarkdown('<a href="http://example.com">test</a>'),
        '<p><a href="http://example.com" target="_blank">test</a></p>'
      );
    });
  });

  describe('math blocks', function() {
    it('should render LaTeX blocks', function() {
      assert.equal(render('$$x*2$$'), '<p>math+display:x*2</p>');
    });

    it('should render mixed blocks', function() {
      assert.equal(
        render('one $$x*2$$ two $$x*3$$ three'),
        '<p>one </p>\n<p>math+display:x*2</p>\n' +
          '<p>two </p>\n<p>math+display:x*3</p>\n<p>three</p>'
      );
    });

    it('should not sanitize math renderer output', function() {
      // Check that KaTeX's rendered output is not corrupted in any way by
      // sanitization.
      const html = render('$$ <unknown-tag>foo</unknown-tag> $$');
      assert.include(html, '<unknown-tag>foo</unknown-tag>');
    });

    it('should render mixed inline and block math', function() {
      assert.equal(
        render('one \\(x*2\\) three $$x*3$$'),
        '<p>one math:x*2 three </p>\n<p>math+display:x*3</p>'
      );
    });
  });

  describe('inline math', function() {
    it('should render inline LaTeX', function() {
      assert.equal(render('\\(x*2\\)'), '<p>math:x*2</p>');
    });

    it('should render mixed inline LaTeX blocks', function() {
      assert.equal(
        render('one \\(x+2\\) two \\(x+3\\) four'),
        '<p>one math:x+2 two math:x+3 four</p>'
      );
    });
  });
});
