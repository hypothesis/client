import { useEffect, useMemo, useRef } from 'preact/hooks';

import { replaceLinksWithEmbeds } from '../media-embedder';
import { renderMathAndMarkdown } from '../render-markdown';

import StyledText from './StyledText';

/**
 * @typedef MarkdownViewProps
 * @prop {string} markdown - The string of markdown to display
 * @prop {string} [classes]
 * @prop {Record<string,string>} [style]

 */

/**
 * A component which renders markdown as HTML and replaces recognized links
 * with embedded video/audio.
 *
 * @param {MarkdownViewProps} props
 */
export default function MarkdownView({ markdown, classes, style }) {
  const html = useMemo(
    () => (markdown ? renderMathAndMarkdown(markdown) : ''),
    [markdown]
  );
  const content = /** @type {{ current: HTMLDivElement }} */ (useRef());

  useEffect(() => {
    replaceLinksWithEmbeds(content.current, {
      // Make embeds the full width of the sidebar, unless the sidebar has been
      // made wider than the `md` breakpoint. In that case, restrict width
      // to 380px.
      className: 'w-full md:w-[380px]',
    });
  }, [markdown]);

  // NB: The following could be implemented by setting attribute props directly
  // on `StyledText` (which renders a `div` itself), versus introducing a child
  // `div` as is done here. However, in initial testing, this interfered with
  // some overflow calculations in the `Excerpt` element. This could be worth
  // a review in the future.
  return (
    <div className="w-full break-words cursor-text">
      <StyledText>
        <div
          className={classes}
          data-testid="markdown-text"
          ref={content}
          dangerouslySetInnerHTML={{ __html: html }}
          style={style}
        />
      </StyledText>
    </div>
  );
}
