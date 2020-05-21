import classnames from 'classnames';
import propTypes from 'prop-types';
import { createElement } from 'preact';

import SvgIcon from '../../shared/components/svg-icon';

function ToolbarButton({
  buttonRef,
  expanded,
  extraClasses,
  label,
  icon,
  onClick,
  selected,
}) {
  const handleClick = event => {
    // Stop event from propagating up to the document and being treated as a
    // click on document content, causing the sidebar to close.
    event.stopPropagation();
    onClick();
  };

  return (
    <button
      className={classnames('annotator-frame-button', extraClasses)}
      aria-label={label}
      aria-expanded={expanded}
      aria-pressed={selected}
      onClick={handleClick}
      ref={buttonRef}
      title={label}
    >
      <SvgIcon name={icon} />
    </button>
  );
}

ToolbarButton.propTypes = {
  buttonRef: propTypes.any,
  expanded: propTypes.bool,
  extraClasses: propTypes.string,
  label: propTypes.string.isRequired,
  icon: propTypes.string.isRequired,
  onClick: propTypes.func.isRequired,
  selected: propTypes.bool,
};

/**
 * Controls on the edge of the sidebar for opening/closing the sidebar,
 * controlling highlight visibility and creating new page notes.
 */
export default function Toolbar({
  closeSidebar,
  createAnnotation,
  isSidebarOpen,
  newAnnotationType,
  showHighlights,
  toggleHighlights,
  toggleSidebar,
  toggleSidebarRef,
  useMinimalControls = false,
}) {
  return (
    <div>
      {useMinimalControls && isSidebarOpen && (
        <ToolbarButton
          extraClasses="annotator-frame-button--sidebar_close"
          label="Close annotation sidebar"
          icon="cancel"
          onClick={closeSidebar}
        />
      )}
      {!useMinimalControls && (
        <ToolbarButton
          extraClasses="annotator-frame-button--sidebar_toggle"
          buttonRef={toggleSidebarRef}
          label="Annotation sidebar"
          icon={isSidebarOpen ? 'caret-right' : 'caret-left'}
          expanded={isSidebarOpen}
          onClick={toggleSidebar}
        />
      )}
      {!useMinimalControls && (
        <ToolbarButton
          label="Show highlights"
          icon={showHighlights ? 'show' : 'hide'}
          selected={showHighlights}
          onClick={toggleHighlights}
        />
      )}
      {!useMinimalControls && (
        <ToolbarButton
          label={
            newAnnotationType === 'note' ? 'New page note' : 'New annotation'
          }
          icon={newAnnotationType === 'note' ? 'note' : 'annotate'}
          onClick={createAnnotation}
        />
      )}
    </div>
  );
}

Toolbar.propTypes = {
  /**
   * Callback for the "Close sidebar" button. This button is only shown when
   * `useMinimalControls` is true and the sidebar is open.
   */
  closeSidebar: propTypes.func.isRequired,

  /**
   * Callback for the "Create annotation" / "Create page note" button. The type
   * of annotation depends on whether there is a text selection and is decided
   * by the caller.
   */
  createAnnotation: propTypes.func.isRequired,

  /** Is the sidebar currently visible? */
  isSidebarOpen: propTypes.bool.isRequired,

  newAnnotationType: propTypes.oneOf(['annotation', 'note']).isRequired,

  /** Are highlights currently visible in the document? */
  showHighlights: propTypes.bool.isRequired,

  /** Callback to toggle visibility of highlights in the document. */
  toggleHighlights: propTypes.func.isRequired,

  /** Callback to toggle the visibility of the sidebar. */
  toggleSidebar: propTypes.func.isRequired,

  /**
   * Ref that gets set to the toolbar button for toggling the sidebar.
   * This is exposed to enable the drag-to-resize functionality of this
   * button.
   */
  toggleSidebarRef: propTypes.any,

  /**
   * If true, all controls are hidden except for the "Close sidebar" button
   * when the sidebar is open.
   */
  useMinimalControls: propTypes.bool,
};
