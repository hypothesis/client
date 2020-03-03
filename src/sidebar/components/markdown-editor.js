import classnames from 'classnames';
import { createElement } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import propTypes from 'prop-types';

import {
  LinkType,
  convertSelectionToLink,
  toggleBlockStyle,
  toggleSpanStyle,
} from '../markdown-commands';

import MarkdownView from './markdown-view';
import SvgIcon from './svg-icon';

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
 * @param {HTMLInputElement} inputEl
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

function ToolbarButton({
  disabled = false,
  iconName,
  label = null,
  onClick,
  shortcutKey,
  title,
}) {
  let tooltip = title;
  if (shortcutKey) {
    const modifierKey =
      window.navigator.userAgent.indexOf('Mac OS') !== -1 ? 'Cmd' : 'Ctrl';
    tooltip += ` (${modifierKey}-${shortcutKey.toUpperCase()})`;
  }

  return (
    <button
      className={classnames(
        'markdown-editor__toolbar-button',
        label && 'is-text'
      )}
      disabled={disabled}
      onClick={onClick}
      title={tooltip}
    >
      {iconName && (
        <SvgIcon
          name={iconName}
          className="markdown-editor__toolbar-button-icon"
        />
      )}
      {label}
    </button>
  );
}

ToolbarButton.propTypes = {
  disabled: propTypes.bool,
  iconName: propTypes.string,
  label: propTypes.string,
  onClick: propTypes.func,
  shortcutKey: propTypes.string,
  title: propTypes.string,
};

function Toolbar({ isPreviewing, onCommand, onTogglePreview }) {
  return (
    <div
      className="markdown-editor__toolbar"
      role="toolbar"
      aria-label="Markdown editor toolbar"
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
      <span className="u-stretch" />
      <div className="markdown-editor__toolbar-help-link">
        <a
          href="https://web.hypothes.is/help/formatting-annotations-with-markdown/"
          target="_blank"
          rel="noopener noreferrer"
          className="markdown-editor__toolbar-button"
          title="Formatting help"
        >
          <SvgIcon
            name="help"
            className="markdown-editor__toolbar-button-icon"
          />
        </a>
      </div>
      <ToolbarButton
        label={isPreviewing ? 'Write' : 'Preview'}
        onClick={onTogglePreview}
      />
    </div>
  );
}

Toolbar.propTypes = {
  /** `true` if the editor's "Preview" mode is active. */
  isPreviewing: propTypes.bool,

  /** Callback invoked with the selected command when a toolbar button is clicked. */
  onCommand: propTypes.func,

  /** Callback invoked when the "Preview" toggle button is clicked. */
  onTogglePreview: propTypes.func,
};

/**
 * Viewer/editor for the body of an annotation in markdown format.
 */
export default function MarkdownEditor({
  label = '',
  onEditText = () => {},
  text = '',
}) {
  /** Whether the preview mode is currently active. */
  const [preview, setPreview] = useState(false);

  /** The input element where the user inputs their comment. */
  const input = useRef(null);

  useEffect(() => {
    if (!preview) {
      input.current.focus();
    }
  }, [preview]);

  const togglePreview = () => setPreview(!preview);
  const handleCommand = command => {
    const inputEl = input.current;
    handleToolbarCommand(command, inputEl);
    onEditText({ text: inputEl.value });
  };

  const handleKeyDown = event => {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    for (let [command, key] of Object.entries(SHORTCUT_KEYS)) {
      if (key === event.key) {
        event.stopPropagation();
        event.preventDefault();
        handleCommand(command);
      }
    }
  };

  return (
    <div>
      <Toolbar
        onCommand={handleCommand}
        isPreviewing={preview}
        onTogglePreview={togglePreview}
      />
      {preview ? (
        <MarkdownView
          textClass={{ 'markdown-editor__preview': true }}
          markdown={text}
        />
      ) : (
        <textarea
          aria-label={label}
          className="markdown-editor__input"
          dir="auto"
          ref={input}
          onClick={e => e.stopPropagation()}
          onKeydown={handleKeyDown}
          onInput={e => onEditText({ text: e.target.value })}
          value={text}
        />
      )}
    </div>
  );
}

MarkdownEditor.propTypes = {
  /**
   * An accessible label for the input field.
   */
  label: propTypes.string.isRequired,

  /** The markdown text to edit. */
  text: propTypes.string,

  /**
   * Callback invoked with `{ text }` object when user edits text.
   *
   * TODO: Simplify this callback to take just a string rather than an object
   * once the parent component is converted to Preact.
   */
  onEditText: propTypes.func,
};
