import { Popover } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';

import type { Mention } from '../../types/api';
import type { InvalidUsername } from '../helpers/mentions';
import { processAndReplaceMentionElements } from '../helpers/mentions';
import { replaceLinksWithEmbeds } from '../media-embedder';
import { renderMathAndMarkdown } from '../render-markdown';
import StyledText from './StyledText';
import MentionPopoverContent from './mentions/MentionPopoverContent';

export type MarkdownViewProps = {
  /** The string of markdown to display as HTML. */
  markdown: string;
  classes?: string;
  style?: Record<string, string>;
  mentions?: Mention[];

  /**
   * Whether the at-mentions feature ir enabled or not.
   * Defaults to false.
   */
  mentionsEnabled?: boolean;

  // Test seams
  setTimeout_?: typeof setTimeout;
  clearTimeout_?: typeof clearTimeout;
};

type PopoverContent = Mention | InvalidUsername | null;

/**
 * A component which renders markdown as HTML, replaces recognized links with
 * embedded video/audio and processes mention tags.
 */
export default function MarkdownView(props: MarkdownViewProps) {
  /* istanbul ignore next - Unpack here to ignore default values for test seams */
  const {
    markdown,
    classes,
    style,
    mentions = [],
    mentionsEnabled = false,
    setTimeout_ = setTimeout,
    clearTimeout_ = clearTimeout,
  } = props;
  const html = useMemo(
    () => (markdown ? renderMathAndMarkdown(markdown) : ''),
    [markdown],
  );
  const content = useRef<HTMLDivElement | null>(null);

  const mentionsPopoverAnchorRef = useRef<HTMLElement | null>(null);
  const elementToMentionMap = useRef(
    new Map<HTMLElement, Mention | InvalidUsername>(),
  );
  const [popoverContent, setPopoverContent] = useState<PopoverContent>(null);
  const popoverContentTimeout = useRef<ReturnType<typeof setTimeout> | null>();
  const setPopoverContentAfterDelay = useCallback(
    // This allows the content to be set with a small delay, so that popovers
    // don't flicker simply by hovering an annotation with mentions
    (content: PopoverContent) => {
      if (popoverContentTimeout.current) {
        clearTimeout_(popoverContentTimeout.current);
      }

      const setContent = () => {
        setPopoverContent(content);
        popoverContentTimeout.current = null;
      };

      // Set the content immediately when resetting, so that there's no delay
      // when hiding the popover, only when showing it
      if (content === null) {
        setContent();
      } else {
        popoverContentTimeout.current = setTimeout_(setContent, 400);
      }
    },
    [clearTimeout_, setTimeout_],
  );

  useEffect(() => {
    // Clear any potentially in-progress popover timeout when this component is
    // unmounted
    return () => {
      if (popoverContentTimeout.current) {
        clearTimeout_(popoverContentTimeout.current);
      }
    };
  }, [clearTimeout_]);

  useEffect(() => {
    replaceLinksWithEmbeds(content.current!, {
      // Make embeds the full width of the sidebar, unless the sidebar has been
      // made wider than the `md` breakpoint. In that case, restrict width
      // to 380px.
      className: 'w-full md:w-[380px]',
    });
  }, [markdown]);

  useEffect(() => {
    elementToMentionMap.current = processAndReplaceMentionElements(
      content.current!,
      mentions,
    );
  }, [mentions]);

  // NB: The following could be implemented by setting attribute props directly
  // on `StyledText` (which renders a `div` itself), versus introducing a child
  // `div` as is done here. However, in initial testing, this interfered with
  // some overflow calculations in the `Excerpt` element. This could be worth
  // a review in the future.
  return (
    <div className="w-full break-anywhere cursor-text">
      <StyledText
        classes={classnames({
          // A `relative` wrapper around the `Popover` component is needed for
          // when the native Popover API is not supported.
          relative: mentionsEnabled,
        })}
      >
        <div
          className={classes}
          data-testid="markdown-text"
          ref={content}
          dangerouslySetInnerHTML={{ __html: html }}
          style={style}
          onMouseEnterCapture={
            mentionsEnabled
              ? ({ target }) => {
                  const element = target as HTMLElement;
                  const mention = elementToMentionMap.current.get(element);

                  if (mention) {
                    setPopoverContentAfterDelay(mention);
                    mentionsPopoverAnchorRef.current = element;
                  }
                }
              : undefined
          }
          onMouseLeaveCapture={
            mentionsEnabled
              ? () => {
                  setPopoverContentAfterDelay(null);
                  mentionsPopoverAnchorRef.current = null;
                }
              : undefined
          }
        />
        {mentionsEnabled && (
          <Popover
            open={!!popoverContent}
            onClose={() => setPopoverContentAfterDelay(null)}
            anchorElementRef={mentionsPopoverAnchorRef}
            classes="px-3 py-2 !max-w-[75%]"
          >
            {popoverContent !== null && (
              <MentionPopoverContent content={popoverContent} />
            )}
          </Popover>
        )}
      </StyledText>
    </div>
  );
}
