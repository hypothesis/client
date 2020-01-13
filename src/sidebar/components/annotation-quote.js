import classnames from 'classnames';
import { createElement } from 'preact';
import propTypes from 'prop-types';

import { isOrphan, quote } from '../util/annotation-metadata';
import { withServices } from '../util/service-context';
import { applyTheme } from '../util/theme';

import Excerpt from './excerpt';

/**
 * Display the selected text from the document associated with an annotation.
 */
function AnnotationQuote({ annotation, settings = {} }) {
  return (
    <section
      className={classnames(
        'annotation-quote',
        isOrphan(annotation) && 'is-orphan'
      )}
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
          {quote(annotation)}
        </blockquote>
      </Excerpt>
    </section>
  );
}

AnnotationQuote.propTypes = {
  annotation: propTypes.object.isRequired,

  // Used for theming.
  settings: propTypes.object,
};

AnnotationQuote.injectedProps = ['settings'];

export default withServices(AnnotationQuote);
