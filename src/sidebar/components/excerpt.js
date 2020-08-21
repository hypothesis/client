import classnames from 'classnames';
import { createElement } from 'preact';
import { useCallback, useLayoutEffect, useRef, useState } from 'preact/hooks';
import propTypes from 'prop-types';

import observeElementSize from '../util/observe-element-size';
import { withServices } from '../util/service-context';
import { applyTheme } from '../util/theme';

/**
 * @typedef InlineControlsProps
 * @prop {boolean} isCollapsed
 * @prop {(collapsed: boolean) => any} setCollapsed
 * @prop {Object} [linkStyle]
 */

/**
 * An optional toggle link at the bottom of an excerpt which controls whether
 * it is expanded or collapsed.
 *
 * @param {InlineControlsProps} props
 */
function InlineControls({ isCollapsed, setCollapsed, linkStyle = {} }) {
  const toggleLabel = isCollapsed ? 'More' : 'Less';

  return (
    <div className="excerpt__inline-controls">
      <span className="excerpt__toggle-link">
        <button
          className="excerpt__toggle-button"
          onClick={() => setCollapsed(!isCollapsed)}
          aria-expanded={!isCollapsed}
          aria-label="Toggle visibility of full excerpt text"
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
 * @typedef ExcerptProps
 * @prop {Object} [children]
 * @prop {boolean} [inlineControls] - If `true`, the excerpt provides internal
 *   controls to expand and collapse the content. If `false`, the caller sets
 *   the collapsed state via the `collapse` prop.  When using inline controls,
 *   the excerpt is initially collapsed.
 * @prop {boolean} [collapse] - If the content should be truncated if its height
 *   exceeds `collapsedHeight + overflowThreshold`.  This prop is only used if
 *   `inlineControls` is false.
 * @prop {number} collapsedHeight - Maximum height of the container, in pixels,
 *   when it is collapsed.
 * @prop {number} [overflowThreshold] - An additional margin of pixels by which
 *   the content height can exceed `collapsedHeight` before it becomes collapsible.
 * @prop {(isCollapsible?: boolean) => any} [onCollapsibleChanged] - Called when the content height
 *   exceeds or falls below `collapsedHeight + overflowThreshold`.
 * @prop {(collapsed?: boolean) => any} [onToggleCollapsed] - When `inlineControls` is `false`, this
 *   function is called when the user requests to expand the content by clicking a
 *   zone at the bottom of the container.
 * @prop {Object} [settings] - Used for theming.
 */

/**
 * A container which truncates its content when they exceed a specified height.
 *
 * The collapsed state of the container can be handled either via internal
 * controls (if `inlineControls` is `true`) or by the caller using the
 * `collapse` prop.
 *
 * @param {ExcerptProps} props
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
  const contentElement = useRef(/** @type {HTMLDivElement|null} */ (null));

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

  /** @type {Object} */
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
  inlineControls: propTypes.bool,
  collapse: propTypes.bool,
  collapsedHeight: propTypes.number,
  overflowThreshold: propTypes.number,
  onCollapsibleChanged: propTypes.func,
  onToggleCollapsed: propTypes.func,
  settings: propTypes.object,
};

Excerpt.injectedProps = ['settings'];

export default withServices(Excerpt);
