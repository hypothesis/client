import {
  Card,
  CardContent,
  Checkbox,
  CheckIcon,
  Scroll,
  SpinnerSpokesIcon,
} from '@hypothesis/frontend-shared/lib/next';
import type { PresentationalProps } from '@hypothesis/frontend-shared/lib/types';
import classnames from 'classnames';
import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';

import { useSidebarStore } from '../store';

type ToastBadgeProps = PresentationalProps & {
  children: ComponentChildren;
  /**
   * Callback invoked when toast is "done" and is requesting to be
   * closed/removed
   */
  onClose?: () => void;
} & JSX.HTMLAttributes<HTMLDivElement>;

/**
 * Render a success "toast" badge.
 *
 * This uses an animation to pulse on render, then slowly fade out over several
 * seconds. After its animation is complete, any provided `onClose` will be
 * invoked.
 */
/* istanbul ignore next: Prototyped UI; add tests when solidified */
function ToastBadge({
  classes,
  children,
  onClose = () => {},
  ...htmlAttributes
}: ToastBadgeProps) {
  return (
    <div
      className={classnames(
        'flex items-center gap-x-1 py-1 px-2 rounded',
        'bg-green-success/10 animate-pulse-fade-out',
        classes
      )}
      onAnimationEnd={onClose}
      {...htmlAttributes}
    >
      <CheckIcon className="text-green-success w-em h-em p-[0.125em]" />
      <div className="text-sm">{children}</div>
    </div>
  );
}

/**
 * Prototype of a subset of user-preferences/-profile management.
 */
/* istanbul ignore next: Prototyped UI; add tests when solidified */
export default function ProfileView() {
  const store = useSidebarStore();
  /** Is there a "request in flight" (fake) to save the digest preference? */
  const [loading, setLoading] = useState(false);

  /**
   * Increment each time a save is completed, then reset to 0 to close (remove)
   * the success toast badge
   */
  const [saveCount, setSaveCount] = useState(0);

  useEffect(
    /**
     * Fake a 1s network request delay after checkbox is checked or unchecked.
     * This exercises the "loading" UI state for the checkbox.
     */
    () => {
      let savingTimeout: number;

      if (loading) {
        savingTimeout = setTimeout(() => {
          setLoading(false);
          // "Save was successful": increment the save count to ensure the
          // toast badge gets re-rendered
          setSaveCount(prevCount => prevCount + 1);
        }, 1000);
      }

      return () => {
        clearTimeout(savingTimeout);
      };
    },
    [loading]
  );

  if (!store.isFeatureEnabled('client_user_profile')) {
    return null;
  }

  // Render save-success message after each successful save, but do not render
  // it when a "request is in flight". This removal and re-adding across a
  // sequence of saves ensures that the browser sees the message as newly- added
  // to the accessiblity DOM and screen readers should announce it at the
  // appropriate times.
  const withSaveMessage = saveCount > 0 && !loading;

  return (
    <Card data-testid="profile-container">
      <div
        className={classnames(
          // Ensure there is enough height to clear both the heading text and the
          // success toast message without any danger of a jiggle
          'h-12',
          'px-3 border-b flex items-center'
        )}
      >
        <div className="grow">
          <h1 className="text-xl text-slate-7 font-normal">Notifications</h1>
        </div>
        <ul className="sr-only" aria-live="polite">
          {withSaveMessage && (
            <li key={saveCount}>Notification preferences saved</li>
          )}
        </ul>
        {saveCount > 0 && (
          <ToastBadge
            key={
              // The key is used here to ensure the `ToastBadge` re-renders and
              // thus restarts its animation each time a save completes.
              saveCount
            }
            onClose={() => setSaveCount(0)}
          >
            Saved
          </ToastBadge>
        )}
      </div>
      <Scroll>
        <CardContent size="lg">
          <Checkbox
            defaultChecked={true}
            disabled={loading}
            onChange={() => setLoading(true)}
            checkedIcon={loading ? SpinnerSpokesIcon : undefined}
            icon={loading ? SpinnerSpokesIcon : undefined}
          >
            Email me a daily summary of activity in my courses
          </Checkbox>
        </CardContent>
      </Scroll>
    </Card>
  );
}
