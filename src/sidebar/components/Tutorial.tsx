import {
  Link,
  AnnotateIcon,
  HighlightIcon,
  ReplyIcon,
} from '@hypothesis/frontend-shared';
import type { IconComponent } from '@hypothesis/frontend-shared/lib/types';
import classnames from 'classnames';

import type { SidebarSettings } from '../../types/config';
import { isThirdPartyService } from '../helpers/is-third-party-service';
import { withServices } from '../service-context';

type LabeledIconProps = {
  /** Name of the "command" the instruction represents */
  commandName: string;
  icon: IconComponent;
};

function LabeledIcon({ commandName, icon: Icon }: LabeledIconProps) {
  return (
    <span className="whitespace-nowrap" data-testid="instruction">
      <Icon
        className={classnames(
          'w-em h-em',
          'mx-1 -mt-1', // Give horizontal space; pull up top margin a little
          'text-color-text-light inline',
        )}
      />
      <em data-testid="command-name">{commandName}</em>
    </span>
  );
}

export type TutorialProps = {
  // injected
  settings: SidebarSettings;
};

/**
 * Tutorial for using the sidebar app
 */
function Tutorial({ settings }: TutorialProps) {
  const canCreatePrivateGroups = !isThirdPartyService(settings);
  return (
    <ol className="list-decimal pl-10 space-y-2">
      <li>
        To create an annotation, select text and then select the{' '}
        <LabeledIcon icon={AnnotateIcon} commandName="Annotate" /> button.
      </li>
      <li>
        To create a highlight (
        <Link
          href="https://web.hypothes.is/help/why-are-highlights-private-by-default/"
          target="_blank"
          underline="always"
        >
          visible only to you
        </Link>
        ), select text and then select the{' '}
        <LabeledIcon icon={HighlightIcon} commandName="Highlight" /> button.
      </li>
      {canCreatePrivateGroups && (
        <li>
          To annotate in a private group, select the group from the groups
          dropdown. Don&apos;t see your group? Ask the group creator to send a{' '}
          <Link
            href="https://web.hypothes.is/help/how-to-join-a-private-group/"
            target="_blank"
            underline="always"
          >
            join link
          </Link>
          .
        </li>
      )}
      <li>
        To reply to an annotation, select the{' '}
        <LabeledIcon icon={ReplyIcon} commandName="Reply" /> button.
      </li>
    </ol>
  );
}

export default withServices(Tutorial, ['settings']);
