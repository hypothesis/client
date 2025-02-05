import { ListenerCollection, Popover } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import type { Mention } from '../../types/api';
import { renderMentionTags } from '../helpers/mentions';
import { replaceLinksWithEmbeds } from '../media-embedder';
import { renderMathAndMarkdown } from '../render-markdown';
import StyledText from './StyledText';

export type MarkdownViewProps = {
  /** The string of markdown to display as HTML. */
  markdown: string;
  classes?: string;
  style?: Record<string, string>;
  mentions?: Mention[];
};

/**
 * A component which renders markdown as HTML and replaces recognized links
 * with embedded video/audio.
 */
export default function MarkdownView({
  markdown,
  classes,
  style,
  mentions,
}: MarkdownViewProps) {
  const html = useMemo(
    () => (markdown ? renderMathAndMarkdown(markdown) : ''),
    [markdown],
  );
  const content = useRef<HTMLDivElement | null>(null);

  const hasMentions = !!mentions?.length;
  const [activeMention, setActiveMention] = useState<Mention | null>(null);
  const mentionsPopoverAnchorRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    replaceLinksWithEmbeds(content.current!, {
      // Make embeds the full width of the sidebar, unless the sidebar has been
      // made wider than the `md` breakpoint. In that case, restrict width
      // to 380px.
      className: 'w-full md:w-[380px]',
    });
  }, [markdown]);

  useEffect(() => {
    const listenerCollection = new ListenerCollection();
    const foundMentions = renderMentionTags(content.current!, mentions);

    listenerCollection.add(
      content.current!,
      'mouseenter',
      ({ target }) => {
        const element = target as HTMLElement;
        const mention = foundMentions.get(element) ?? null;

        if (mention) {
          setActiveMention(mention);
          mentionsPopoverAnchorRef.current = element;
        }
      },
      { capture: true },
    );
    listenerCollection.add(
      content.current!,
      'mouseleave',
      () => {
        setActiveMention(null);
        mentionsPopoverAnchorRef.current = null;
      },
      { capture: true },
    );

    return () => listenerCollection.removeAll();
  }, [html, mentions]);

  // NB: The following could be implemented by setting attribute props directly
  // on `StyledText` (which renders a `div` itself), versus introducing a child
  // `div` as is done here. However, in initial testing, this interfered with
  // some overflow calculations in the `Excerpt` element. This could be worth
  // a review in the future.
  return (
    <div className="w-full break-anywhere cursor-text">
      <StyledText
        classes={classnames(
          // A `relative` wrapper around the `Popover` component is needed for
          // when the native Popover API is not supported.
          'relative',
        )}
      >
        <div
          className={classes}
          data-testid="markdown-text"
          ref={content}
          dangerouslySetInnerHTML={{ __html: html }}
          style={style}
        />
        {hasMentions && (
          <Popover
            open={!!activeMention}
            onClose={() => setActiveMention(null)}
            anchorElementRef={mentionsPopoverAnchorRef}
            classes="p-2"
          >
            {activeMention?.display_name ?? activeMention?.username}
          </Popover>
        )}
      </StyledText>
    </div>
  );
}
