import classnames from 'classnames';
import { useEffect, useMemo, useRef } from 'preact/hooks';

import { replaceLinksWithEmbeds } from '../media-embedder';
import { renderMathAndMarkdown } from '../render-markdown';

/**
 * @typedef MarkdownViewProps
 * @prop {string} markdown - The string of markdown to display
 * @prop {Record<string,string>} [textStyle] -
 *   Additional CSS properties to apply to the rendered markdown
 * @prop {Record<string,boolean>} [textClass] -
 *   Map of classes to apply to the container of the rendered markdown
 */

/**
 * A component which renders markdown as HTML and replaces recognized links
 * with embedded video/audio.
 *
 * @param {MarkdownViewProps} props
 */
export default function MarkdownView({
  markdown = '',
  textClass = {},
  textStyle = {},
}) {
  const html = useMemo(
    () => (markdown ? renderMathAndMarkdown(markdown) : ''),
    [markdown]
  );
  const content = /** @type {{ current: HTMLDivElement }} */ (useRef());

  useEffect(() => {
    replaceLinksWithEmbeds(content.current, {
      className: 'MarkdownView__embed',
    });
  }, [markdown]);

  // Use a blank string to indicate that the content language is unknown and may be
  // different than the client UI. The user agent may pick a default or analyze
  // the content to guess.
  const contentLanguage = '';

  return (
    <div
      className={classnames('MarkdownView', textClass)}
      dir="auto"
      lang={contentLanguage}
      ref={content}
      dangerouslySetInnerHTML={{ __html: html }}
      style={textStyle}
    />
  );
}
