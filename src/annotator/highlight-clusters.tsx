import { render } from 'preact';

import type {
  Destroyable,
  FeatureFlags as IFeatureFlags,
} from '../types/annotator';
import type { HighlightCluster } from '../types/shared';

import ClusterToolbar from './components/ClusterToolbar';
import { createShadowRoot } from './util/shadow-root';

import type { HighlightElement } from './highlighter';

export type HighlightStyle = {
  color: string;
  'color-1': string;
  'color-2': string;
};

export type HighlightStyles = Record<string, HighlightStyle>;
export type AppliedStyles = Record<HighlightCluster, keyof HighlightStyles>;

// Available styles that users can apply to highlight clusters
export const highlightStyles: HighlightStyles = {
  hidden: {
    color: 'transparent',
    ['color-1']: 'transparent',
    ['color-2']: 'transparent',
  },
  green: {
    color: 'var(--hypothesis-color-green)',
    ['color-1']: 'var(--hypothesis-color-green-1)',
    ['color-2']: 'var(--hypothesis-color-green-2)',
  },
  orange: {
    color: 'var(--hypothesis-color-orange)',
    ['color-1']: 'var(--hypothesis-color-orange-1)',
    ['color-2']: 'var(--hypothesis-color-orange-2)',
  },
  pink: {
    color: 'var(--hypothesis-color-pink)',
    ['color-1']: 'var(--hypothesis-color-pink-1)',
    ['color-2']: 'var(--hypothesis-color-pink-2)',
  },
  purple: {
    color: 'var(--hypothesis-color-purple)',
    ['color-1']: 'var(--hypothesis-color-purple-1)',
    ['color-2']: 'var(--hypothesis-color-purple-2)',
  },
  yellow: {
    color: 'var(--hypothesis-color-yellow)',
    ['color-1']: 'var(--hypothesis-color-yellow-1)',
    ['color-2']: 'var(--hypothesis-color-yellow-2)',
  },
  blue: {
    color: 'var(--hypothesis-color-blue)',
    ['color-1']: 'var(--hypothesis-color-blue-1)',
    ['color-2']: 'var(--hypothesis-color-blue-2)',
  },
};

// The default styles applied to each highlight cluster. For now, this is
// hard-coded.
export const defaultStyles: AppliedStyles = {
  'other-content': 'yellow',
  'user-annotations': 'orange',
  'user-highlights': 'purple',
};

export class HighlightClusterController implements Destroyable {
  appliedStyles: AppliedStyles;
  private _element: HTMLElement;
  private _features: IFeatureFlags;
  private _outerContainer: HTMLElement;
  private _shadowRoot: ShadowRoot;
  private _updateTimeout?: number;

  constructor(element: HTMLElement, options: { features: IFeatureFlags }) {
    this._element = element;
    this._features = options.features;

    this._outerContainer = document.createElement(
      'hypothesis-highlight-cluster-toolbar'
    );
    this._element.appendChild(this._outerContainer);
    this._shadowRoot = createShadowRoot(this._outerContainer);

    // For now, the controls are fixed at top-left of screen. This is temporary.
    Object.assign(this._outerContainer.style, {
      position: 'fixed',
      top: `${this._element.offsetTop + 4}px`,
      left: '4px',
    });

    this.appliedStyles = defaultStyles;

    this._init();

    this._features.on('flagsChanged', () => {
      this._activate(this._isActive());
    });

    this._render();
  }

  destroy() {
    clearTimeout(this._updateTimeout);
    render(null, this._shadowRoot); // unload the Preact component
    this._activate(false); // De-activate cluster styling
    this._outerContainer.remove();
  }

  /**
   * Indicate that we need to update the nesting-related data attributes on all
   * highlight elements in the document (<hypothesis-highlight> and
   * SVG rect.hypothesis-svg-highlight elements)
   */
  scheduleClusterUpdates() {
    clearTimeout(this._updateTimeout);
    this._updateTimeout = setTimeout(() => this._updateClusters(), 100);
  }

  /**
   * Set initial values for :root CSS custom properties (variables) based on the
   * applied styles for each cluster. This has no effect if this feature
   * is not active.
   */
  _init() {
    for (const cluster of Object.keys(this.appliedStyles) as Array<
      keyof typeof this.appliedStyles
    >) {
      this._setClusterStyle(cluster, this.appliedStyles[cluster]);
    }

    this._activate(this._isActive());
  }

  /**
   * Update highlight elements — <hypothesis-highlight> elements and SVG <rect>s
   * with data about their nesting depth, and order SVG <rect>s such that
   * inner (nested) highlights are stacked on top of outer highlights.
   */
  _updateClusters() {
    if (!this._isActive()) {
      return;
    }

    const outerHighlights = Array.from(
      this._element.getElementsByTagName('HYPOTHESIS-HIGHLIGHT')
    ).filter(
      highlight => highlight.parentElement?.tagName !== 'HYPOTHESIS-HIGHLIGHT'
    );

    this._updateHighlightData(outerHighlights as HighlightElement[]);
  }

  /**
   * Walk a tree of <hypothesis-highlight> elements, adding `data-nesting-level`
   * and `data-cluster-level` data attributes to <hypothesis-highlight>s and
   * their associated SVG highlight (<rect>) elements.
   *
   * - `data-nesting-level` - generational depth of the applicable
   *   `<hypothesis-highlight>` relative to outermost `<hypothesis-highlight>`.
   * - `data-cluster-level` - number of `<hypothesis-highlight>` generations
   *   since the cluster value changed.
   *
   * @param highlightEls - A collection of sibling <hypothesis-highlight>
   * elements
   * @param parentCluster - The cluster value of the parent highlight to
   * `highlightEls`, if any
   * @param nestingLevel - The nesting "level", relative to the outermost
   * <hypothesis-highlight> element (0-based)
   * @param parentClusterLevel - The parent's nesting depth, per its cluster
   * value (`parentCluster`). i.e. How many levels since the cluster value
   * changed? This allows for nested styling of highlights of the same cluster
   * value.
   */
  _updateHighlightData(
    highlightEls: HighlightElement[],
    parentCluster = '',
    nestingLevel = 0,
    parentClusterLevel = 0
  ) {
    Array.from(highlightEls).forEach(hEl => {
      const elCluster =
        ['user-annotations', 'user-highlights', 'other-content'].find(
          candidate => hEl.classList.contains(candidate)
        ) ?? 'other-content';

      const elClusterLevel =
        parentCluster && elCluster === parentCluster
          ? parentClusterLevel + 1
          : 0;

      hEl.setAttribute('data-nesting-level', `${nestingLevel}`);
      hEl.setAttribute('data-cluster-level', `${elClusterLevel}`);

      if (hEl.svgHighlight) {
        hEl.svgHighlight.setAttribute('data-nesting-level', `${nestingLevel}`);
        hEl.svgHighlight.setAttribute(
          'data-cluster-level',
          `${elClusterLevel}`
        );
      }

      this._updateHighlightData(
        Array.from(hEl.children).filter(
          el => el.tagName === 'HYPOTHESIS-HIGHLIGHT'
        ) as HighlightElement[],
        elCluster,
        nestingLevel + 1,
        elClusterLevel
      );
    });
  }
  }

  _isActive() {
    return this._features.flagEnabled('styled_highlight_clusters');
  }

  /**
   * Activate cluster highlighting if `active` is set.
   */
  _activate(active: boolean) {
    this._element.classList.toggle('hypothesis-highlights-clustered', active);
    this._render();
  }

  /**
   * Set CSS variables for the highlight `cluster` to apply the
   * {@link HighlightStyle} `highlightStyles[styleName]`
   */
  _setClusterStyle(
    cluster: HighlightCluster,
    styleName: keyof typeof highlightStyles
  ) {
    const styleRules = highlightStyles[styleName];

    for (const ruleName of Object.keys(styleRules) as Array<
      keyof HighlightStyle
    >) {
      document.documentElement.style.setProperty(
        `--hypothesis-${cluster}-${ruleName}`,
        styleRules[ruleName] as string
      );
    }
  }

  /**
   * Respond to user input to change the applied style for a cluster
   */
  _onChangeClusterStyle(
    cluster: HighlightCluster,
    styleName: keyof typeof highlightStyles
  ) {
    this.appliedStyles[cluster] = styleName;
    this._setClusterStyle(cluster, styleName);
    this._render();
  }

  _render() {
    render(
      <ClusterToolbar
        active={this._isActive()}
        availableStyles={highlightStyles}
        currentStyles={this.appliedStyles}
        onStyleChange={(cluster, styleName) =>
          this._onChangeClusterStyle(cluster, styleName)
        }
      />,
      this._shadowRoot
    );
  }
}
