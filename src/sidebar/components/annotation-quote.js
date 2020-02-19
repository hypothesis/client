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
          dir="auto"
          lang={documentLanguage}
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
