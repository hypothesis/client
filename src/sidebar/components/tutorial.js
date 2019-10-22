'use strict';

const { createElement } = require('preact');
const propTypes = require('prop-types');

const { withServices } = require('../util/service-context');
const isThirdPartyService = require('../util/is-third-party-service');

const SvgIcon = require('./svg-icon');

/**
 * Tutorial for using the sidebar app
 */
function Tutorial({ settings }) {
  const canCreatePrivateGroups = !isThirdPartyService(settings);
  return (
    <ol className="tutorial__list">
      <li className="tutorial__item">
        To create an annotation, select text and click the{' '}
        <span className="tutorial__instruction">
          <SvgIcon name="annotate" inline={true} className="tutorial__icon" />
          <em>Annotate</em>
        </span>{' '}
        button.
      </li>
      <li className="tutorial__item">
        To create a highlight (
        <a
          href="https://web.hypothes.is/help/why-are-highlights-private-by-default/"
          target="_blank"
          rel="noopener noreferrer"
        >
          visible only to you
        </a>
        ), select text and click the{' '}
        <span className="tutorial__instruction">
          <SvgIcon name="highlight" inline={true} className="tutorial__icon" />
          <em>Highlight</em>
        </span>{' '}
        button.
      </li>
      {canCreatePrivateGroups && (
        <li className="tutorial__item">
          To annotate in a private group, select the group from the groups
          dropdown. Don&apos;t see your group? Ask the group creator to send a{' '}
          <a
            href="https://web.hypothes.is/help/how-to-join-a-private-group/"
            target="_blank"
            rel="noopener noreferrer"
          >
            join link
          </a>
          ).
        </li>
      )}
      <li className="tutorial__item">
        To reply to an annotation, click the{' '}
        <span className="tutorial__instruction">
          <SvgIcon name="reply" inline={true} className="tutorial__icon" />{' '}
          <em>Reply</em>
        </span>{' '}
        button.
      </li>
    </ol>
  );
}

Tutorial.propTypes = {
  settings: propTypes.object.isRequired,
};

Tutorial.injectedProps = ['settings'];

module.exports = withServices(Tutorial);
