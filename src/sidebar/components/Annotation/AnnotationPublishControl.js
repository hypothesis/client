import { Icon, LabeledButton } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

import { withServices } from '../../service-context';
import { applyTheme } from '../../helpers/theme';

import Menu from '../Menu';
import MenuItem from '../MenuItem';

/**
 * @typedef {import('../../../types/api').Group} Group
 * @typedef {import('../../../types/config').SidebarSettings} SidebarSettings
 */

/**
 * @typedef AnnotationPublishControlProps
 * @prop {Group} group - The group this annotation or draft would publish to
 * @prop {boolean} [isDisabled]
 *  - Should the save button be disabled? Hint: it will be if the annotation has no content
 * @prop {boolean} isPrivate - Annotation or draft is "Only Me"
 * @prop {() => void} onCancel - Callback for cancel button click
 * @prop {() => void} onSave - Callback for save button click
 * @prop {(isPrivate: boolean) => void} onSetPrivacy - Callback for save button click
 * @prop {SidebarSettings} settings - Injected service
 */

/**
 * Render a compound control button for publishing (saving) an annotation:
 * - Save the annotation — left side of button
 * - Choose sharing/privacy option - drop-down menu on right side of button
 *
 * @param {AnnotationPublishControlProps} props
 */
function AnnotationPublishControl({
  group,
  isDisabled,
  isPrivate,
  onCancel,
  onSave,
  onSetPrivacy,
  settings,
}) {
  const buttonStyle = applyTheme(
    ['ctaTextColor', 'ctaBackgroundColor'],
    settings
  );

  const menuLabel = (
    <div className="p-2.5 text-color-text-inverted" style={buttonStyle}>
      <Icon name="expand-menu" />
    </div>
  );

  return (
    <div className="flex flex-row gap-x-3">
      <div className="flex relative">
        <LabeledButton
          classes={classnames(
            // Turn off right-side border radius to align with menu-open button
            'rounded-r-none'
          )}
          data-testid="publish-control-button"
          style={buttonStyle}
          onClick={onSave}
          disabled={isDisabled}
          size="large"
          variant="primary"
        >
          Post to {isPrivate ? 'Only Me' : group.name}
        </LabeledButton>
        {/* This wrapper div is necessary because of peculiarities with
             Safari: see https://github.com/hypothesis/client/issues/2302 */}
        <div
          className={classnames(
            // Round the right side of this menu-open button only
            'flex flex-row rounded-r-sm bg-grey-7 hover:bg-grey-8'
          )}
          style={buttonStyle}
        >
          <Menu
            arrowClass={classnames(
              // Position up-pointing menu caret aligned beneath the
              // down-pointing menu-open button icon
              'right-[10px]'
            )}
            containerPositioned={false}
            contentClass={classnames(
              // Ensure the menu is wide enough to "reach" the right-aligned
              // up-pointing menu arrow
              'min-w-full'
            )}
            label={menuLabel}
            menuIndicator={false}
            title="Change annotation sharing setting"
            align="left"
          >
            <MenuItem
              icon={group.type === 'open' ? 'public' : 'groups'}
              label={group.name}
              isSelected={!isPrivate}
              onClick={() => onSetPrivacy(false)}
            />
            <MenuItem
              icon="lock"
              label="Only Me"
              isSelected={isPrivate}
              onClick={() => onSetPrivacy(true)}
            />
          </Menu>
        </div>
      </div>
      <div>
        <LabeledButton
          classes="p-2.5"
          icon="cancel"
          onClick={onCancel}
          size="large"
        >
          Cancel
        </LabeledButton>
      </div>
    </div>
  );
}

export default withServices(AnnotationPublishControl, ['settings']);
