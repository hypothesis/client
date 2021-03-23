import { SvgIcon } from '@hypothesis/frontend-shared';

import { LabeledButton } from '../../shared/components/buttons';

/**
 * @typedef PanelProps
 * @prop {import("preact").ComponentChildren} children
 * @prop {string} [icon] - Name of optional icon to render in header
 * @prop {() => any} [onClose] - handler for closing the panel; if provided,
 *   will render a close button that invokes this onClick
 * @prop {string} title
 */

/**
 * Render a "panel"-like interface
 *
 * @param {PanelProps} props
 */
export default function Panel({ children, icon, onClose, title }) {
  const withCloseButton = typeof onClose === 'function';
  return (
    <div className="Panel">
      <div className="Panel__header">
        {icon && (
          <div className="Panel__header-icon">
            <SvgIcon name={icon} title={title} />
          </div>
        )}
        <h2 className="Panel__title u-stretch">{title}</h2>
        {withCloseButton && (
          <div>
            <LabeledButton icon="cancel" title="Close" onClick={onClose}>
              Close
            </LabeledButton>
          </div>
        )}
      </div>
      <div className="Panel__content">{children}</div>
    </div>
  );
}
