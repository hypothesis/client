import { ListenerCollection, Popover } from '@hypothesis/frontend-shared';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import type { Mention } from '../../types/api';
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

function replaceMentionTags(
  element: HTMLElement,
  mentions: Mention[] = [],
): Array<[Mention, HTMLElement]> {
  const mentionLinks = element.querySelectorAll('a[data-hyp-mention]');
  const foundMentions: Array<[Mention, HTMLElement]> = [];

  for (const mentionLink of mentionLinks) {
    const htmlMentionLink = mentionLink as HTMLElement;
    const mentionUserId = htmlMentionLink.dataset.userid;
    const mention =
      mentionUserId && mentions.find(m => m.userid === mentionUserId);

    if (mention) {
      // If the mention exists in the list of mentions, render it as a link to
      // the user profile
      mentionLink.setAttribute('href', mention.link);
      mentionLink.setAttribute('target', '_blank');

      foundMentions.push([mention, htmlMentionLink]);
    } else {
      // If it doesn't, convert it to "plain text"
      const plainTextMention = document.createElement('span');
      plainTextMention.textContent = mentionLink.textContent;
      plainTextMention.style.fontStyle = 'italic';
      plainTextMention.style.borderBottom = 'dotted';
      mentionLink.parentElement?.replaceChild(plainTextMention, mentionLink);
    }
  }

  return foundMentions;
}

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
    const foundMentions = replaceMentionTags(content.current!, mentions);

    for (const [mention, element] of foundMentions) {
      listenerCollection.add(element, 'mouseenter', () => {
        setActiveMention(mention);
        mentionsPopoverAnchorRef.current = element;
      });
      listenerCollection.add(element, 'mouseleave', () => {
        setActiveMention(null);
        mentionsPopoverAnchorRef.current = null;
      });
    }

    return () => listenerCollection.removeAll();
  }, [html, mentions]);

  // NB: The following could be implemented by setting attribute props directly
  // on `StyledText` (which renders a `div` itself), versus introducing a child
  // `div` as is done here. However, in initial testing, this interfered with
  // some overflow calculations in the `Excerpt` element. This could be worth
  // a review in the future.
  return (
    <div className="w-full break-anywhere cursor-text">
      <StyledText classes="relative">
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
