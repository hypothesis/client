import {
  Link,
  AnnotateIcon,
  HighlightIcon,
  ReplyIcon,
} from '@hypothesis/frontend-shared/lib/next';
import classnames from 'classnames';

import { isThirdPartyService } from '../helpers/is-third-party-service';
import { withServices } from '../service-context';

/**
 * @typedef {import('@hypothesis/frontend-shared/lib/types').IconComponent} IconComponent
 */

/**
 * Subcomponent: an "instruction" within the tutorial step that includes an
 * icon and a "command" associated with that icon. Encapsulating these together
 * allows for styling to keep them from having a line break between them.
 *
 * @param {object} props
 *   @param {string} props.commandName - Name of the "command" the instruction represents
 *   @param {IconComponent} props.icon icon to display
 */
function TutorialInstruction({ commandName, icon: Icon }) {
  return (
    <span className="whitespace-nowrap" data-testid="instruction">
      <Icon
        className={classnames(
          'w-em h-em',
          'mx-1 -mt-1', // Give horizontal space; pull up top margin a little
          'text-color-text-light inline'
        )}
      />
      <em data-testid="command-name">{commandName}</em>
    </span>
  );
}

/**
 * Tutorial for using the sidebar app
 *
 * @param {object} props
 *   @param {import('../../types/config').SidebarSettings} props.settings
 */
function Tutorial({ settings }) {
  const canCreatePrivateGroups = !isThirdPartyService(settings);
  return (
    <ol className="list-decimal pl-10 space-y-2">
      <li>
        To create an annotation, select text and then select the{' '}
        <TutorialInstruction icon={AnnotateIcon} commandName="Annotate" />{' '}
        button.
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
        <TutorialInstruction icon={HighlightIcon} commandName="Highlight" />{' '}
        button.
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
          ).
        </li>
      )}
      <li>
        To reply to an annotation, select the{' '}
        <TutorialInstruction icon={ReplyIcon} commandName="Reply" /> button.
      </li>
    </ol>
  );
}

export default withServices(Tutorial, ['settings']);
