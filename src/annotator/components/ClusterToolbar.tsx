import {
  Button,
  Card,
  CardContent,
  CaretDownIcon,
  CaretRightIcon,
  HideIcon,
  HighlightIcon,
} from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useCallback, useState } from 'preact/hooks';

import type { HighlightCluster } from '../../types/shared';
import type { AppliedStyles, HighlightStyles } from '../highlight-clusters';

type ClusterStyleControlProps = {
  cluster: HighlightCluster;
  label: string;
  onChange: (e: Event) => void;
  currentStyles: AppliedStyles;
  highlightStyles: HighlightStyles;
};

/**
 * Render controls for changing a single highlight cluster's style
 */
function ClusterStyleControl({
  cluster,
  label,
  onChange,
  currentStyles,
  highlightStyles,
}: ClusterStyleControlProps) {
  const appliedStyleName = currentStyles[cluster];
  const isHidden = appliedStyleName === 'transparent'; // This style is somewhat special
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-x-2 text-annotator-base">
        <div
          className="grow text-color-text px-2 py-1 rounded"
          style={{
            backgroundColor: highlightStyles[appliedStyleName].color,
          }}
        >
          {label}
        </div>
      </div>
      <div className="flex items-center gap-x-2">
        {Object.keys(highlightStyles).map(styleName => (
          <div className="relative" key={`${cluster}-${styleName}`}>
            <input
              className={classnames(
                // Position this atop its label and size it to the same dimensions
                'absolute w-6 h-6',
                // Make radio input visually hidden, but
                // some screen readers won't read out elements with 0 opacity
                'opacity-[.00001]',
                'cursor-pointer'
              )}
              name={cluster}
              id={`hypothesis-${cluster}-${styleName}`}
              checked={appliedStyleName === styleName}
              onChange={onChange}
              type="radio"
              value={styleName}
            />
            <label className="block" htmlFor={`${cluster}-${styleName}`}>
              <div
                style={{
                  backgroundColor: highlightStyles[styleName].color,
                }}
                className={classnames(
                  'block w-6 h-6 rounded-full flex items-center justify-center',
                  {
                    'border-2 border-slate-0': appliedStyleName !== styleName,
                    'border-2 border-slate-3': appliedStyleName === styleName,
                  }
                )}
              >
                {styleName === 'transparent' && (
                  <HideIcon
                    className={classnames('w-3 h-3', {
                      'text-slate-3': !isHidden,
                      'text-slate-7': isHidden,
                    })}
                  />
                )}
              </div>
              <span className="sr-only">{styleName}</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

export type ClusterToolbarProps = {
  /** Is cluster highlight styling active? Do not render the toolbar if not */
  active: boolean;
  availableStyles: HighlightStyles;
  currentStyles: AppliedStyles;
  onStyleChange: (cluster: HighlightCluster, styleName: string) => void;
};

/**
 * Render controls to change highlight-cluster styling.
 */
export default function ClusterToolbar({
  active,
  availableStyles,
  currentStyles,
  onStyleChange,
}: ClusterToolbarProps) {
  const handleStyleChange = useCallback(
    (changeEvent: Event) => {
      const input = changeEvent.target as HTMLInputElement;
      const cluster = input.name as HighlightCluster;
      const styleName = input.value;

      onStyleChange(cluster, styleName);
    },
    [onStyleChange]
  );

  const [isOpen, setOpen] = useState(false);

  if (!active) {
    return null;
  }

  return (
    <Card>
      <div className="flex flex-col text-annotator-base text-color-text">
        <Button
          data-testid="control-toggle-button"
          onClick={() => setOpen(!isOpen)}
          title={isOpen ? 'Hide highlight settings' : 'Show highlight settings'}
        >
          {isOpen ? (
            <>
              <CaretDownIcon />
              <span>Highlight Appearance</span>
            </>
          ) : (
            <>
              <CaretRightIcon />
              <HighlightIcon />
            </>
          )}
        </Button>
        {isOpen && (
          <CardContent data-testid="cluster-style-controls" size="sm">
            <ClusterStyleControl
              highlightStyles={availableStyles}
              label="My annotations"
              cluster="user-annotations"
              onChange={handleStyleChange}
              currentStyles={currentStyles}
            />
            <ClusterStyleControl
              highlightStyles={availableStyles}
              label="My highlights"
              cluster="user-highlights"
              onChange={handleStyleChange}
              currentStyles={currentStyles}
            />
            <ClusterStyleControl
              highlightStyles={availableStyles}
              label="Everybody's content"
              cluster="other-content"
              onChange={handleStyleChange}
              currentStyles={currentStyles}
            />
          </CardContent>
        )}
      </div>
    </Card>
  );
}
