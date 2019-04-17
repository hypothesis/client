'use strict';

const classnames = require('classnames');
const { Fragment, createElement } = require('preact');
const { useState } = require('preact/hooks');
const propTypes = require('prop-types');

const {
  orgName,
  trackViewGroupActivity,
} = require('../util/group-list-item-common');
const { withServices } = require('../util/service-context');

const outOfScopeIcon = (
  <svg
    className="svg-icon group-list-item-out-of-scope__icon--unavailable"
    xmlns="http://www.w3.org/2000/svg"
    width="100%"
    height="100%"
    viewBox="0 0 24 24"
  >
    <path fill="none" d="M0 0h24v24H0V0z" />
    <path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
  </svg>
);

function GroupListItemOutOfScope({ analytics, group }) {
  const [isExpanded, setExpanded] = useState(false);

  const toggleGroupDetails = event => {
    event.stopPropagation();
    setExpanded(!isExpanded);
  };

  const groupOrgName = orgName(group);
  const trackViewActivity = event => {
    event.stopPropagation();
    trackViewGroupActivity(analytics);
  };

  return (
    <div
      className="group-list-item__item group-list-item-out-of-scope__item"
      onClick={toggleGroupDetails}
      tabIndex="0"
    >
      {/* the group icon */}
      <div className="group-list-item__icon-container">
        {group.logo && (
          <img
            className="group-list-item__icon group-list-item__icon--organization"
            alt={groupOrgName}
            src={group.logo}
          />
        )}
      </div>
      {/* the group name */}
      <div
        className={classnames({
          'group-list-item-out-of-scope__details': true,
          expanded: isExpanded,
        })}
      >
        {outOfScopeIcon}
        <a
          className="group-list-item__name-link"
          href=""
          title="This URL cannot be annotated in this group."
        >
          {group.name}
        </a>
        <br />
        {/* explanation of why group is not available */}
        {!isExpanded && (
          <p className="group-list-item-out-of-scope__details-toggle">
            Why is this group unavailable?
          </p>
        )}
        {isExpanded && (
          <Fragment>
            <p className="group-list-item-out-of-scope__details-unavailable-message">
              This group has been restricted to selected URLs by its
              administrators.
            </p>
            {group.links.html && (
              <p className="group-list-item-out-of-scope__details-actions">
                <a
                  className="button button--text group-list-item-out-of-scope__details-group-page-link"
                  href={group.links.html}
                  target="_blank"
                  onClick={trackViewActivity}
                  rel="noopener noreferrer"
                >
                  Go to group page
                </a>
              </p>
            )}
          </Fragment>
        )}
      </div>
    </div>
  );
}

GroupListItemOutOfScope.propTypes = {
  group: propTypes.object,

  analytics: propTypes.object,
};

GroupListItemOutOfScope.injectedProps = ['analytics'];

module.exports = withServices(GroupListItemOutOfScope);
