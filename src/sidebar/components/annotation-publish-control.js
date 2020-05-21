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

/**
 * Render a compound control button for publishing (saving) an annotation:
 * - Save the annotation — left side of button
 * - Choose sharing/privacy option - drop-down menu on right side of button
 *
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
    <div className="annotation-publish-control__btn-dropdown-arrow">
      <div className="annotation-publish-control__btn-dropdown-arrow-separator" />
      <div
        className="annotation-publish-control__btn-dropdown-arrow-indicator"
        style={applyTheme(themeProps, settings)}
      />
    </div>
  );

  return (
    <div className="annotation-publish-control">
      <div className="annotation-publish-control__btn">
        <button
          className="annotation-publish-control__btn-primary"
          style={applyTheme(themeProps, settings)}
          onClick={onSave}
          disabled={isDisabled}
          aria-label={`Publish this annotation to ${publishDestination}`}
          title={`Publish this annotation to ${publishDestination}`}
        >
          Post to {publishDestination}
        </button>
        <Menu
          arrowClass="annotation-publish-control__btn-menu-arrow"
          containerPositioned={false}
          contentClass="annotation-publish-control__btn-menu-content"
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
      <Button
        icon="cancel"
        buttonText="Cancel"
        onClick={onCancel}
        className="annotation-publish-control__btn-cancel"
      />
    </div>
  );
}

AnnotationPublishControl.propTypes = {
  annotation: propTypes.object.isRequired,

  /**
   * Should the save button be disabled?
   * Hint: it will be if the annotation has no content
   */
  isDisabled: propTypes.bool,

  /** Callback for save button click */
  onSave: propTypes.func.isRequired,

  /** services */
  settings: propTypes.object.isRequired,
};

AnnotationPublishControl.injectedProps = ['settings'];

export default withServices(AnnotationPublishControl);
