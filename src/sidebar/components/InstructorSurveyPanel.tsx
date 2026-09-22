import { Button, CloseButton } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useCallback, useEffect, useId, useRef, useState } from 'preact/hooks';

import type { InstructorSurveyResponse } from '../../types/api';
import { withServices } from '../service-context';
import type { AnalyticsService } from '../services/analytics';
import type { SessionService } from '../services/session';
import { useSidebarStore } from '../store';

export type InstructorSurveyPanelProps = {
  // Injected
  analytics: AnalyticsService;
  session: SessionService;
};

/**
 * One-question survey asking whether the user teaches a course, shown at the
 * top of the sidebar to users H says are being asked (see the
 * `isInstructorSurveyPending` selector).
 *
 * All three answers -- yes, no, and the dismissal -- are recorded, and any of
 * them stops the survey being shown again. The panel disappears because the
 * answer lands in the profile, so there is no local "answered" state to keep.
 */
function InstructorSurveyPanel({
  analytics,
  session,
}: InstructorSurveyPanelProps) {
  const store = useSidebarStore();
  const headingId = useId();
  const container = useRef<HTMLElement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Both effects below wait for the sidebar to have been opened, because
  // mounting is not the same as being seen. The sidebar iframe is created when
  // the page loads and starts collapsed -- `visibility: hidden` -- so this
  // panel mounts as soon as the profile arrives whether or not anyone will ever
  // look at it. `hasSidebarOpened` is sticky, so each effect runs once, on the
  // first open. SidebarView uses it the same way to hold off connecting the
  // streamer.
  const sidebarHasOpened = store.hasSidebarOpened();

  // Record the impression when the panel is actually on screen. Tracking it at
  // mount would count every page load of a user who never opens the sidebar,
  // and the PRD wants to know who *saw* the survey.
  useEffect(() => {
    if (sidebarHasOpened) {
      analytics.trackEvent('client.survey.instructor_role.shown');
    }
  }, [analytics, sidebarHasOpened]);

  // Move focus to the panel, the way SidebarPanel does, so that keyboard and
  // screen reader users land on the question rather than having to find it.
  // Focusing at mount would be a no-op while the frame is hidden, and would
  // take focus away from whatever the reader was doing if it weren't.
  // Deliberately not a `role="dialog"`: that would imply the top bar is inert,
  // which it isn't.
  useEffect(() => {
    if (sidebarHasOpened) {
      container.current?.focus();
    }
  }, [sidebarHasOpened]);

  const submit = useCallback(
    async (response: InstructorSurveyResponse) => {
      setSubmitting(true);
      try {
        await session.submitInstructorSurveyResponse(response);
      } catch {
        // The session service has already shown a toast. The panel stays up so
        // the answer can be given a second time.
      }
      // Re-enable either way. On success the updated profile unmounts this
      // panel, so this is normally a no-op -- but if a response ever came back
      // still reporting the survey as pending, leaving `submitting` set would
      // strand the user with a banner whose dismiss button is disabled too.
      setSubmitting(false);
    },
    [session],
  );

  return (
    <section
      aria-labelledby={headingId}
      className={classnames(
        'relative flex flex-col gap-3 p-4 bg-grey-1 border-b border-grey-3',
        'text-color-text text-sm',
      )}
      data-testid="instructor-survey-panel"
      ref={container}
      tabIndex={-1}
    >
      <CloseButton
        classes="absolute top-1 right-1 text-grey-6 hover:text-grey-7"
        data-testid="instructor-survey-dismiss"
        disabled={submitting}
        onClick={() => submit('dismissed')}
        title="Dismiss survey"
      />
      <h2 className="m-0 text-base font-medium" id={headingId}>
        Are you a course instructor?
      </h2>
      <div className="flex flex-row gap-2">
        <Button
          data-testid="instructor-survey-yes"
          disabled={submitting}
          onClick={() => submit('instructor')}
          variant="primary"
        >
          Yes
        </Button>
        <Button
          data-testid="instructor-survey-no"
          disabled={submitting}
          onClick={() => submit('not_instructor')}
          variant="primary"
        >
          No
        </Button>
      </div>
    </section>
  );
}

export default withServices(InstructorSurveyPanel, ['analytics', 'session']);
