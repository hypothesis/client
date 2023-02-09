import classnames from 'classnames';

import type { SidebarSettings } from '../../../types/config';
import { applyTheme } from '../../helpers/theme';
import { withServices } from '../../service-context';
import Excerpt from '../Excerpt';
import StyledText from '../StyledText';

type AnnotationQuoteProps = {
  quote: string;
  isHovered?: boolean;
  isOrphan?: boolean;
  settings: SidebarSettings;
};

/**
 * Display the selected text from the document associated with an annotation.
 */
function AnnotationQuote({
  quote,
  isHovered,
  isOrphan,
  settings,
}: AnnotationQuoteProps) {
  return (
    <Excerpt collapsedHeight={35} inlineControls={true} overflowThreshold={20}>
      <StyledText classes={classnames({ 'p-redacted-text': isOrphan })}>
        <blockquote
          className={classnames('hover:border-l-blue-quote', {
            'border-l-blue-quote': isHovered,
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
