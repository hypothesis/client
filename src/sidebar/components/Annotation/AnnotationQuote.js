import classnames from 'classnames';

import { withServices } from '../../service-context';
import { applyTheme } from '../../helpers/theme';

import Excerpt from '../Excerpt';
import StyledText from '../StyledText';

/**
 * @typedef {import('../../../types/config').SidebarSettings} SidebarSettings
 */

/**
 * @typedef AnnotationQuoteProps
 * @prop {string} quote
 * @prop {boolean} [isFocused]
 * @prop {boolean} [isOrphan]
 * @prop {SidebarSettings} settings
 */

/**
 * Display the selected text from the document associated with an annotation.
 *
 * @param {AnnotationQuoteProps} props
 */
function AnnotationQuote({ quote, isFocused, isOrphan, settings }) {
  return (
    <Excerpt collapsedHeight={35} inlineControls={true} overflowThreshold={20}>
      <StyledText classes={classnames({ 'p-redacted-text': isOrphan })}>
        <blockquote
          className={classnames('hover:border-l-blue-quote', {
            'border-l-blue-quote': isFocused,
          })}
          style={applyTheme(['selectionFontFamily'], settings)}
        >
          {quote}
        </blockquote>
      </StyledText>
    </Excerpt>
  );
}

export default withServices(AnnotationQuote, ['settings']);
