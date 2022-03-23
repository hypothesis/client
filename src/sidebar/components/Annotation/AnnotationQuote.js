import classnames from 'classnames';

import { withServices } from '../../service-context';
import { applyTheme } from '../../helpers/theme';

import Excerpt from '../Excerpt';

/**
 * @typedef {import('../../../types/api').Annotation} Annotation
 * @typedef {import('../../../types/config').SidebarSettings} SidebarSettings
 */

/**
 * Style content as quoted text
 *
 * @param {object} props
 *   @param {import('preact').ComponentChildren} props.children
 *   @param {string} [props.classes] - Additional CSS classes
 *   @param {object} [props.style] - Inline style object
 */
function QuotedText({ children, classes, style }) {
  // The language for the quote may be different than the client's UI (set by
  // `<html lang="...">`).
  //
  // Use a blank string to indicate that it is unknown and it is up to the user
  // agent to pick a default or analyze the content and guess.
  //
  // For web documents we could do better here and gather language information
  // as part of the annotation anchoring process.
  const documentLanguage = '';

  return (
    <blockquote
      className={classnames(
        'border-l-[3px] border-grey-3 hover:border-l-blue-quote',
        'italic text-color-text-light px-[1em]',
        classes
      )}
      dir="auto"
      lang={documentLanguage}
      style={style}
    >
      {children}
    </blockquote>
  );
}

/**
 * @typedef AnnotationQuoteProps
 * @prop {string} quote
 * @prop {boolean} [isFocused] - Is this annotation currently focused?
 * @prop {boolean} [isOrphan]
 * @prop {SidebarSettings} [settings] - Used for theming.
 */

/**
 * Display the selected text from the document associated with an annotation.
 *
 * @parm {AnnotationQuoteProps} props
 */
function AnnotationQuote({ quote, isFocused, isOrphan, settings = {} }) {
  return (
    <Excerpt collapsedHeight={35} inlineControls={true} overflowThreshold={20}>
      <QuotedText
        classes={classnames({
          'border-l-blue-quote': isFocused,
          'line-through grayscale contrast-50': isOrphan,
        })}
        style={applyTheme(['selectionFontFamily'], settings)}
      >
        {quote}
      </QuotedText>
    </Excerpt>
  );
}

export default withServices(AnnotationQuote, ['settings']);
