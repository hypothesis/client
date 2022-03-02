import { IconButton } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

/**
 * @typedef {import("@hypothesis/frontend-shared/lib/components/buttons").IconButtonProps} IconButtonProps
 *
 * @typedef {Omit<IconButtonProps, "className">} ToolbarButtonProps
 */

/**
 * Style an IconButton for use on the Toolbar
 *
 * @param {ToolbarButtonProps} props
 */
function ToolbarButton({ ...buttonProps }) {
  const { icon, title, ...restProps } = buttonProps;
  return (
    <IconButton
      className={classnames(
        'w-[30px] h-[30px]', // These buttons have precise dimensions
        'rounded-px', // size of border radius in absolute units
        'flex items-center justify-center',
        'border bg-white text-grey-6 hover:text-grey-9',
        'shadow transition-colors'
      )}
      icon={icon}
      title={title}
      {...restProps}
    />
  );
}

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
 * @prop {import("preact").Ref<HTMLButtonElement>} [toggleSidebarRef] -
 *   Ref that gets set to the toolbar button for toggling the sidebar.
 *   This is exposed to enable the drag-to-resize functionality of this
 *   button.
 * @prop {boolean} [useMinimalControls] -
 *   If true, all controls are hidden except for the "Close sidebar" button
 *   when the sidebar is open. This is enabled in the "clean" theme.
 */

/**
 * Controls on the edge of the sidebar for opening/closing the sidebar,
 * controlling highlight visibility and creating new page notes.
 *
 * This component and its buttons are sized with absolute units such that they
 * don't scale with changes to the host page's root font size. They will still
 * properly scale with user/browser zooming.
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
  toggleSidebarRef,
  useMinimalControls = false,
}) {
  return (
    <div
      className={classnames(
        'absolute left-[-33px] w-[33px] z-2',
        'text-px-base leading-none' // non-scaling sizing
      )}
    >
      {/* In the clean theme (`useMinimalControls` is `true`),
          the only button that should appear is a button
          to close the sidebar, and only if the sidebar is open. This button is
          absolutely positioned some way down the edge of the sidebar.
      */}
      {useMinimalControls && isSidebarOpen && (
        <IconButton
          className={classnames(
            'w-[27px] h-[27px] mt-[140px] ml-px-1.5',
            'flex items-center justify-center bg-white border',
            'text-grey-6 hover:text-grey-9 transition-colors',
            // Turn off right border to blend with sidebar
            'border-r-0',
            // A more intense shadow than other ToolbarButtons, to match that
            // of the edge of the sidebar in clean theme
            'shadow-sidebar'
          )}
          title="Close annotation sidebar"
          icon="cancel"
          onClick={closeSidebar}
        />
      )}
      {!useMinimalControls && (
        <>
          <IconButton
            className={classnames(
              // Height and width to align with the sidebar's top bar
              'h-[40px] w-[33px] pl-px-1.5',
              'bg-white text-grey-5 hover:text-grey-9',
              // Turn on left and bottom borders to continue the
              // border of the sidebar's top bar
              'border-l border-b'
            )}
            buttonRef={toggleSidebarRef}
            title="Annotation sidebar"
            icon={isSidebarOpen ? 'caret-right' : 'caret-left'}
            expanded={isSidebarOpen}
            pressed={isSidebarOpen}
            onClick={toggleSidebar}
          />
          <div className="space-y-px-1.5 mt-px-2">
            <ToolbarButton
              title="Show highlights"
              icon={showHighlights ? 'show' : 'hide'}
              selected={showHighlights}
              onClick={toggleHighlights}
            />
            <ToolbarButton
              title={
                newAnnotationType === 'note'
                  ? 'New page note'
                  : 'New annotation'
              }
              icon={newAnnotationType === 'note' ? 'note' : 'annotate'}
              onClick={createAnnotation}
            />
          </div>
        </>
      )}
    </div>
  );
}
