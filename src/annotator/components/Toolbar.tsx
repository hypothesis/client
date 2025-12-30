import {
  Button,
  AnnotateIcon,
  CancelIcon,
  CaretRightIcon,
  CaretLeftIcon,
  HideIcon,
  SelectionIcon,
  NoteIcon,
  PinIcon,
  ShowIcon,
} from '@hypothesis/frontend-shared';
import type { ButtonProps } from '@hypothesis/frontend-shared';
import type {
  IconComponent,
  PresentationalProps,
} from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import type { JSX, RefObject } from 'preact';

import type { AnnotationTool } from '../../types/annotator';

// TODO: ToolbarButton should be extracted as a shared design pattern or
// component
type ToolbarButtonProps = PresentationalProps &
  ButtonProps &
  Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'icon' | 'size'> & {
    icon: IconComponent;
  } & {
    /** True if the button changes background when pressed. */
    pressedBackground?: boolean;
  };

/**
 * Style an IconButton for use on the Toolbar
 */
function ToolbarButton({
  icon: Icon,
  pressedBackground = true,
  ...buttonProps
}: ToolbarButtonProps) {
  return (
    <Button
      classes={classnames(
        'justify-center rounded',
        // On mobile, 40px is slightly smaller than the 44px minimum we usually
        // use, but works in this context as the buttons have spacing between
        // them. The width is not changed on mobile as this requires additional
        // work to make the whole toolbar wider.
        'w-[30px] h-[30px] touch:h-[40px]',
        'shadow border bg-white text-grey-6 hover:text-grey-9',
        pressedBackground && 'aria-pressed:bg-grey-3',
      )}
      {...buttonProps}
      size="custom"
      variant="custom"
    >
      <Icon />
    </Button>
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
  /** Sets which annotation tool is shown as active/pressed. */
  activeTool?: AnnotationTool | null;

  /**
   * Callback for the "Close sidebar" button. This button is only shown when
   * `useMinimalControls` is true and the sidebar is open.
   */
  closeSidebar: () => void;

  /**
   * Callback for a button that creates an annotation.
   */
  createAnnotation: (tool: AnnotationTool | null) => void;

  /** Is the sidebar currently open? */
  isSidebarOpen: boolean;

  /**
   * The id attribute for the sidebar container to reference from the sidebar
   * toggle's aria-controls attribute
   */
  sidebarContainerId?: string;

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

  /**
   * Specifies which tools are supported for creating new annotations.
   */
  supportedTools: AnnotationTool[];
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
  activeTool = null,
  closeSidebar,
  createAnnotation,
  isSidebarOpen,
  sidebarContainerId,
  newAnnotationType,
  showHighlights,
  supportedTools = ['selection'],
  toggleHighlights,
  toggleSidebar,
  toggleSidebarRef,
  useMinimalControls = false,
}: ToolbarProps) {
  return (
    <div
      className={classnames(
        {
          // For minimal controls, display the toolbar to the left, fully
          // outside the sidebar
          'absolute right-full': useMinimalControls,
          // When the full toolbar is displayed, we position it relative to its
          // container, so that it takes vertical space and pushes next elements
          // down (eg. the buckets list).
          // The toolbar is wider than its parent, so we need to adjust the
          // right position so that the right edge of the toolbar aligns with
          // the right edge of the parent.
          'relative right-[11px]': !useMinimalControls,
        },
        'w-[33px] z-2',
        'text-px-base leading-none', // non-scaling sizing
      )}
    >
      {/* In the clean theme (`useMinimalControls` is `true`),
          the only button that should appear is a button
          to close the sidebar, and only if the sidebar is open. This button is
          absolutely positioned some way down the edge of the sidebar.
      */}
      {useMinimalControls && isSidebarOpen && (
        <Button
          classes={classnames(
            'transition-colors focus-visible-ring ring-inset',
            'w-[27px] h-[27px] mt-[140px] ml-[6px]',
            'flex items-center justify-center bg-white border',
            'text-grey-6 hover:text-grey-9 transition-colors',
            // Turn off right border to blend with sidebar
            'border-r-0',
            // A more intense shadow than other ToolbarButtons, to match that
            // of the edge of the sidebar in clean theme
            'shadow-sidebar',
          )}
          title="Close annotation sidebar"
          onClick={closeSidebar}
          unstyled
        >
          <CancelIcon />
        </Button>
      )}
      {!useMinimalControls && (
        <>
          <Button
            classes={classnames(
              'transition-colors focus-visible-ring ring-inset',
              // Height and width to align with the sidebar's top bar
              'h-[40px] w-[33px] pl-[6px] rounded-bl',
              'bg-white text-grey-6 hover:text-grey-9',
              // Turn on left and bottom borders to continue the
              // border of the sidebar's top bar
              'border-l border-b',
            )}
            elementRef={toggleSidebarRef}
            title="Annotation sidebar"
            expanded={isSidebarOpen}
            aria-controls={sidebarContainerId}
            onClick={toggleSidebar}
            unstyled
          >
            {isSidebarOpen ? <CaretRightIcon /> : <CaretLeftIcon />}
          </Button>
          <div className="space-y-[6px] mt-[8px]">
            <ToolbarButton
              title="Show highlights"
              icon={showHighlights ? ShowIcon : HideIcon}
              pressed={showHighlights}
              // Button changes icon when pressed rather than changing background.
              pressedBackground={false}
              onClick={toggleHighlights}
            />
            {supportedTools.includes('selection') && (
              <ToolbarButton
                data-testid="text-annotation"
                title={
                  newAnnotationType === 'note'
                    ? 'New page note'
                    : 'New annotation'
                }
                icon={newAnnotationType === 'note' ? NoteIcon : AnnotateIcon}
                onClick={() => createAnnotation('selection')}
              />
            )}
            {supportedTools.includes('rect') && (
              <ToolbarButton
                data-testid="rect-annotation"
                pressed={activeTool === 'rect'}
                title="Rectangle annotation"
                icon={SelectionIcon}
                onClick={() =>
                  createAnnotation(activeTool === 'rect' ? null : 'rect')
                }
              />
            )}
            {supportedTools.includes('point') && (
              <ToolbarButton
                data-testid="point-annotation"
                pressed={activeTool === 'point'}
                title="Pin annotation"
                icon={PinIcon}
                onClick={() =>
                  createAnnotation(activeTool === 'point' ? null : 'point')
                }
              />
            )}
          </div>
          <StatusNotifier highlightsVisible={showHighlights} />
        </>
      )}
    </div>
  );
}
