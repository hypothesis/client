const classnames = require('classnames');
const { createElement } = require('preact');
const propTypes = require('prop-types');

const { isOrphan, quote } = require('../util/annotation-metadata');
const { withServices } = require('../util/service-context');
const { applyTheme } = require('../util/theme');

const Excerpt = require('./excerpt');

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

module.exports = withServices(AnnotationQuote);
