import classnames from 'classnames';
import { createElement } from 'preact';
import { useCallback, useLayoutEffect, useRef, useState } from 'preact/hooks';
import propTypes from 'prop-types';

import observeElementSize from '../util/observe-element-size';
import { withServices } from '../util/service-context';
import { applyTheme } from '../util/theme';

/**
 * An optional toggle link at the bottom of an excerpt which controls whether
 * it is expanded or collapsed.
 */
function InlineControls({ isCollapsed, setCollapsed, linkStyle = {} }) {
  const toggleLabel = isCollapsed ? 'More' : 'Less';

  return (
    <div className="excerpt__inline-controls">
      <span className="excerpt__toggle-link">
        <button
          className="excerpt__toggle-button"
          onClick={() => setCollapsed(!isCollapsed)}
          aria-label="Toggle to show the full excerpt or first few lines only"
          aria-pressed={(!isCollapsed).toString()}
          style={linkStyle}
        >
          {toggleLabel}
        </button>
      </span>
    </div>
  );
}

InlineControls.propTypes = {
  isCollapsed: propTypes.bool,
  setCollapsed: propTypes.func,
  linkStyle: propTypes.object,
};

const noop = () => {};

/**
 * A container which truncates its content when they exceed a specified height.
 *
 * The collapsed state of the container can be handled either via internal
 * controls (if `inlineControls` is `true`) or by the caller using the
 * `collapse` prop.
 */
function Excerpt({
  children,
  collapse = false,
  collapsedHeight,
  inlineControls = true,
  onCollapsibleChanged = noop,
  onToggleCollapsed = noop,
  overflowThreshold = 0,
  settings = {},
}) {
  const [collapsedByInlineControls, setCollapsedByInlineControls] = useState(
    true
  );

  // Container for the excerpt's content.
  const contentElement = useRef(null);

  // Measured height of `contentElement` in pixels.
  const [contentHeight, setContentHeight] = useState(0);

  // Update the measured height of the content after the initial render and
  // when the size of the content element changes.
  const updateContentHeight = useCallback(() => {
    const newContentHeight = contentElement.current.clientHeight;
    setContentHeight(newContentHeight);

    // prettier-ignore
    const isCollapsible =
      newContentHeight > (collapsedHeight + overflowThreshold);
    onCollapsibleChanged(isCollapsible);
  }, [collapsedHeight, onCollapsibleChanged, overflowThreshold]);

  useLayoutEffect(() => {
    const cleanup = observeElementSize(
      contentElement.current,
      updateContentHeight
    );
    updateContentHeight();
    return cleanup;
  }, [updateContentHeight]);

  // Render the (possibly truncated) content and controls for
  // expanding/collapsing the content.
  // prettier-ignore
  const isOverflowing = contentHeight > (collapsedHeight + overflowThreshold);
  const isCollapsed = inlineControls ? collapsedByInlineControls : collapse;
  const isExpandable = isOverflowing && isCollapsed;

  const contentStyle = {};
  if (contentHeight !== 0) {
    contentStyle['max-height'] = isExpandable ? collapsedHeight : contentHeight;
  }

  const setCollapsed = collapsed =>
    inlineControls
      ? setCollapsedByInlineControls(collapsed)
      : onToggleCollapsed(collapsed);

  return (
    <div className="excerpt" style={contentStyle}>
      <div className="excerpt__content" ref={contentElement}>
        {children}
      </div>
      <div
        role="presentation"
        onClick={() => setCollapsed(false)}
        className={classnames({
          excerpt__shadow: true,
          'excerpt__shadow--transparent': inlineControls,
          'is-hidden': !isExpandable,
        })}
        title="Show the full excerpt"
      />
      {isOverflowing && inlineControls && (
        <InlineControls
          isCollapsed={collapsedByInlineControls}
          setCollapsed={setCollapsed}
          linkStyle={applyTheme(['selectionFontFamily'], settings)}
        />
      )}
    </div>
  );
}

Excerpt.propTypes = {
  children: propTypes.object,

  /**
   * If `true`, the excerpt provides internal controls to expand and collapse
   * the content. If `false`, the caller sets the collapsed state via the
   * `collapse` prop.
   *
   * When using inline controls, the excerpt is initially collapsed.
   */
  inlineControls: propTypes.bool,

  /**
   * If the content should be truncated if its height exceeds
   * `collapsedHeight + overflowThreshold`.
   *
   * This prop is only used if `inlineControls` is false.
   */
  collapse: propTypes.bool,

  /**
   * Maximum height of the container, in pixels, when it is collapsed.
   */
  collapsedHeight: propTypes.number,

  /**
   * An additional margin of pixels by which the content height can exceed
   * `collapsedHeight` before it becomes collapsible.
   */
  overflowThreshold: propTypes.number,

  /**
   * Called when the content height exceeds or falls below `collapsedHeight + overflowThreshold`.
   */
  onCollapsibleChanged: propTypes.func,

  /**
   * When `inlineControls` is `false`, this function is called when the user
   * requests to expand the content by clicking a zone at the bottom of the
   * container.
   */
  onToggleCollapsed: propTypes.func,

  // Used for theming.
  settings: propTypes.object,
};

Excerpt.injectedProps = ['settings'];

export default withServices(Excerpt);
