import { render } from 'preact';

import type {
  Destroyable,
  FeatureFlags as IFeatureFlags,
} from '../types/annotator';
import type { HighlightCluster } from '../types/shared';
import ClusterToolbar from './components/ClusterToolbar';
import { updateClusters } from './highlighter';
import { createShadowRoot } from './util/shadow-root';

export type HighlightStyle = {
  color: string;
  secondColor: string;
  thirdColor: string;
};

export type HighlightStyles = Record<string, HighlightStyle>;
export type AppliedStyles = Record<HighlightCluster, keyof HighlightStyles>;

// Available styles that users can apply to highlight clusters
export const highlightStyles: HighlightStyles = {
  transparent: {
    color: 'transparent',
    secondColor: 'transparent',
    thirdColor: 'transparent',
  },
  pink: {
    color: 'var(--hypothesis-color-pink)',
    secondColor: 'var(--hypothesis-color-pink-1)',
    thirdColor: 'var(--hypothesis-color-pink-2)',
  },
  orange: {
    color: 'var(--hypothesis-color-orange)',
    secondColor: 'var(--hypothesis-color-orange-1)',
    thirdColor: 'var(--hypothesis-color-orange-2)',
  },
  yellow: {
    color: 'var(--hypothesis-color-yellow)',
    secondColor: 'var(--hypothesis-color-yellow-1)',
    thirdColor: 'var(--hypothesis-color-yellow-2)',
  },
  green: {
    color: 'var(--hypothesis-color-green)',
    secondColor: 'var(--hypothesis-color-green-1)',
    thirdColor: 'var(--hypothesis-color-green-2)',
  },
  purple: {
    color: 'var(--hypothesis-color-purple)',
    secondColor: 'var(--hypothesis-color-purple-1)',
    thirdColor: 'var(--hypothesis-color-purple-2)',
  },
  grey: {
    color: 'var(--hypothesis-color-grey)',
    secondColor: 'var(--hypothesis-color-grey-1)',
    thirdColor: 'var(--hypothesis-color-grey-2)',
  },
};

// The default styles applied to each highlight cluster. For now, this is
// hard-coded.
export const defaultClusterStyles: AppliedStyles = {
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

    this.appliedStyles = defaultClusterStyles;

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
   * Indicate that the set of highlights in the document has been dirtied and we
   * should schedule an update to highlight data attributes and stacking order.
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
      this._setClusterStyles(cluster, this.appliedStyles[cluster]);
    }

    this._activate(this._isActive());
  }

  _updateClusters() {
    if (!this._isActive()) {
      /* istanbul ignore next */
      return;
    }
    updateClusters(this._element);
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
   * Set a value for an individual CSS variable at :root
   */
  _setClusterStyle(key: string, value: string) {
    document.documentElement.style.setProperty(key, value);
  }

  /**
   * Set CSS variables for the highlight `cluster` to apply the
   * {@link HighlightStyle} `highlightStyles[styleName]`
   */
  _setClusterStyles(
    cluster: HighlightCluster,
    styleName: keyof typeof highlightStyles
  ) {
    const styleRules = highlightStyles[styleName];

    for (const ruleName of Object.keys(styleRules) as Array<
      keyof HighlightStyle
    >) {
      this._setClusterStyle(
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
    this._setClusterStyles(cluster, styleName);
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
