import classnames from 'classnames';
import { createElement } from 'preact';
import { useEffect, useMemo, useRef } from 'preact/hooks';
import propTypes from 'prop-types';

import { replaceLinksWithEmbeds } from '../media-embedder';
import renderMarkdown from '../render-markdown';

/**
 * A component which renders markdown as HTML and replaces recognized links
 * with embedded video/audio.
 */
export default function MarkdownView({ markdown = '', textClass = {} }) {
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
