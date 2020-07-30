import { createElement } from 'preact';
import propTypes from 'prop-types';

import useStore from '../store/use-store';
import { isNew, isReply } from '../util/annotation-metadata';
import { isShared } from '../util/permissions';
import { withServices } from '../util/service-context';
import { applyTheme } from '../util/theme';

import Button from './button';
import Menu from './menu';
import MenuItem from './menu-item';
import SvgIcon from '../../shared/components/svg-icon';

/**
 * @typedef {import('../../types/api').Annotation} Annotation
 * @typedef {import('../../types/config').MergedConfig} MergedConfig
 */

/**
 * @typedef AnnotationPublishControlProps
 * @prop {Annotation} annotation
 * @prop {boolean} [isDisabled]
 *  - Should the save button be disabled? Hint: it will be if the annotation has no content
 * @prop {() => any} onSave - Callback for save button click
 * @prop {MergedConfig} settings - Injected service
 */

/**
 * Render a compound control button for publishing (saving) an annotation:
 * - Save the annotation — left side of button
 * - Choose sharing/privacy option - drop-down menu on right side of button
 *
 * @param {AnnotationPublishControlProps} props
 */
function AnnotationPublishControl({
  annotation,
  isDisabled,
  onSave,
  settings,
}) {
  const draft = useStore(store => store.getDraft(annotation));
  const group = useStore(store => store.getGroup(annotation.group));

  const createDraft = useStore(store => store.createDraft);
  const removeDraft = useStore(store => store.removeDraft);
  const setDefault = useStore(store => store.setDefault);
  const removeAnnotations = useStore(store => store.removeAnnotations);

  if (!group) {
    // If there is no group, then don't render anything as a missing group
    // may mean the group is not loaded yet.
    return null;
  }

  const isPrivate = draft ? draft.isPrivate : !isShared(annotation.permissions);

  const publishDestination = isPrivate ? 'Only Me' : group.name;
  const themeProps = ['ctaTextColor', 'ctaBackgroundColor'];

  // Revert changes to this annotation
  const onCancel = () => {
    removeDraft(annotation);
    if (isNew(annotation)) {
      removeAnnotations([annotation]);
    }
  };

  const onSetPrivacy = level => {
    createDraft(annotation, { ...draft, isPrivate: level === 'private' });
    // Persist this as privacy default for future annotations unless this is a reply
    if (!isReply(annotation)) {
      setDefault('annotationPrivacy', level);
    }
  };

  const menuLabel = (
    <div
      className="annotation-publish-button__menu-label"
      style={applyTheme(themeProps, settings)}
    >
      <SvgIcon name="expand-menu" className="u-icon--small" />
    </div>
  );

  return (
    <div className="annotation-publish-control">
      <div className="annotation-publish-button">
        <Button
          className="annotation-publish-button__primary"
          style={applyTheme(themeProps, settings)}
          onClick={onSave}
          disabled={isDisabled}
          title={`Publish this annotation to ${publishDestination}`}
          buttonText={`Post to ${publishDestination}`}
        />
        {/* This wrapper div is necessary because of peculiarities with
             Safari: see https://github.com/hypothesis/client/issues/2302 */}
        <div className="annotation-publish-button__menu-wrapper">
          <Menu
            arrowClass="annotation-publish-button__menu-arrow"
            containerPositioned={false}
            contentClass="annotation-publish-button__menu-content"
            label={menuLabel}
            menuIndicator={false}
            title="Change annotation sharing setting"
            align="left"
          >
            <MenuItem
              icon={group.type === 'open' ? 'public' : 'groups'}
              label={group.name}
              isSelected={!isPrivate}
              onClick={() => onSetPrivacy('shared')}
            />
            <MenuItem
              icon="lock"
              label="Only Me"
              isSelected={isPrivate}
              onClick={() => onSetPrivacy('private')}
            />
          </Menu>
        </div>
      </div>
      <div>
        <Button
          icon="cancel"
          className="annotation-publish-control__cancel-button"
          buttonText="Cancel"
          onClick={onCancel}
        />
      </div>
    </div>
  );
}

AnnotationPublishControl.propTypes = {
  annotation: propTypes.object.isRequired,
  isDisabled: propTypes.bool,
  onSave: propTypes.func.isRequired,
  settings: propTypes.object.isRequired,
};

AnnotationPublishControl.injectedProps = ['settings'];

export default withServices(AnnotationPublishControl);
