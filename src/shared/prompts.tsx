import { Button, ModalDialog } from '@hypothesis/frontend-shared/lib/next';
import { render } from 'preact';
import { createRef } from 'preact';
import type { RefObject } from 'preact';
import type { ComponentChildren } from 'preact';

export type ConfirmModalProps = {
  title?: string;
  message: ComponentChildren;
  confirmAction?: string;
};

/**
 * Show the user a prompt asking them to confirm an action.
 *
 * This is like an async version of `window.confirm` except that:
 *
 *  - It can be used inside iframes (browsers are starting to prevent this for
 *    the native `window.confirm` dialog)
 *  - The visual style of the dialog matches the Hypothesis design system
 *
 * @return - Promise that resolves with `true` if the user confirmed the action
 *   or `false` if they canceled it.
 */
export async function confirm({
  title = 'Confirm',
  message,
  confirmAction = 'Yes',
}: ConfirmModalProps): Promise<boolean> {
  const cancelButton = createRef<HTMLElement | undefined>();
  const container = document.createElement('div');
  container.setAttribute('data-testid', 'confirm-container');

  // Ensure dialog appears above any existing content. The Z-index value here
  // is Good Enough™ for current usage.
  container.style.position = 'relative';
  container.style.zIndex = '10';

  document.body.appendChild(container);

  return new Promise(resolve => {
    const close = (result: boolean) => {
      render(null, container);
      container.remove();
      resolve(result);
    };

    render(
      <ModalDialog
        buttons={
          <>
            <Button
              elementRef={cancelButton}
              data-testid="cancel-button"
              onClick={() => close(false)}
            >
              Cancel
            </Button>
            <Button
              data-testid="confirm-button"
              variant="primary"
              onClick={() => close(true)}
            >
              {confirmAction}
            </Button>
          </>
        }
        initialFocus={cancelButton as RefObject<HTMLElement>}
        title={title}
        onClose={() => close(false)}
      >
        {message}
      </ModalDialog>,
      container
    );
  });
}
