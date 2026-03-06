import { Button } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

import { withServices } from '../service-context';
import type { SessionService } from '../services/session';

/**
 * Banner shown when the assignment includes embedded YouTube videos (LMS config
 * `youtubeAssignment: true`). Informs the user about YouTube's data practices
 * and offers a "Dismiss" button to hide it permanently (persisted in profile).
 */
function YouTubeDisclaimerBanner({ session }: { session: SessionService }) {
  const handleDismiss = () => {
    session.dismissYoutubeDisclaimer();
  };

  return (
    <div
      className={classnames(
        'flex flex-col gap-3 p-4 bg-grey-1 border-b border-grey-3 text-color-text',
        'text-sm',
      )}
      data-testid="youtube-disclaimer-banner"
    >
      <p className="m-0">
        This activity includes embedded YouTube videos. Hypothesis does not
        control whether YouTube displays ads or collects limited technical data
        such as IP address or device information when videos are viewed. Your
        institution may choose to disable the YouTube integration at any time.
      </p>
      <div>
        <Button
          onClick={handleDismiss}
          variant="primary"
          data-testid="youtube-disclaimer-dismiss"
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}

export default withServices(YouTubeDisclaimerBanner, ['session']);
