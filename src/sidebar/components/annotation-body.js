'use strict';

const { createElement } = require('preact');
const propTypes = require('prop-types');

const Excerpt = require('./excerpt');
const MarkdownEditor = require('./markdown-editor');
const MarkdownView = require('./markdown-view');

/**
 * Display the rendered content of an annotation.
 */
function AnnotationBody({
  collapse,
  isEditing,
  isHiddenByModerator,
  hasContent,
  onCollapsibleChanged,
  onEditText,
  onToggleCollapsed,
  text,
}) {
  return (
    <section className="annotation-body">
      {!isEditing && (
        <Excerpt
          collapse={collapse}
          collapsedHeight={400}
          inlineControls={false}
          onCollapsibleChanged={onCollapsibleChanged}
          onToggleCollapsed={collapsed => onToggleCollapsed({ collapsed })}
          overflowHystersis={20}
        >
          <MarkdownView
            markdown={text}
            textClass={{
              'annotation-body is-hidden': isHiddenByModerator,
              'has-content': hasContent,
            }}
          />
        </Excerpt>
      )}
      {isEditing && <MarkdownEditor text={text} onEditText={onEditText} />}
    </section>
  );
}

AnnotationBody.propTypes = {
  collapse: propTypes.bool,
  hasContent: propTypes.bool,
  isEditing: propTypes.bool,
  isHiddenByModerator: propTypes.bool,
  onCollapsibleChanged: propTypes.func,
  onEditText: propTypes.func,
  onToggleCollapsed: propTypes.func,
  text: propTypes.string,
};

module.exports = AnnotationBody;
