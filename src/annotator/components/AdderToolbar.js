import classnames from 'classnames';
import { LabeledButton, Icon } from '@hypothesis/frontend-shared';

import { useShortcut } from '../../shared/shortcut';

/**
 * Render an inverted light-on-dark "pill" with the given `badgeCount`
 * (annotation count). This is rendered instead of an icon on the toolbar
 * button for "show"-ing associated annotations for the current selection.
 *
 * @param {object} props
 *  @param {number} props.badgeCount
 */
function NumberIcon({ badgeCount }) {
  return (
    <span
      className={classnames(
        'rounded px-1 py-0.5',
        'text-color-text-inverted font-bold bg-grey-7',
        'dim-bg'
      )}
    >
      {badgeCount}
    </span>
  );
}

/**
 * Render an arrow pointing up or down from the AdderToolbar. This arrow
 * should point roughly to the end of the user selection in the document.
 *
 * @param {object} props
 *  @param {'up'|'down'} props.arrowDirection
 */
function AdderToolbarArrow({ arrowDirection }) {
  return (
    <Icon
      name="pointer"
      classes={classnames(
        // Position the arrow in the horizontal center at the bottom of the
        // container (toolbar). Note: the arrow is pointing up at this point.
        'absolute left-1/2 -translate-x-1/2',
        // Override `1em` width/height rules in `Icon` to size the arrow as
        // its SVG dimensions dictate
        'h-auto w-auto z-2',
        'text-grey-3 fill-white',
        {
          // Down arrow: transform to point the arrow down
          'rotate-180': arrowDirection === 'down',
          // Up arrow: position vertically above the toolbar
          'top-0 -translate-y-full': arrowDirection === 'up',
        }
      )}
    />
  );
}

/**
 * @param {object} props
 *  @param {number} [props.badgeCount]
 *  @param {string} [props.icon]
 *  @param {string} props.label
 *  @param {() => any} props.onClick
 *  @param {string|null} props.shortcut
 */
function ToolbarButton({ badgeCount, icon, label, onClick, shortcut }) {
  useShortcut(shortcut, onClick);

  const title = shortcut ? `${label} (${shortcut})` : label;

  return (
    <LabeledButton
      className={classnames(
        'flex flex-col gap-y-1 items-center py-2.5 px-2',
        'text-annotator-sm leading-none text-grey-7',
        'transition-colors duration-200',
        'dim-item'
      )}
      onClick={onClick}
      title={title}
    >
      {icon && <Icon classes="text-annotator-lg" name={icon} title={title} />}
      {typeof badgeCount === 'number' && <NumberIcon badgeCount={badgeCount} />}
      <span className="font-normal">{label}</span>
    </LabeledButton>
  );
}

/**
 * Union of possible toolbar commands.
 *
 * @typedef {'annotate'|'highlight'|'show'|'hide'} Command
 */

/**
 * @typedef AdderToolbarProps
 * @prop {'up'|'down'} arrowDirection -
 *   Whether the arrow pointing out of the toolbar towards the selected text
 *   should appear above the toolbar pointing Up or below the toolbar pointing
 *   Down.
 * @prop {boolean} isVisible - Whether to show the toolbar or not.
 * @prop {(c: Command) => any} onCommand - Called when a toolbar button is clicked.
 * @prop {number} [annotationCount] -
 *   Number of annotations associated with the selected text.
 *   If non-zero, a "Show" button is displayed to allow the user to see the
 *   annotations that correspond to the selection.
 */

/**
 * The toolbar that is displayed above or below selected text in the document,
 * providing options to create annotations or highlights.
 *
 * @param {AdderToolbarProps} props
 */
export default function AdderToolbar({
  arrowDirection,
  isVisible,
  onCommand,
  annotationCount = 0,
}) {
  // Since the selection toolbar is only shown when there is a selection
  // of static text, we can use a plain key without any modifier as
  // the shortcut. This avoids conflicts with browser/OS shortcuts.
  const annotateShortcut = isVisible ? 'a' : null;
  const highlightShortcut = isVisible ? 'h' : null;
  const showShortcut = isVisible ? 's' : null;
  const hideShortcut = isVisible ? 'Escape' : null;

  // Add a shortcut to close the adder. Note, there is no button associated with this
  // shortcut because any outside click will also hide the adder.
  useShortcut(hideShortcut, () => onCommand('hide'));

  // nb. The adder is hidden using the `visibility` property rather than `display`
  // so that we can compute its size in order to position it before display.
  return (
    <div
      className={classnames(
        'AdderToolbar',
        'absolute select-none bg-white rounded shadow-adderToolbar',
        // Because `.AdderToolbar` rules reset `all:initial`, we cannot use
        // default border values from Tailwind and have to be explicit about
        // all border attributes
        'border border-solid border-grey-3',
        // Start at a very low opacity as we're going to fade in in the animation
        'opacity-5',
        {
          'animate-adderPopUp': arrowDirection === 'up' && isVisible,
          'animate-adderPopDown': arrowDirection === 'down' && isVisible,
        }
      )}
      dir="ltr"
      style={{
        visibility: isVisible ? 'visible' : 'hidden',
      }}
    >
      <div className="flex dim-items-on-hover">
        <ToolbarButton
          icon="annotate"
          onClick={() => onCommand('annotate')}
          label="Annotate"
          shortcut={annotateShortcut}
        />
        <ToolbarButton
          icon="highlight"
          onClick={() => onCommand('highlight')}
          label="Highlight"
          shortcut={highlightShortcut}
        />
        {annotationCount > 0 && (
          <>
            <div
              className={classnames(
                // Style a vertical separator line
                'm-1.5 border-r border-grey-4 border-solid'
              )}
            />
            <ToolbarButton
              badgeCount={annotationCount}
              onClick={() => onCommand('show')}
              label="Show"
              shortcut={showShortcut}
            />
          </>
        )}
      </div>
      <AdderToolbarArrow arrowDirection={arrowDirection} />
    </div>
  );
}
