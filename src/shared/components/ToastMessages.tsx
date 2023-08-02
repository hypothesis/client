import type { TransitionComponent } from '@hypothesis/frontend-shared';
import { Callout } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import type {
  ComponentChildren,
  ComponentProps,
  FunctionComponent,
} from 'preact';
import { useCallback, useMemo, useRef, useState } from 'preact/hooks';

export type ToastMessage = {
  id: string;
  type: 'error' | 'success' | 'notice';
  message: ComponentChildren;

  /**
   * Visually hidden messages are announced to screen readers but not visible.
   * Defaults to false.
   */
  visuallyHidden?: boolean;

  /**
   * Determines if the toast message should be auto-dismissed.
   * Defaults to true.
   */
  autoDismiss?: boolean;
};

export type ToastMessageTransitionClasses = {
  /** Classes to apply to a toast message when appended. Defaults to 'animate-fade-in' */
  transitionIn?: string;
  /** Classes to apply to a toast message being dismissed. Defaults to 'animate-fade-out' */
  transitionOut?: string;
};

type ToastMessageItemProps = {
  message: ToastMessage;
  onDismiss: (id: string) => void;
};

/**
 * An individual toast message: a brief and transient success or error message.
 * The message may be dismissed by clicking on it. `visuallyHidden` toast
 * messages will not be visible but are still available to screen readers.
 */
function ToastMessageItem({ message, onDismiss }: ToastMessageItemProps) {
  // Capitalize the message type for prepending; Don't prepend a message
  // type for "notice" messages
  const prefix =
    message.type !== 'notice'
      ? `${message.type.charAt(0).toUpperCase() + message.type.slice(1)}: `
      : '';

  return (
    <Callout
      classes={classnames({
        'sr-only': message.visuallyHidden,
      })}
      status={message.type}
      onClick={() => onDismiss(message.id)}
      variant="raised"
    >
      <strong>{prefix}</strong>
      {message.message}
    </Callout>
  );
}

type BaseToastMessageTransitionType = FunctionComponent<
  ComponentProps<TransitionComponent> & {
    transitionClasses?: ToastMessageTransitionClasses;
  }
>;

const BaseToastMessageTransition: BaseToastMessageTransitionType = ({
  direction,
  onTransitionEnd,
  children,
  transitionClasses = {},
}) => {
  const isDismissed = direction === 'out';
  const containerRef = useRef<HTMLDivElement>(null);
  const handleAnimation = (e: AnimationEvent) => {
    // Ignore animations happening on child elements
    if (e.target !== containerRef.current) {
      return;
    }

    onTransitionEnd?.(direction ?? 'in');
  };
  const classes = useMemo(() => {
    const {
      transitionIn = 'animate-fade-in',
      transitionOut = 'animate-fade-out',
    } = transitionClasses;

    return {
      [transitionIn]: !isDismissed,
      [transitionOut]: isDismissed,
    };
  }, [isDismissed, transitionClasses]);

  return (
    <div
      data-testid="animation-container"
      onAnimationEnd={handleAnimation}
      ref={containerRef}
      className={classnames('relative w-full container', classes)}
    >
      {children}
    </div>
  );
};

export type ToastMessagesProps = {
  messages: ToastMessage[];
  onMessageDismiss: (id: string) => void;
  transitionClasses?: ToastMessageTransitionClasses;
  setTimeout_?: typeof setTimeout;
};

/**
 * A collection of toast messages. These are rendered within an `aria-live`
 * region for accessibility with screen readers.
 */
export default function ToastMessages({
  messages,
  onMessageDismiss,
  transitionClasses,
  /* istanbul ignore next - test seam */
  setTimeout_ = setTimeout,
}: ToastMessagesProps) {
  const [dismissedMessages, setDismissedMessages] = useState<string[]>([]);
  const scheduledMessages = useRef(new Set<string>());

  const dismissMessage = useCallback(
    (id: string) => setDismissedMessages(ids => [...ids, id]),
    [],
  );
  const scheduleMessageDismiss = useCallback(
    (id: string) => {
      if (scheduledMessages.current.has(id)) {
        return;
      }

      // Track that this message has been scheduled to be dismissed. After a
      // period of time, actually dismiss it
      scheduledMessages.current.add(id);
      setTimeout_(() => {
        dismissMessage(id);
        scheduledMessages.current.delete(id);
      }, 5000);
    },
    [dismissMessage, setTimeout_],
  );

  const onTransitionEnd = useCallback(
    (direction: 'in' | 'out', message: ToastMessage) => {
      const autoDismiss = message.autoDismiss ?? true;
      if (direction === 'in' && autoDismiss) {
        scheduleMessageDismiss(message.id);
      }

      if (direction === 'out') {
        onMessageDismiss(message.id);
        setDismissedMessages(ids => ids.filter(id => id !== message.id));
      }
    },
    [scheduleMessageDismiss, onMessageDismiss],
  );

  return (
    <ul
      aria-live="polite"
      aria-relevant="additions"
      className="w-full space-y-2"
    >
      {messages.map(message => {
        const isDismissed = dismissedMessages.includes(message.id);
        return (
          <li
            className={classnames({
              // Add a bottom margin to visible messages only. Typically, we'd
              // use a `space-y-2` class on the parent to space children.
              // Doing that here could cause an undesired top margin on
              // the first visible message in a list that contains (only)
              // visually-hidden messages before it.
              // See https://tailwindcss.com/docs/space#limitations
              'mb-2': !message.visuallyHidden,
            })}
            key={message.id}
          >
            <BaseToastMessageTransition
              direction={isDismissed ? 'out' : 'in'}
              onTransitionEnd={direction => onTransitionEnd(direction, message)}
              transitionClasses={transitionClasses}
            >
              <ToastMessageItem message={message} onDismiss={dismissMessage} />
            </BaseToastMessageTransition>
          </li>
        );
      })}
    </ul>
  );
}
