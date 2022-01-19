import classnames from 'classnames';
import { useEffect, useMemo, useRef } from 'preact/hooks';

import { replaceLinksWithEmbeds } from '../media-embedder';
import renderMarkdown from '../render-markdown';
import { servedFromLocalFile } from '../util/url';

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
    () => (markdown ? renderMarkdown(markdown) : ''),
    [markdown]
  );
  const content = /** @type {{ current: HTMLDivElement }} */ (useRef());

  useEffect(() => {
    replaceLinksWithEmbeds(content.current, {
      className: 'MarkdownView__embed',
      wrapEmbedURL: url => {
        if (!servedFromLocalFile()) {
          // No workarounds are required in the embedded client.
          return url;
        }

        // In the browser extension, wrap YouTube media embeds to work around
        // an issue where certain videos fail to load unless a `Referer` header
        // is sent. See https://github.com/hypothesis/product-backlog/issues/1297.
        const embedURL = new URL(url);
        if (embedURL.origin === 'https://www.youtube.com') {
          const wrapperURL = new URL(
            'https://cdn.hypothes.is/media-embed.html'
          );
          wrapperURL.searchParams.append('url', url);
          return wrapperURL.toString();
        } else {
          return url;
        }
      },
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
