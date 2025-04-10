import {
  Button,
  AnnotateIcon,
  CancelIcon,
  CaretRightIcon,
  CaretLeftIcon,
  HideIcon,
  ImageIcon,
  NoteIcon,
  PinIcon,
  ShowIcon,
} from '@hypothesis/frontend-shared';
import type { ButtonProps } from '@hypothesis/frontend-shared/lib/components/input/Button';
import type {
  IconComponent,
  PresentationalProps,
} from '@hypothesis/frontend-shared/lib/types';
import classnames from 'classnames';
import type { JSX, RefObject } from 'preact';

import type { AnnotationTool } from '../../types/annotator';

// TODO: ToolbarButton should be extracted as a shared design pattern or
// component
type ToolbarButtonProps = PresentationalProps &
  ButtonProps &
  Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'icon' | 'size'> & {
    icon: IconComponent;
  };

/**
 * Style an IconButton for use on the Toolbar
 */
function ToolbarButton({ icon: Icon, ...buttonProps }: ToolbarButtonProps) {
  return (
    <Button
      classes={classnames(
        'justify-center rounded',
        'w-[30px] h-[30px]',
        'shadow border bg-white text-grey-6 hover:text-grey-9',
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
  /**
   * Callback for the "Close sidebar" button. This button is only shown when
   * `useMinimalControls` is true and the sidebar is open.
   */
  closeSidebar: () => void;

  /**
   * Callback for a button that creates an annotation.
   */
  createAnnotation: (tool: AnnotationTool) => void;

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
        'absolute left-[-33px] w-[33px] z-2',
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
            'w-[27px] h-[27px] mt-[140px] ml-px-1.5',
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
              'bg-white text-grey-5 hover:text-grey-9',
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
          <div className="space-y-px-1.5 mt-px-2">
            <ToolbarButton
              title="Show highlights"
              icon={showHighlights ? ShowIcon : HideIcon}
              pressed={showHighlights}
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
                title="Rectangle annotation"
                icon={ImageIcon}
                onClick={() => createAnnotation('rect')}
              />
            )}
            {supportedTools.includes('point') && (
              <ToolbarButton
                data-testid="point-annotation"
                title="Point annotation"
                icon={PinIcon}
                onClick={() => createAnnotation('point')}
              />
            )}
          </div>
          <StatusNotifier highlightsVisible={showHighlights} />
        </>
      )}
    </div>
  );
}
