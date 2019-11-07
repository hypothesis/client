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
  /**
   * Whether to limit the height of the annotation body if it is tall.
   */
  collapse: propTypes.bool,

  /**
   * If the
   */
  hasContent: propTypes.bool,

  /**
   * Whether to display the body in edit mode (if true) or view mode.
   */
  isEditing: propTypes.bool,

  /**
   * `true` if the contents of this annotation body have been redacted by
   * a moderator.
   */
  isHiddenByModerator: propTypes.bool,

  /**
   * Callback invoked when the height of the rendered annotation body increases
   * above or falls below the threshold at which the `collapse` prop will affect
   * it.
   */
  onCollapsibleChanged: propTypes.func,

  /**
   * Callback invoked when the user edits the content of the annotation body
   * when `isEditing` is true.
   */
  onEditText: propTypes.func,

  /**
   * Callback invoked when the user clicks a space in a truncated annotation
   * body to indicate that they want to see the rest of the content.
   */
  onToggleCollapsed: propTypes.func,

  /**
   * The markdown annotation body, which is either rendered as HTML (if `isEditing`
   * is false) or displayed in a text area otherwise.
   */
  text: propTypes.string,
};

module.exports = AnnotationBody;
