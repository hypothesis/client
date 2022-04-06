import {
  Icon,
  IconButton,
  LabeledButton,
  Link,
  normalizeKeyName,
} from '@hypothesis/frontend-shared';
import { createRef } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import {
  LinkType,
  convertSelectionToLink,
  toggleBlockStyle,
  toggleSpanStyle,
} from '../markdown-commands';
import { isMacOS } from '../../shared/user-agent';

import MarkdownView from './MarkdownView';
import classnames from 'classnames';

// Mapping of toolbar command name to key for Ctrl+<key> keyboard shortcuts.
// The shortcuts are taken from Stack Overflow's editor.
const SHORTCUT_KEYS = {
  bold: 'b',
  italic: 'i',
  link: 'l',
  quote: 'q',
  image: 'g',
  numlist: 'o',
  list: 'u',
};

/**
 * Apply a toolbar command to an editor input field.
 *
 * @param {string} command
 * @param {HTMLInputElement|HTMLTextAreaElement} inputEl
 */
function handleToolbarCommand(command, inputEl) {
  const update = newStateFn => {
    // Apply the toolbar command to the current state of the input field.
    const newState = newStateFn({
      text: inputEl.value,
      selectionStart: inputEl.selectionStart,
      selectionEnd: inputEl.selectionEnd,
    });

    // Update the input field to match the new state.
    inputEl.value = newState.text;
    inputEl.selectionStart = newState.selectionStart;
    inputEl.selectionEnd = newState.selectionEnd;

    // Restore input field focus which is lost when its contents are changed.
    inputEl.focus();
  };

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
 * @typedef {import("@hypothesis/frontend-shared/lib/components/Link").LinkProps} LinkProps
 *
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
 * @prop {object} buttonRef
 * @prop {boolean} [disabled]
 * @prop {string} [iconName]
 * @prop {string} [label]
 * @prop {(e: MouseEvent) => void} onClick
 * @prop {string} [shortcutKey]
 * @prop {number} tabIndex
 * @prop {string} [title]
 */

/** @param {ToolbarButtonProps} props */
function ToolbarButton({
  buttonRef,
  disabled = false,
  iconName = '',
  label,
  onClick,
  shortcutKey,
  tabIndex,
  title = '',
}) {
  const modifierKey = useMemo(() => (isMacOS() ? 'Cmd' : 'Ctrl'), []);

  let tooltip = title;
  if (shortcutKey) {
    tooltip += ` (${modifierKey}-${shortcutKey.toUpperCase()})`;
  }

  const buttonProps = {
    buttonRef,
    disabled,
    icon: iconName,
    onClick,
    tabIndex,
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
 * @typedef {'bold'|'italic'|'quote'|'link'|'image'|'math'|'numlist'|'list'|'preview'|'help'} ButtonID
 */

/**
 * @typedef {import('preact').Ref<HTMLTextAreaElement>} TextAreaRef
 * @typedef {import('preact').JSX.HTMLAttributes<HTMLTextAreaElement>} TextAreaAttributes
 *
 * @param {TextAreaAttributes & { classes?: string, containerRef?: TextAreaRef }} props
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
 * @prop {(a: ButtonID) => any} onCommand - Callback invoked with the selected command when a toolbar button is clicked.
 * @prop {() => any} onTogglePreview - Callback invoked when the "Preview" toggle button is clicked.
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
  const buttonIds = {
    // Ordered buttons
    bold: 0,
    italic: 1,
    quote: 2,
    link: 3,
    image: 4,
    math: 5,
    numlist: 6,
    list: 7,
    help: 8,
    preview: 9,

    // Total button count
    maxId: 10,
  };

  // Keep track of a roving index. The active roving tabIndex
  // is set to 0, and all other elements are set to -1.
  const [rovingElement, setRovingElement] = useState(0);

  // An array of refs
  const buttonRefs = useRef([]).current;
  if (buttonRefs.length === 0) {
    // Initialize buttonRefs on first render only
    for (let i = 0; i <= buttonIds.maxId; i++) {
      buttonRefs.push(createRef());
    }
  }

  /**
   * Sets the element to be both focused and the active roving index.
   *
   * @param {number} index - Ordered index that matches the element
   */
  const setFocusedElement = index => {
    setRovingElement(index);
    buttonRefs[index].current.focus();
  };

  /**
   * Handles left and right arrow navigation as well as home and end
   * keys so the user may navigate the toolbar without multiple tab stops.
   *
   * @param {KeyboardEvent} e
   */
  const handleKeyDown = e => {
    let lowerLimit = 0;
    const upperLimit = buttonIds.maxId - 1;
    if (isPreviewing) {
      // When isPreviewing is true, only allow navigation of
      // the last 2 items.
      lowerLimit = buttonIds.help;
    }
    let newFocusedElement = null;
    switch (normalizeKeyName(e.key)) {
      case 'ArrowLeft':
        if (rovingElement <= lowerLimit) {
          newFocusedElement = upperLimit;
        } else {
          newFocusedElement = rovingElement - 1;
        }
        break;
      case 'ArrowRight':
        if (rovingElement >= upperLimit) {
          newFocusedElement = lowerLimit;
        } else {
          newFocusedElement = rovingElement + 1;
        }
        break;
      case 'Home':
        newFocusedElement = lowerLimit;
        break;
      case 'End':
        newFocusedElement = upperLimit;
        break;
    }
    if (newFocusedElement !== null) {
      setFocusedElement(newFocusedElement);
      e.preventDefault();
    }
  };

  /**
   * Returns the tab index value for a given element.
   * Each element should be set to -1 unless its the
   * active roving index, in which case it will be 0.
   *
   * @param {number} index - An index from `buttonIds`
   * @return {number}
   */
  const getTabIndex = index => {
    if (rovingElement === index) {
      return 0;
    } else {
      return -1;
    }
  };

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
      onKeyDown={handleKeyDown}
    >
      <ToolbarButton
        disabled={isPreviewing}
        iconName="format-bold"
        onClick={() => onCommand('bold')}
        shortcutKey={SHORTCUT_KEYS.bold}
        buttonRef={buttonRefs[buttonIds.bold]}
        tabIndex={getTabIndex(buttonIds.bold)}
        title="Bold"
      />
      <ToolbarButton
        disabled={isPreviewing}
        iconName="format-italic"
        onClick={() => onCommand('italic')}
        shortcutKey={SHORTCUT_KEYS.italic}
        buttonRef={buttonRefs[buttonIds.italic]}
        tabIndex={getTabIndex(buttonIds.italic)}
        title="Italic"
      />
      <ToolbarButton
        disabled={isPreviewing}
        iconName="format-quote"
        onClick={() => onCommand('quote')}
        shortcutKey={SHORTCUT_KEYS.quote}
        buttonRef={buttonRefs[buttonIds.quote]}
        tabIndex={getTabIndex(buttonIds.quote)}
        title="Quote"
      />
      <ToolbarButton
        disabled={isPreviewing}
        iconName="link"
        onClick={() => onCommand('link')}
        shortcutKey={SHORTCUT_KEYS.link}
        buttonRef={buttonRefs[buttonIds.link]}
        tabIndex={getTabIndex(buttonIds.link)}
        title="Insert link"
      />
      <ToolbarButton
        disabled={isPreviewing}
        iconName="image"
        onClick={() => onCommand('image')}
        shortcutKey={SHORTCUT_KEYS.image}
        buttonRef={buttonRefs[buttonIds.image]}
        tabIndex={getTabIndex(buttonIds.image)}
        title="Insert image"
      />
      <ToolbarButton
        disabled={isPreviewing}
        iconName="format-functions"
        onClick={() => onCommand('math')}
        buttonRef={buttonRefs[buttonIds.math]}
        tabIndex={getTabIndex(buttonIds.math)}
        title="Insert math (LaTeX is supported)"
      />
      <ToolbarButton
        disabled={isPreviewing}
        iconName="format-list-numbered"
        onClick={() => onCommand('numlist')}
        shortcutKey={SHORTCUT_KEYS.numlist}
        buttonRef={buttonRefs[buttonIds.numlist]}
        tabIndex={getTabIndex(buttonIds.numlist)}
        title="Numbered list"
      />
      <ToolbarButton
        disabled={isPreviewing}
        iconName="format-list-unordered"
        onClick={() => onCommand('list')}
        shortcutKey={SHORTCUT_KEYS.list}
        buttonRef={buttonRefs[buttonIds.list]}
        tabIndex={getTabIndex(buttonIds.list)}
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
          linkRef={buttonRefs[buttonIds.help]}
          tabIndex={getTabIndex(buttonIds.help)}
          title="Formatting help"
          aria-label="Formatting help"
        />
        <ToolbarButton
          label={isPreviewing ? 'Write' : 'Preview'}
          onClick={onTogglePreview}
          buttonRef={buttonRefs[buttonIds.preview]}
          tabIndex={getTabIndex(buttonIds.preview)}
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
 * @prop {({text: string}) => void} [onEditText]
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
  const handleCommand = command => {
    if (input.current) {
      handleToolbarCommand(command, input.current);
      onEditText({ text: input.current.value });
    }
  };

  const handleKeyDown = event => {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    for (let [command, key] of Object.entries(SHORTCUT_KEYS)) {
      if (key === normalizeKeyName(event.key)) {
        event.stopPropagation();
        event.preventDefault();
        handleCommand(command);
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
          onInput={e => {
            onEditText({
              text: /** @type {HTMLTextAreaElement} */ (e.target).value,
            });
          }}
          value={text}
          style={textStyle}
        />
      )}
    </div>
  );
}
