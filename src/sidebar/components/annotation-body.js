import { createElement } from 'preact';
import propTypes from 'prop-types';

import Excerpt from './excerpt';
import MarkdownEditor from './markdown-editor';
import MarkdownView from './markdown-view';

/**
 * Display the rendered content of an annotation.
 */
export default function AnnotationBody({
  collapse,
  isEditing,
  isHiddenByModerator,
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
          overflowThreshold={20}
        >
          <MarkdownView
            markdown={text}
            textClass={{
              'annotation-body__text': true,
              'is-hidden': isHiddenByModerator,
              'has-content': text.length > 0,
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
   * Whether to limit the height of the annotation body.
   *
   * If this is true and the intrinsic height exceeds a fixed threshold, the
   * body is truncated. See `onCollapsibleChanged` and `onToggleCollapsed`.
   */
  collapse: propTypes.bool,

  /**
   * Whether to display the body in edit mode (if true) or view mode.
   */
  isEditing: propTypes.bool,

  /**
   * `true` if the contents of this annotation body have been redacted by
   * a moderator.
   *
   * For redacted annotations, the text is shown struck-through (if available)
   * or replaced by a placeholder indicating redacted content (if `text` is
   * empty).
   */
  isHiddenByModerator: propTypes.bool,

  /**
   * Callback invoked when the height of the rendered annotation body increases
   * above or falls below the threshold at which the `collapse` prop will affect
   * it.
   */
  onCollapsibleChanged: propTypes.func,

  /**
   * Callback invoked when the user edits the content of the annotation body.
   */
  onEditText: propTypes.func,

  /**
   * Callback invoked when the user clicks a shaded area at the bottom of a
   * truncated body to indicate that they want to see the rest of the content.
   */
  onToggleCollapsed: propTypes.func,

  /**
   * The markdown annotation body, which is either rendered as HTML (if `isEditing`
   * is false) or displayed in a text area otherwise.
   */
  text: propTypes.string,
};
