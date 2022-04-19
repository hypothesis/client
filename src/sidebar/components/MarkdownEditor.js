import {
  Icon,
  IconButton,
  LabeledButton,
  Link,
  normalizeKeyName,
} from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import {
  LinkType,
  convertSelectionToLink,
  toggleBlockStyle,
  toggleSpanStyle,
} from '../markdown-commands';
import { isMacOS } from '../../shared/user-agent';
import { useArrowKeyNavigation } from '../../shared/keyboard-navigation';

import MarkdownView from './MarkdownView';

/**
 * @template T
 * @typedef {import('preact').RefObject<T>} Ref
 */

/**
 * @typedef {import("@hypothesis/frontend-shared/lib/components/Link").LinkProps} LinkProps
 * @typedef {import('preact').JSX.HTMLAttributes<HTMLTextAreaElement>} TextAreaAttributes
 * @typedef {import('../markdown-commands').EditorState} EditorState
 */

/**
 * Toolbar commands that modify the editor state. This excludes the Help link
 * and Preview buttons.
 *
 * @typedef {'bold'|
 *   'image'|
 *   'italic'|
 *   'link'|
 *   'list' |
 *   'math'|
 *   'numlist'|
 *   'quote'
 * } Command
 */

/**
 * Mapping of toolbar command name to key for Ctrl+<key> keyboard shortcuts.
 * The shortcuts are taken from Stack Overflow's editor.
 *
 * @type {Record<Command, string>}
 */
const SHORTCUT_KEYS = {
  bold: 'b',
  image: 'g',
  italic: 'i',
  link: 'l',
  list: 'u',
  math: 'm',
  numlist: 'o',
  quote: 'q',
};

/**
 * Apply a toolbar command to an editor input field.
 *
 * @param {Command} command
 * @param {HTMLInputElement|HTMLTextAreaElement} inputEl
 */
function handleToolbarCommand(command, inputEl) {
  /** @param {(prevState: EditorState) => EditorState} newStateFn */
  const update = newStateFn => {
    // Apply the toolbar command to the current state of the input field.
    const newState = newStateFn({
      text: inputEl.value,
      selectionStart: /** @type {number} */ (inputEl.selectionStart),
      selectionEnd: /** @type {number} */ (inputEl.selectionEnd),
    });

    // Update the input field to match the new state.
    inputEl.value = newState.text;
    inputEl.selectionStart = newState.selectionStart;
    inputEl.selectionEnd = newState.selectionEnd;

    // Restore input field focus which is lost when its contents are changed.
    inputEl.focus();
  };

  /** @param {EditorState} state */
  const insertMath = state => {
    const before = state.text.slice(0, state.selectionStart);
    if (
      before.length === 0 ||
      before.slice(-1) === '\n' ||
      before.slice(-2) === '$$'
    ) {
      return toggleSpanStyle(state, '$$', '$$', 'Insert LaTeX');
    } else {
      return toggleSpanStyle(state, '\\(', '\\)', 'Insert LaTeX');
    }
  };

  switch (command) {
    case 'bold':
      update(state => toggleSpanStyle(state, '**', '**', 'Bold'));
      break;
    case 'italic':
      update(state => toggleSpanStyle(state, '*', '*', 'Italic'));
      break;
    case 'quote':
      update(state => toggleBlockStyle(state, '> '));
      break;
    case 'link':
      update(state => convertSelectionToLink(state));
      break;
    case 'image':
      update(state => convertSelectionToLink(state, LinkType.IMAGE_LINK));
      break;
    case 'math':
      update(insertMath);
      break;
    case 'numlist':
      update(state => toggleBlockStyle(state, '1. '));
      break;
    case 'list':
      update(state => toggleBlockStyle(state, '* '));
      break;
    default:
      throw new Error(`Unknown toolbar command "${command}"`);
  }
}

/**
 * Style a Link to look like an IconButton, including touch sizing
 * affordances.
 *
 * @param {Omit<LinkProps, 'children'> & { icon: string }} props
 */
function IconLink({ classes, icon, linkRef, ...restProps }) {
  return (
    <Link
      classes={classnames(
        'flex justify-center items-center',
        'text-grey-7 hover:!text-grey-7',
        'touch:h-touch-minimum touch:w-touch-minimum',
        classes
      )}
      linkRef={linkRef}
      {...restProps}
    >
      <Icon classes="text-tiny touch:text-base" name={icon} />
    </Link>
  );
}

/**
 * @typedef ToolbarButtonProps
 * @prop {boolean} [disabled]
 * @prop {string} [iconName]
 * @prop {string} [label]
 * @prop {(e: MouseEvent) => void} onClick
 * @prop {string} [shortcutKey]
 * @prop {string} [title]
 */

/** @param {ToolbarButtonProps} props */
function ToolbarButton({
  disabled = false,
  iconName = '',
  label,
  onClick,
  shortcutKey,
  title = '',
}) {
  const modifierKey = useMemo(() => (isMacOS() ? 'Cmd' : 'Ctrl'), []);

  let tooltip = title;
  if (shortcutKey) {
    tooltip += ` (${modifierKey}-${shortcutKey.toUpperCase()})`;
  }

  const buttonProps = {
    disabled,
    icon: iconName,
    onClick,
    title: tooltip,
  };

  if (label) {
    return (
      <LabeledButton
        classes={classnames(
          'font-normal bg-transparent',
          // TODO: Refactor shared button styles to reduce specificity and make
          // this !important rule unnecessary
          'hover:!bg-transparent'
        )}
        {...buttonProps}
      >
        {label}
      </LabeledButton>
    );
  }
  return (
    <IconButton
      classes="px-2 py-2.5 text-tiny touch:text-base"
      {...buttonProps}
    />
  );
}

/**
 * @param {TextAreaAttributes & { classes?: string, containerRef?: Ref<HTMLTextAreaElement> }} props
 */
function TextArea({ classes, containerRef, ...restProps }) {
  return (
    <textarea
      className={classnames(
        'border rounded-sm p-2',
        'text-color-text-light bg-grey-0',
        'focus:bg-white focus:outline-none focus:shadow-focus-inner',
        classes
      )}
      {...restProps}
      ref={containerRef}
    />
  );
}

/**
 * @typedef ToolbarProps
 * @prop {boolean} isPreviewing - `true` if the editor's "Preview" mode is active.
 * @prop {(a: Command) => void} onCommand - Callback invoked when a toolbar button is clicked.
 * @prop {() => void} onTogglePreview - Callback invoked when the "Preview" toggle button is clicked.
 */

/**
 * An array of toolbar elements with a roving tab stop. Left and right
 * array keys can be used to change focus of the elements. Home and end
 * keys will navigate to the first and last elements respectively.
 *
 * Canonical example
 * https://www.w3.org/TR/wai-aria-practices/examples/toolbar/toolbar.html
 *
 * @param {ToolbarProps} props
 */
function Toolbar({ isPreviewing, onCommand, onTogglePreview }) {
  const toolbarContainer = useRef(null);
  useArrowKeyNavigation(toolbarContainer);

  return (
    <div
      className={classnames(
        // Allow buttons to wrap to second line if necessary.
        'flex flex-wrap w-full items-center',
        'p-1 border-x border-t rounded-t bg-white',
        // For touch interfaces, allow height to scale to larger button targets.
        // Don't wrap buttons but instead scroll horizontally. Add bottom
        // padding to provide some space for scrollbar.
        'touch:h-auto touch:overflow-x-scroll touch:flex-nowrap touch:pb-2.5'
      )}
      data-testid="markdown-toolbar"
      role="toolbar"
      aria-label="Markdown editor toolbar"
      ref={toolbarContainer}
    >
      <ToolbarButton
        disabled={isPreviewing}
        iconName="format-bold"
        onClick={() => onCommand('bold')}
        shortcutKey={SHORTCUT_KEYS.bold}
        title="Bold"
      />
      <ToolbarButton
        disabled={isPreviewing}
        iconName="format-italic"
        onClick={() => onCommand('italic')}
        shortcutKey={SHORTCUT_KEYS.italic}
        title="Italic"
      />
      <ToolbarButton
        disabled={isPreviewing}
        iconName="format-quote"
        onClick={() => onCommand('quote')}
        shortcutKey={SHORTCUT_KEYS.quote}
        title="Quote"
      />
      <ToolbarButton
        disabled={isPreviewing}
        iconName="link"
        onClick={() => onCommand('link')}
        shortcutKey={SHORTCUT_KEYS.link}
        title="Insert link"
      />
      <ToolbarButton
        disabled={isPreviewing}
        iconName="image"
        onClick={() => onCommand('image')}
        shortcutKey={SHORTCUT_KEYS.image}
        title="Insert image"
      />
      <ToolbarButton
        disabled={isPreviewing}
        iconName="format-functions"
        onClick={() => onCommand('math')}
        title="Insert math (LaTeX is supported)"
      />
      <ToolbarButton
        disabled={isPreviewing}
        iconName="format-list-numbered"
        onClick={() => onCommand('numlist')}
        shortcutKey={SHORTCUT_KEYS.numlist}
        title="Numbered list"
      />
      <ToolbarButton
        disabled={isPreviewing}
        iconName="format-list-unordered"
        onClick={() => onCommand('list')}
        shortcutKey={SHORTCUT_KEYS.list}
        title="Bulleted list"
      />
      <div className="grow flex justify-end">
        <IconLink
          classes={classnames(
            // Adjust padding to make element a little taller than wide
            // This matches ToolbarButton styling
            'px-2 py-2.5'
          )}
          href="https://web.hypothes.is/help/formatting-annotations-with-markdown/"
          icon="help"
          target="_blank"
          title="Formatting help"
          aria-label="Formatting help"
        />
        <ToolbarButton
          label={isPreviewing ? 'Write' : 'Preview'}
          onClick={onTogglePreview}
        />
      </div>
    </div>
  );
}

/**
 * @typedef MarkdownEditorProps
 * @prop {string} label - An accessible label for the input field.
 * @prop {Record<string,string>} [textStyle] -
 *   Additional CSS properties to apply to the input field and rendered preview
 * @prop {string} [text] - The markdown text to edit.
 * @prop {(text: string) => void} [onEditText]
 *   - Callback invoked with `{ text }` object when user edits text.
 *   TODO: Simplify this callback to take just a string rather than an object once the
 *   parent component is converted to Preact.
 */

/**
 * Viewer/editor for the body of an annotation in markdown format.
 *
 * @param {MarkdownEditorProps} props
 */
export default function MarkdownEditor({
  label = '',
  onEditText = () => {},
  text = '',
  textStyle = {},
}) {
  // Whether the preview mode is currently active.
  const [preview, setPreview] = useState(false);

  // The input element where the user inputs their comment.
  const input = useRef(/** @type {HTMLTextAreaElement|null} */ (null));

  useEffect(() => {
    if (!preview) {
      input.current?.focus();
    }
  }, [preview]);

  const togglePreview = () => setPreview(!preview);

  /** @param {Command} command */
  const handleCommand = command => {
    if (input.current) {
      handleToolbarCommand(command, input.current);
      onEditText(input.current.value);
    }
  };

  /** @param {KeyboardEvent} event */
  const handleKeyDown = event => {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    for (let [command, key] of Object.entries(SHORTCUT_KEYS)) {
      if (key === normalizeKeyName(event.key)) {
        event.stopPropagation();
        event.preventDefault();
        handleCommand(/** @type {Command} */ (command));
      }
    }
  };

  return (
    <div className="leading-none">
      <Toolbar
        onCommand={handleCommand}
        isPreviewing={preview}
        onTogglePreview={togglePreview}
      />
      {preview ? (
        <MarkdownView
          markdown={text}
          classes="border bg-grey-1 p-2"
          style={textStyle}
        />
      ) : (
        <TextArea
          aria-label={label}
          dir="auto"
          classes={classnames(
            'w-full min-h-[8em] resize-y',
            // Turn off border-radius on top edges to align with toolbar above
            'rounded-t-none',
            // Larger font on touch devices
            'text-base touch:text-touch-base'
          )}
          containerRef={input}
          onClick={e => e.stopPropagation()}
          onKeyDown={handleKeyDown}
          onInput={e =>
            onEditText(/** @type {HTMLTextAreaElement} */ (e.target).value)
          }
          value={text}
          style={textStyle}
        />
      )}
    </div>
  );
}
