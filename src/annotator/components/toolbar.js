import { SvgIcon } from '@hypothesis/frontend-shared';
import propTypes from 'prop-types';
import { createElement } from 'preact';
import { useState, useEffect } from 'preact/hooks';

/**
 * @param {Object} props
 *  @param {import("preact").Ref<HTMLButtonElement>} [props.buttonRef]
 *  @param {boolean} [props.expanded]
 *  @param {string} [props.className]
 *  @param {string} props.label
 *  @param {string} props.icon
 *  @param {() => any} props.onClick
 *  @param {boolean} [props.selected]
 */
function ToolbarButton({
  buttonRef,
  expanded,
  className = 'annotator-toolbar-button',
  label,
  icon,
  onClick,
  selected = false,
}) {
  const handleClick = event => {
    // Stop event from propagating up to the document and being treated as a
    // click on document content, causing the sidebar to close.
    event.stopPropagation();
    onClick();
  };

  return (
    <button
      className={className}
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
  className: propTypes.string,
  label: propTypes.string.isRequired,
  icon: propTypes.string.isRequired,
  onClick: propTypes.func.isRequired,
  selected: propTypes.bool,
};

/**
 * @typedef ToolbarProps
 *
 * @prop {() => any} closeSidebar -
 *   Callback for the "Close sidebar" button. This button is only shown when
 *   `useMinimalControls` is true and the sidebar is open.
 * @prop {() => any} createAnnotation -
 *   Callback for the "Create annotation" / "Create page note" button. The type
 *   of annotation depends on whether there is a text selection and is decided
 *   by the caller.
 * @prop {boolean} isSidebarOpen - Is the sidebar currently visible?
 * @prop {'annotation'|'note'} newAnnotationType -
 *   Icon to show on the "Create annotation" button indicating what kind of annotation
 *   will be created.
 * @prop {boolean} showHighlights - Are highlights currently visible in the document?
 * @prop {() => any} toggleHighlights -
 *   Callback to toggle visibility of highlights in the document.
 * @prop {() => any} toggleSidebar -
 *   Callback to toggle the visibility of the sidebar.
 * @prop {(object) => any} setDoodleOptions
 *   Callback to set the options of the doodle canvas
 * @prop {() => any} saveDoodle
 *   Callback to set the options of the doodle canvas
 * @prop {import("preact").Ref<HTMLButtonElement>} [toggleSidebarRef] -
 *   Ref that gets set to the toolbar button for toggling the sidebar.
 *   This is exposed to enable the drag-to-resize functionality of this
 *   button.
 * @prop {boolean} [useMinimalControls] -
 *   If true, all controls are hidden except for the "Close sidebar" button
 *   when the sidebar is open.
 * @prop {boolean} [drawingToolbarActivated]
 *
 * @prop {() => any} drawingToolbarToggle
 */

/**
 * Controls on the edge of the sidebar for opening/closing the sidebar,
 * controlling highlight visibility and creating new page notes.
 *
 * @param {ToolbarProps} props
 */
export default function Toolbar({
  closeSidebar,
  createAnnotation,
  isSidebarOpen,
  newAnnotationType,
  showHighlights,
  toggleHighlights,
  toggleSidebar,
  setDoodleOptions,
  saveDoodle,
  toggleSidebarRef,
  useMinimalControls = false,
  drawingToolbarActivated,
  drawingToolbarToggle,
}) {
  const small = 1;
  const medium = 5;
  const large = 10;

  const [toolSize, setToolSize] = useState(medium);

  const [tool, setTool] = useState('pen');

  const [color, setColor] = useState('red');

  useEffect(() => {
    setDoodleOptions({ tool: tool, size: toolSize, color: color });
  }, [toolSize, tool, color, setDoodleOptions]);

  if (!drawingToolbarActivated) {
    return (
      <div>
        {useMinimalControls && isSidebarOpen && (
          <ToolbarButton
            className="annotator-toolbar__sidebar-close"
            label="Close annotation sidebar"
            icon="cancel"
            onClick={closeSidebar}
          />
        )}
        {!useMinimalControls && (
          <ToolbarButton
            className="annotator-toolbar__sidebar-toggle"
            buttonRef={toggleSidebarRef}
            label="Annotation sidebar"
            icon={isSidebarOpen ? 'caret-right' : 'caret-left'}
            expanded={isSidebarOpen}
            onClick={toggleSidebar}
          />
        )}
        {!useMinimalControls && (
          <div className="annotator-toolbar-buttonbar">
            <ToolbarButton
              label="Show highlights"
              icon={showHighlights ? 'show' : 'hide'}
              selected={showHighlights}
              onClick={toggleHighlights}
            />
            <ToolbarButton
              label={
                newAnnotationType === 'note'
                  ? 'New page note'
                  : 'New annotation'
              }
              icon={newAnnotationType === 'note' ? 'note' : 'annotate'}
              onClick={createAnnotation}
            />
            <ToolbarButton
              label="New Doodle"
              icon="doodle"
              onClick={drawingToolbarToggle}
            />
          </div>
        )}
      </div>
    );
  } else {
    return (
      <div>
        {useMinimalControls && isSidebarOpen && (
          <ToolbarButton
            className="annotator-toolbar__sidebar-close"
            label="Close annotation sidebar"
            icon="cancel"
            onClick={closeSidebar}
          />
        )}
        {!useMinimalControls && (
          <ToolbarButton
            className="annotator-toolbar__sidebar-toggle"
            buttonRef={toggleSidebarRef}
            label="Annotation sidebar"
            icon={isSidebarOpen ? 'caret-right' : 'caret-left'}
            expanded={isSidebarOpen}
            onClick={toggleSidebar}
          />
        )}
        {!useMinimalControls && (
          <div className="annotator-toolbar-buttonbar">
            <ToolbarButton
              label="Stop doodle"
              icon="close"
              onClick={drawingToolbarToggle}
            />
            <ToolbarButton
              label="Pen"
              icon="pen"
              onClick={() => {
                setTool('pen');
              }}
            />
            <ToolbarButton
              label="Eraser"
              icon="erase"
              onClick={() => {
                setTool('eraser');
              }}
            />
            <button
              className="popup annotator-toolbar-button size selected"
              onClick={e => {
                //@ts-ignore
                e.target?.querySelector('#myPopup').classList.toggle('show');
                //@ts-ignore
                e.target?.parentElement
                  .querySelector('.color')
                  .querySelector('#myPopup')
                  .classList.remove('show');
              }}
              aria-label="Brush Size"
            >
              <SvgIcon name="sizes-icon" className="svgicon" />
              <span className="popuptext" id="myPopup">
                <ToolbarButton
                  label="Large"
                  icon="circle-large"
                  onClick={() => {
                    setToolSize(large);
                  }}
                />
                <ToolbarButton
                  label="Medium"
                  icon="circle-medium"
                  onClick={() => {
                    setToolSize(medium);
                  }}
                />
                <ToolbarButton
                  label="Small"
                  icon="circle-small"
                  className="annotator-toolbar-button smallSelector"
                  onClick={() => {
                    setToolSize(small);
                  }}
                />
              </span>
            </button>
            <button
              className="popup annotator-toolbar-button color"
              onClick={e => {
                //@ts-ignore
                e.target?.querySelector('#myPopup').classList.toggle('show');
                //@ts-ignore
                e.target?.parentElement
                  .querySelector('.size')
                  .querySelector('#myPopup')
                  .classList.remove('show');
              }}
              aria-label="Brush Color"
            >
              <SvgIcon name="color-icon" className="svgicon" />
              <span className="popuptext" id="myPopup">
                <ToolbarButton
                  label="Red"
                  icon="red-icon"
                  onClick={() => {
                    setColor('red');
                  }}
                />
                <ToolbarButton
                  label="Green"
                  icon="green-icon"
                  onClick={() => {
                    setColor('green');
                  }}
                />
                <ToolbarButton
                  label="Blue"
                  icon="blue-icon"
                  onClick={() => {
                    setColor('blue');
                  }}
                />
              </span>
            </button>
            <ToolbarButton
              label="Save"
              icon="erase"
              onClick={() => saveDoodle()}
            />
          </div>
        )}
      </div>
    );
  }
}

Toolbar.propTypes = {
  closeSidebar: propTypes.func.isRequired,
  createAnnotation: propTypes.func.isRequired,
  isSidebarOpen: propTypes.bool.isRequired,
  newAnnotationType: propTypes.oneOf(['annotation', 'note']).isRequired,
  showHighlights: propTypes.bool.isRequired,
  toggleHighlights: propTypes.func.isRequired,
  toggleSidebar: propTypes.func.isRequired,
  toggleDoodleability: propTypes.func.isRequired,
  toggleSidebarRef: propTypes.any,
  useMinimalControls: propTypes.bool,
  drawingToolbarActivated: propTypes.bool,
  drawingToolbarToggle: propTypes.func.isRequired,
  setDoodleOptions: propTypes.func.isRequired,
  saveDoodle: propTypes.func.isRequired,
};
