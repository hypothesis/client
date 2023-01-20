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
import type {
  IconComponent,
  PresentationalProps,
} from '@hypothesis/frontend-shared/lib/types';
import type { ButtonCommonProps } from '@hypothesis/frontend-shared/lib/components/input/ButtonBase';
import classnames from 'classnames';
import type { JSX, RefObject } from 'preact';

// TODO: ToolbarButton should be extracted as a shared design pattern or
// component
type ToolbarButtonProps = PresentationalProps &
  ButtonCommonProps &
  Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'icon' | 'size'> & {
    icon: IconComponent;
  };

/**
 * Style an IconButton for use on the Toolbar
 */
function ToolbarButton({ icon: Icon, ...buttonProps }: ToolbarButtonProps) {
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
 * Hidden component that announces certain Hypothesis states.
 *
 * This is useful to inform assistive technology users when these states
 * have been changed (eg. whether highlights are visible), given that they can
 * be changed in multiple ways (keyboard shortcuts, toolbar button) etc.
 */
function StatusNotifier({ highlightsVisible }: { highlightsVisible: boolean }) {
  return (
    <div className="sr-only" role="status" data-testid="toolbar-status">
      {highlightsVisible ? 'Highlights visible' : 'Highlights hidden'}
    </div>
  );
}

export type ToolbarProps = {
  /**
   * Callback for the "Close sidebar" button. This button is only shown when
   * `useMinimalControls` is true and the sidebar is open.
   */
  closeSidebar: () => void;

  /** Callback for when "Create annotation" button is clicked. */
  createAnnotation: () => void;

  /** Is the sidebar currently open? */
  isSidebarOpen: boolean;

  /**
   * Informs which icon to show on the "Create annotation" button and what type
   * of annotation should be created by the `createAnnotation` callback. The
   * type of annotation depends on whether there is a text selection in the
   * document.
   */
  newAnnotationType: 'annotation' | 'note';

  /** Are highlights currently visible in the document? */
  showHighlights: boolean;

  /** Callback for the show/hide highlights button */
  toggleHighlights: () => void;

  /**
   * Callback for toggling the visibility of the sidebar when the show/hide
   * sidebar button is clicked
   */
  toggleSidebar: () => void;

  /**
   * Ref to apply to the show/hide-sidebar button. This is exposed to enable
   * drag-to-resize functionality.
   */
  toggleSidebarRef?: RefObject<HTMLElement>;

  /**
   * When true, all controls are hidden except for the "Close sidebar" button
   * when the sidebar is open. This is enabled for the "clean" theme.
   */
  useMinimalControls?: boolean;
};

/**
 * Controls on the edge of the sidebar for opening/closing the sidebar,
 * controlling highlight visibility and creating new page notes.
 *
 * This component and its buttons are sized with absolute units such that they
 * don't scale with changes to the host page's root font size. They will still
 * properly scale with user/browser zooming.
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
}: ToolbarProps) {
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
