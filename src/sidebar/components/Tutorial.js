import { Icon, Link } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

import { isThirdPartyService } from '../helpers/is-third-party-service';
import { withServices } from '../service-context';

/**
 * Subcomponent: an "instruction" within the tutorial step that includes an
 * icon and a "command" associated with that icon. Encapsulating these together
 * allows for styling to keep them from having a line break between them.
 *
 * @param {object} props
 *   @param {string} props.commandName - Name of the "command" the instruction represents
 *   @param {string} props.iconName - Name of the icon to display
 */
function TutorialInstruction({ commandName, iconName }) {
  return (
    <span className="whitespace-nowrap">
      <Icon
        name={iconName}
        classes={classnames(
          'mx-1 -mt-1', // Give horizontal space; pull up top margin a little
          'text-color-text-light inline'
        )}
      />
      <em>{commandName}</em>
    </span>
  );
}

/**
 * Tutorial for using the sidebar app
 */
function Tutorial({ settings }) {
  const canCreatePrivateGroups = !isThirdPartyService(settings);
  return (
    <ol className="list-decimal pl-10 space-y-2">
      <li>
        To create an annotation, select text and then select the{' '}
        <TutorialInstruction iconName="annotate" commandName="Annotate" />{' '}
        button.
      </li>
      <li>
        To create a highlight (
        <Link
          classes="underline hover:underline"
          href="https://web.hypothes.is/help/why-are-highlights-private-by-default/"
          target="_blank"
        >
          visible only to you
        </Link>
        ), select text and then select the{' '}
        <TutorialInstruction iconName="highlight" commandName="Highlight" />{' '}
        button.
      </li>
      {canCreatePrivateGroups && (
        <li>
          To annotate in a private group, select the group from the groups
          dropdown. Don&apos;t see your group? Ask the group creator to send a{' '}
          <Link
            classes="underline hover:underline"
            href="https://web.hypothes.is/help/how-to-join-a-private-group/"
            target="_blank"
          >
            join link
          </Link>
          ).
        </li>
      )}
      <li>
        To reply to an annotation, select the{' '}
        <TutorialInstruction iconName="reply" commandName="Reply" /> button.
      </li>
    </ol>
  );
}

export default withServices(Tutorial, ['settings']);
