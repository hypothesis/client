const classnames = require('classnames');
const { createElement } = require('preact');
const { useEffect, useMemo, useRef } = require('preact/hooks');
const propTypes = require('prop-types');

const { replaceLinksWithEmbeds } = require('../media-embedder');
const renderMarkdown = require('../render-markdown');

/**
 * A component which renders markdown as HTML and replaces recognized links
 * with embedded video/audio.
 */
function MarkdownView({ markdown = '', textClass = {} }) {
  const html = useMemo(() => (markdown ? renderMarkdown(markdown) : ''), [
    markdown,
  ]);
  const content = useRef(null);

  useEffect(() => {
    replaceLinksWithEmbeds(content.current);
  }, [markdown]);

  return (
    <div
      className={classnames('markdown-view', textClass)}
      ref={content}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

MarkdownView.propTypes = {
  /** The string of markdown to display. */
  markdown: propTypes.string,

  /**
   * A CSS classname-to-boolean map of classes to apply to the container of
   * the rendered markdown.
   */
  textClass: propTypes.object,
};

module.exports = MarkdownView;
