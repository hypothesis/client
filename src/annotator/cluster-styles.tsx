import { render } from 'preact';

import ClusterToolbar from './components/ClusterToolbar';
import type {
  Destroyable,
  FeatureFlags as IFeatureFlags,
} from '../types/annotator';
import type { HighlightCluster } from '../types/shared';
import { createShadowRoot } from './util/shadow-root';

export type HighlightStyle = {
  color: string;
  decoration: string;
};

export type HighlightStyles = Record<string, HighlightStyle>;
export type AppliedStyles = Record<HighlightCluster, keyof HighlightStyles>;

// Available styles that users can apply to highlight clusters
export const highlightStyles: HighlightStyles = {
  hidden: {
    color: 'transparent',
    decoration: 'none',
  },
  green: {
    color: 'var(--hypothesis-color-green)',
    decoration: 'none',
  },
  orange: {
    color: 'var(--hypothesis-color-orange)',
    decoration: 'none',
  },
  pink: {
    color: 'var(--hypothesis-color-pink)',
    decoration: 'none',
  },
  purple: {
    color: 'var(--hypothesis-color-purple)',
    decoration: 'none',
  },
  yellow: {
    color: 'var(--hypothesis-color-yellow)',
    decoration: 'none',
  },
  grey: {
    color: 'var(--hypothesis-color-grey)',
    decoration: 'underline dotted',
  },
};

// The default styles applied to each highlight cluster. For now, this is
// hard-coded.
export const defaultStyles: AppliedStyles = {
  'other-content': 'yellow',
  'user-annotations': 'orange',
  'user-highlights': 'purple',
};

export class ClusterStyleController implements Destroyable {
  appliedStyles: AppliedStyles;
  private _element: HTMLElement;
  private _features: IFeatureFlags;
  private _outerContainer: HTMLElement;
  private _shadowRoot: ShadowRoot;

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
      top: 0,
      left: 0,
    });

    this.appliedStyles = defaultStyles;

    this._init();

    this._features.on('flagsChanged', () => {
      this._activate(this._isActive());
    });

    this._render();
  }

  destroy() {
    render(null, this._shadowRoot); // unload the Preact component
    this._activate(false); // De-activate cluster styling
    this._outerContainer.remove();
  }

  /**
   * Set initial values for :root CSS custom properties (variables) based on the
   * applied styles for each cluster. This has no effect if this feature
   * is not active.
   */
  _init() {
    (
      Object.keys(this.appliedStyles) as Array<keyof typeof this.appliedStyles>
    ).forEach(cluster => {
      this._setClusterStyle(cluster, this.appliedStyles[cluster]);
    });

    this._activate(this._isActive());
  }

  _isActive() {
    return this._features.flagEnabled('styled_highlight_clusters');
  }

  /**
   * Activate cluster highlighting if `active` is set.
   */
  _activate(active: boolean) {
    this._element?.classList?.toggle('hypothesis-highlights-clustered', active);
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

    (Object.keys(styleRules) as Array<keyof HighlightStyle>).forEach(
      ruleName => {
        document.documentElement.style.setProperty(
          `--hypothesis-${cluster}-${ruleName}`,
          styleRules[ruleName]
        );
      }
    );
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
        setClusterStyle={(cluster, styleName) =>
          this._onChangeClusterStyle(cluster, styleName)
        }
      />,
      this._shadowRoot
    );
  }
}
