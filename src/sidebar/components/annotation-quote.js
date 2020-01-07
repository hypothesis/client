import classnames from 'classnames';
import { createElement } from 'preact';
import propTypes from 'prop-types';

import { withServices } from '../util/service-context';
import { applyTheme } from '../util/theme';
import Excerpt from './excerpt';

/**
 * Display the selected text from the document associated with an annotation.
 */
function AnnotationQuote({ isOrphan, quote, settings = {} }) {
  return (
    <section
      className={classnames('annotation-quote', isOrphan && 'is-orphan')}
    >
      <Excerpt
        collapsedHeight={35}
        inlineControls={true}
        overflowThreshold={20}
      >
        <blockquote
          className="annotation-quote__quote"
          style={applyTheme(['selectionFontFamily'], settings)}
        >
          {quote}
        </blockquote>
      </Excerpt>
    </section>
  );
}

AnnotationQuote.propTypes = {
  /**
   * If `true`, display an indicator that the annotated text was not found in
   * the current version of the document.
   */
  isOrphan: propTypes.bool,

  /**
   * The text that the annotation refers to. This is rendered as plain text
   * (ie. HTML tags are rendered literally).
   */
  quote: propTypes.string,

  // Used for theming.
  settings: propTypes.object,
};

AnnotationQuote.injectedProps = ['settings'];

module.exports = withServices(AnnotationQuote);
