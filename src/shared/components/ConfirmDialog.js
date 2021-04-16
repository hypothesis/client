import { LabeledButton } from '@hypothesis/frontend-shared';

import Dialog from './Dialog';

/**
 * @typedef ConfirmDialogProps
 * @prop {string} title - Title of the dialog
 * @prop {string} message - Main text of the message
 * @prop {string} confirmAction - Label for the "Confirm" button
 * @prop {() => any} onConfirm - Callback invoked if the user clicks the "Confirm" button
 * @prop {() => any} onCancel - Callback invoked if the user cancels
 */

/**
 * A prompt asking the user to confirm an action.
 *
 * @param {ConfirmDialogProps} props
 */
export default function ConfirmDialog({
  title,
  message,
  confirmAction,
  onConfirm,
  onCancel,
}) {
  return (
    <Dialog
      title={title}
      onCancel={onCancel}
      buttons={[
        <LabeledButton key="ok" onClick={onConfirm} variant="primary">
          {confirmAction}
        </LabeledButton>,
      ]}
    >
      <p>{message}</p>
    </Dialog>
  );
}
