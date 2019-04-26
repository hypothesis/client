'use strict';

const classnames = require('classnames');
const propTypes = require('prop-types');
const { createElement } = require('preact');

const { orgName } = require('../util/group-list-item-common');
const { withServices } = require('../util/service-context');

function GroupListItem({ analytics, group, store }) {
  const focusGroup = () => {
    analytics.track(analytics.events.GROUP_SWITCH);
    store.focusGroup(group.id);
  };

  const isSelected = group.id === store.focusedGroupId();
  const groupOrgName = orgName(group);

  return (
    <div
      className={classnames({
        'group-list-item__item': true,
        'is-selected': isSelected,
      })}
      onClick={focusGroup}
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
      <div className="group-list-item__details">
        <a
          className="group-list-item__name-link"
          href=""
          title={
            group.type === 'private'
              ? `Show and create annotations in ${group.name}`
              : 'Show public annotations'
          }
        >
          {group.name}
        </a>
      </div>
    </div>
  );
}

GroupListItem.propTypes = {
  group: propTypes.object.isRequired,

  analytics: propTypes.object.isRequired,
  store: propTypes.object.isRequired,
};

GroupListItem.injectedProps = ['analytics', 'store'];

module.exports = withServices(GroupListItem);
