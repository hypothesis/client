import {
  ButtonBase,
  AnnotateIcon,
  CancelIcon,
  CaretRightIcon,
  CaretLeftIcon,
  HideIcon,
  NoteIcon,
  ShowIcon,
} from '@hypothesis/frontend-shared/lib/next';
import classnames from 'classnames';

/**
 * @typedef {import('@hypothesis/frontend-shared/lib/types').PresentationalProps} PresentationalProps
 * @typedef {import('@hypothesis/frontend-shared/lib/components/input/ButtonBase').ButtonCommonProps} ButtonCommonProps
 * @typedef {Omit<import('preact').JSX.HTMLAttributes<HTMLButtonElement>, 'icon'|'size'>} HTMLButtonAttributes
 * @typedef {import('@hypothesis/frontend-shared/lib/types').IconComponent} IconComponent
 */

/**
 * Style an IconButton for use on the Toolbar
 *
 * @param {PresentationalProps & ButtonCommonProps & HTMLButtonAttributes & {icon: IconComponent}} props
 */
function ToolbarButton({ icon: Icon, ...buttonProps }) {
  return (
    <ButtonBase
      classes={classnames(
        'w-[30px] h-[30px]', // These buttons have precise dimensions
        'rounded-px', // size of border radius in absolute units
        'flex items-center justify-center',
        'border bg-white text-grey-6 hover:text-grey-9',
        'shadow transition-colors'
      )}
      {...buttonProps}
    >
      <Icon />
    </ButtonBase>
  );
}

/**
 * @typedef StatusNotifierProps
 * @prop {boolean} highlightsVisible
 */

/**
 * Hidden component that announces certain Hypothesis states.
 *
 * This is useful to inform assistive technology users when these states
 * have been changed (eg. whether highlights are visible), given that they can
 * be changed in multiple ways (keyboard shortcuts, toolbar button) etc.
 *
 * @param {StatusNotifierProps} props
 */
function StatusNotifier({ highlightsVisible }) {
  return (
    <div className="sr-only" role="status" data-testid="toolbar-status">
      {highlightsVisible ? 'Highlights visible' : 'Highlights hidden'}
    </div>
  );
}

/**
 * @typedef ToolbarProps
 *
 * @prop {() => void} closeSidebar -
 *   Callback for the "Close sidebar" button. This button is only shown when
 *   `useMinimalControls` is true and the sidebar is open.
 * @prop {() => void} createAnnotation -
 *   Callback for the "Create annotation" / "Create page note" button. The type
 *   of annotation depends on whether there is a text selection and is decided
 *   by the caller.
 * @prop {boolean} isSidebarOpen - Is the sidebar currently visible?
 * @prop {'annotation'|'note'} newAnnotationType -
 *   Icon to show on the "Create annotation" button indicating what kind of annotation
 *   will be created.
 * @prop {boolean} showHighlights - Are highlights currently visible in the document?
 * @prop {() => void} toggleHighlights -
 *   Callback to toggle visibility of highlights in the document.
 * @prop {() => void} toggleSidebar -
 *   Callback to toggle the visibility of the sidebar.
 * @prop {import("preact").RefObject<HTMLElement>} [toggleSidebarRef] -
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
        <ButtonBase
          classes={classnames(
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
          onClick={closeSidebar}
        >
          <CancelIcon />
        </ButtonBase>
      )}
      {!useMinimalControls && (
        <>
          <ButtonBase
            classes={classnames(
              // Height and width to align with the sidebar's top bar
              'h-[40px] w-[33px] pl-[6px]',
              'bg-white text-grey-5 hover:text-grey-9',
              // Turn on left and bottom borders to continue the
              // border of the sidebar's top bar
              'border-l border-b'
            )}
            elementRef={toggleSidebarRef}
            title="Annotation sidebar"
            expanded={isSidebarOpen}
            pressed={isSidebarOpen}
            onClick={toggleSidebar}
          >
            {isSidebarOpen ? <CaretRightIcon /> : <CaretLeftIcon />}
          </ButtonBase>
          <div className="space-y-px-1.5 mt-px-2">
            <ToolbarButton
              title="Show highlights"
              icon={showHighlights ? ShowIcon : HideIcon}
              selected={showHighlights}
              onClick={toggleHighlights}
            />
            <ToolbarButton
              title={
                newAnnotationType === 'note'
                  ? 'New page note'
                  : 'New annotation'
              }
              icon={newAnnotationType === 'note' ? NoteIcon : AnnotateIcon}
              onClick={createAnnotation}
            />
          </div>
          <StatusNotifier highlightsVisible={showHighlights} />
        </>
      )}
    </div>
  );
}
