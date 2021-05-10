import {
  LabeledButton,
  useElementShouldClose,
} from '@hypothesis/frontend-shared';
import { Fragment } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import classNames from 'classnames';

let idCounter = 0;

/**
 * Return an element ID beginning with `prefix` that is unique per component instance.
 *
 * This avoids different instances of a component re-using the same ID.
 *
 * @param {string} prefix
 */
function useUniqueId(prefix) {
  const [id] = useState(() => {
    ++idCounter;
    return `${prefix}-${idCounter}`;
  });
  return id;
}

/**
 * @typedef {import("preact").ComponentChildren} Children
 *
 * @typedef DialogProps
 * @prop {Children} children - The content of the dialog.
 * @prop {import("preact/hooks").Ref<HTMLElement>} [initialFocus] -
 *   Child element to focus when the dialog is rendered.
 * @prop {Children} [buttons] -
 *   Additional `Button` elements to display at the bottom of the dialog.
 *   A "Cancel" button is added automatically if the `onCancel` prop is set.
 * @prop {string} [contentClass] - CSS class to apply to the dialog's content
 * @prop {'dialog'|'alertdialog'} [role] - The aria role for the dialog (defaults to" dialog")
 * @prop {string} title - The title of the dialog.
 * @prop {() => any} [onCancel] -
 *   A callback to invoke when the user cancels the dialog. If provided, a
 *   "Cancel" button will be displayed.
 * @prop {string} [cancelLabel] - Label for the cancel button
 */

/**
 * HTML control that can be disabled.
 *
 * @typedef {HTMLElement & { disabled: boolean }} InputElement
 */

/**
 * A modal dialog wrapper with a title. The wrapper sets initial focus to itself
 * unless an element inside of it is specified with the `initialFocus` ref.
 * Optional action buttons may be passed in with the `buttons` prop but the
 * cancel button is automatically generated when the on `onCancel` function is
 * passed.
 *
 * Canonical resources:
 *
 * https://www.w3.org/TR/wai-aria-practices/examples/dialog-modal/dialog.html
 * https://www.w3.org/TR/wai-aria-practices/examples/dialog-modal/alertdialog.html
 *
 * If the dialog's content, specified by the `children` prop, contains a paragraph
 * (`<p>`) element, that element will be identified as the dialog's accessible
 * description.
 *
 * @param {DialogProps} props
 */
export default function Dialog({
  children,
  contentClass,
  initialFocus,
  onCancel,
  cancelLabel = 'Cancel',
  role = 'dialog',
  title,
  buttons,
}) {
  const dialogTitleId = useUniqueId('dialog-title');
  const dialogDescriptionId = useUniqueId('dialog-description');

  const rootEl = useRef(/** @type {HTMLDivElement | null} */ (null));

  useElementShouldClose(rootEl, true, () => {
    if (onCancel) {
      onCancel();
    }
  });

  useEffect(() => {
    const focusEl = /** @type {InputElement|undefined} */ (
      initialFocus?.current
    );
    if (focusEl && !focusEl.disabled) {
      focusEl.focus();
    } else {
      // Modern accessibility guidance is to focus the dialog itself rather than
      // trying to be smart about focusing a particular control within the
      // dialog. See resources above.
      rootEl.current.focus();
    }
    // We only want to run this effect once when the dialog is mounted.
    //
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Try to assign the dialog an accessible description, using the content of
  // the first paragraph of text in it.
  //
  // A limitation of this approach is that it doesn't update if the dialog's
  // content changes after the initial render.
  useLayoutEffect(() => {
    const description = rootEl.current.querySelector('p');
    if (description) {
      description.id = dialogDescriptionId;
      rootEl.current.setAttribute('aria-describedby', dialogDescriptionId);
    }
  }, [dialogDescriptionId]);

  return (
    <Fragment>
      <div className="Dialog__background" />
      <div className="Dialog__container">
        <div
          tabIndex={-1}
          ref={rootEl}
          role={role}
          aria-labelledby={dialogTitleId}
          aria-modal={true}
          className={classNames('Dialog__content', contentClass)}
        >
          <h1 className="Dialog__title" id={dialogTitleId}>
            {title}
            <span className="u-stretch" />
            {onCancel && (
              <button
                aria-label="Close"
                className="Dialog__cancel-btn"
                onClick={onCancel}
              >
                ✕
              </button>
            )}
          </h1>
          {children}
          <div className="u-stretch" />
          <div className="Dialog__actions">
            {onCancel && (
              <LabeledButton icon="cancel" onClick={onCancel}>
                {cancelLabel}
              </LabeledButton>
            )}
            {buttons}
          </div>
        </div>
      </div>
    </Fragment>
  );
}
