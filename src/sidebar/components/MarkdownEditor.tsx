import {
  Button,
  IconButton,
  Link,
  useSyncedRef,
} from '@hypothesis/frontend-shared';
import {
  EditorLatexIcon,
  EditorQuoteIcon,
  EditorTextBoldIcon,
  EditorTextItalicIcon,
  HelpIcon,
  ImageIcon,
  LinkIcon,
  ListOrderedIcon,
  ListUnorderedIcon,
  useArrowKeyNavigation,
} from '@hypothesis/frontend-shared';
import type { IconComponent } from '@hypothesis/frontend-shared/lib/types';
import classnames from 'classnames';
import type { Ref, JSX } from 'preact';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';

import { isMacOS } from '../../shared/user-agent';
import type { Mention } from '../../types/api';
import type {
  UserItem,
  UsersForMentions,
} from '../helpers/mention-suggestions';
import {
  getContainingMentionOffsets,
  termBeforePosition,
  unwrapMentions,
} from '../helpers/mentions';
import {
  LinkType,
  convertSelectionToLink,
  toggleBlockStyle,
  toggleSpanStyle,
} from '../markdown-commands';
import type { EditorState } from '../markdown-commands';
import { getCaretCoordinates } from '../util/textarea-caret-position';
import MarkdownView from './MarkdownView';
import MentionSuggestionsPopover from './MentionSuggestionsPopover';

/**
 * Toolbar commands that modify the editor state. This excludes the Help link
 * and Preview buttons.
 */
type Command =
  | 'bold'
  | 'image'
  | 'italic'
  | 'link'
  | 'list'
  | 'math'
  | 'numlist'
  | 'quote';

/**
 * Mapping of toolbar command name to key for Ctrl+<key> keyboard shortcuts.
 * The shortcuts are taken from Stack Overflow's editor.
 */
const SHORTCUT_KEYS: Record<Command, string> = {
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
 */
function handleToolbarCommand(
  command: Command,
  inputEl: HTMLInputElement | HTMLTextAreaElement,
) {
  const update = (newStateFn: (prevState: EditorState) => EditorState) => {
    // Apply the toolbar command to the current state of the input field.
    const newState = newStateFn({
      text: inputEl.value,
      selectionStart: inputEl.selectionStart!,
      selectionEnd: inputEl.selectionEnd!,
    });

    // Update the input field to match the new state.
    inputEl.value = newState.text;
    inputEl.selectionStart = newState.selectionStart;
    inputEl.selectionEnd = newState.selectionEnd;

    // Restore input field focus which is lost when its contents are changed.
    inputEl.focus();
  };

  const insertMath = (state: EditorState) => {
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
      update(state =>
        toggleBlockStyle(state, lineIndex => `${lineIndex + 1}. `),
      );
      break;
    case 'list':
      update(state => toggleBlockStyle(state, '* '));
      break;
  }
}

type ToolbarButtonProps = {
  disabled?: boolean;
  icon?: IconComponent;
  label?: string;
  onClick: (e: MouseEvent) => void;
  shortcutKey?: string;
  title?: string;
};

function ToolbarButton({
  disabled = false,
  icon: Icon,
  label,
  onClick,
  shortcutKey,
  title = '',
}: ToolbarButtonProps) {
  const modifierKey = useMemo(() => (isMacOS() ? 'Cmd' : 'Ctrl'), []);

  let tooltip = title;
  if (shortcutKey) {
    tooltip += ` (${modifierKey}-${shortcutKey.toUpperCase()})`;
  }

  const buttonProps = {
    disabled,
    onClick,
    title: tooltip,
  };

  if (label) {
    return (
      <Button
        classes="p-1.5 text-grey-7 hover:text-grey-9"
        {...buttonProps}
        size="custom"
        variant="custom"
      >
        {label}
      </Button>
    );
  }
  return (
    <IconButton classes="px-2 py-2.5" {...buttonProps}>
      {Icon && (
        <Icon className="w-[10px] h-[10px] touch:w-[13px] touch:h-[13px]" />
      )}
    </IconButton>
  );
}

type TextAreaProps = {
  classes?: string;
  containerRef?: Ref<HTMLTextAreaElement>;
  mentionsEnabled: boolean;
  usersForMentions: UsersForMentions;
  onEditText: (text: string) => void;
};

function TextArea({
  classes,
  containerRef,
  mentionsEnabled,
  usersForMentions,
  onEditText,
  onKeyDown,
  ...restProps
}: TextAreaProps & JSX.TextareaHTMLAttributes) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [activeMention, setActiveMention] = useState<string>();
  const textareaRef = useSyncedRef(containerRef);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(0);
  const caretElementRef = useRef<HTMLDivElement>(null);
  const userSuggestions = useMemo(() => {
    if (
      !mentionsEnabled ||
      activeMention === undefined ||
      usersForMentions.status === 'loading'
    ) {
      return [];
    }

    return usersForMentions.users
      .filter(
        u =>
          // Match all users if the active mention is empty, which happens right
          // after typing `@`
          !activeMention ||
          `${u.username} ${u.displayName ?? ''}`
            .toLowerCase()
            .match(activeMention.toLowerCase()),
      )
      .slice(0, 10);
  }, [activeMention, mentionsEnabled, usersForMentions]);

  const checkForMentionAtCaret = useCallback(
    (textarea: HTMLTextAreaElement) => {
      if (!mentionsEnabled) {
        return;
      }

      // Re-position mention popover anchor element at the caret.
      const { x, y } = getCaretCoordinates(textarea);
      if (caretElementRef.current) {
        caretElementRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }

      const term = termBeforePosition(textarea.value, textarea.selectionStart);
      const isAtMention = term.startsWith('@');
      setPopoverOpen(isAtMention);
      setActiveMention(isAtMention ? term.substring(1) : undefined);

      // Reset highlighted suggestion when closing the popover
      if (!isAtMention) {
        setHighlightedSuggestion(0);
      }
    },
    [mentionsEnabled],
  );
  const insertMention = useCallback(
    (suggestion: UserItem) => {
      const textarea = textareaRef.current!;
      const { value } = textarea;
      const { start, end } = getContainingMentionOffsets(
        value,
        textarea.selectionStart,
      );
      const beforeMention = value.slice(0, start);
      const beforeCaret = `${beforeMention}@${suggestion.username} `;
      const afterMention = value.slice(end);

      // Set textarea value directly, set new caret position and keep it focused.
      textarea.value = `${beforeCaret}${afterMention}`;
      textarea.selectionStart = beforeCaret.length;
      textarea.selectionEnd = beforeCaret.length;
      textarea.focus();
      // Then update state to keep it in sync.
      onEditText(textarea.value);

      // Close popover and reset highlighted suggestion once the value is
      // replaced
      setPopoverOpen(false);
      setHighlightedSuggestion(0);
    },
    [onEditText, textareaRef],
  );

  const usersListboxId = useId();
  const accessibilityAttributes = useMemo((): JSX.TextareaHTMLAttributes => {
    if (!popoverOpen) {
      return {};
    }

    const selectedSuggestion = userSuggestions[highlightedSuggestion];
    const activeDescendant = selectedSuggestion
      ? `${usersListboxId}-${selectedSuggestion.username}`
      : undefined;

    return {
      // These attributes follow the MDN instructions for aria-autocomplete
      // See https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-autocomplete
      role: 'combobox',
      'aria-controls': usersListboxId,
      'aria-expanded': true,
      'aria-autocomplete': 'list',
      'aria-haspopup': 'listbox',
      'aria-activedescendant': activeDescendant,
    };
  }, [highlightedSuggestion, popoverOpen, userSuggestions, usersListboxId]);

  return (
    <div className="relative">
      <textarea
        className={classnames(
          'border rounded p-2',
          'text-color-text-light bg-grey-0',
          'focus:bg-white focus:outline-none focus:shadow-focus-inner',
          classes,
        )}
        onInput={(e: Event) => onEditText((e.target as HTMLInputElement).value)}
        {...restProps}
        // We listen for `keyup` to make sure the text in the textarea reflects
        // the just-pressed key when we evaluate it
        onKeyUp={e => {
          // `Esc` key is used to close the popover. Do nothing and let users
          // close it that way, even if the caret is in a mention.
          // `Enter` is handled on keydown. Do not handle it here.
          if (!['Escape', 'Enter'].includes(e.key)) {
            checkForMentionAtCaret(e.target as HTMLTextAreaElement);
          }
        }}
        onKeyDown={e => {
          // Invoke original handler if present
          onKeyDown?.(e);

          if (!popoverOpen || userSuggestions.length === 0) {
            return;
          }

          // When vertical arrows are pressed while the popover is open with
          // user suggestions, highlight the right one.
          // When `Enter` is pressed, insert highlighted one.
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedSuggestion(prev =>
              Math.min(prev + 1, userSuggestions.length - 1),
            );
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedSuggestion(prev => Math.max(prev - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            insertMention(userSuggestions[highlightedSuggestion]);
          }
        }}
        onClick={e => {
          e.stopPropagation();
          // When clicking the textarea, it's possible the caret is moved "into" a
          // mention, so we check if the popover should be opened
          checkForMentionAtCaret(e.target as HTMLTextAreaElement);
        }}
        ref={textareaRef}
        {...accessibilityAttributes}
      />
      <div
        ref={caretElementRef}
        className="absolute top-0 left-0 w-0 h-0 pointer-events-none"
      />
      {mentionsEnabled && (
        <MentionSuggestionsPopover
          open={popoverOpen}
          onClose={() => setPopoverOpen(false)}
          anchorElementRef={caretElementRef}
          loadingUsers={usersForMentions.status === 'loading'}
          users={userSuggestions}
          highlightedSuggestion={highlightedSuggestion}
          onSelectUser={insertMention}
          usersListboxId={usersListboxId}
        />
      )}
    </div>
  );
}

type ToolbarProps = {
  /** Editor's "Preview" mode is active */
  isPreviewing: boolean;

  /** Callback invoked when a toolbar button is clicked */
  onCommand: (command: Command) => void;

  showHelpLink: boolean;

  /** Callback invoked when the "Preview" toggle button is clicked */
  onTogglePreview: () => void;
};

/**
 * An array of toolbar elements with a roving tab stop. Left and right
 * array keys can be used to change focus of the elements. Home and end
 * keys will navigate to the first and last elements respectively.
 *
 * Canonical example
 * https://www.w3.org/TR/wai-aria-practices/examples/toolbar/toolbar.html
 */
function Toolbar({
  isPreviewing,
  onCommand,
  onTogglePreview,
  showHelpLink,
}: ToolbarProps) {
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
        'touch:h-auto touch:overflow-x-scroll touch:flex-nowrap touch:pb-2.5',
      )}
      data-testid="markdown-toolbar"
      role="toolbar"
      aria-label="Markdown editor toolbar"
      ref={toolbarContainer}
    >
      <ToolbarButton
        disabled={isPreviewing}
        icon={EditorTextBoldIcon}
        onClick={() => onCommand('bold')}
        shortcutKey={SHORTCUT_KEYS.bold}
        title="Bold"
      />
      <ToolbarButton
        disabled={isPreviewing}
        icon={EditorTextItalicIcon}
        onClick={() => onCommand('italic')}
        shortcutKey={SHORTCUT_KEYS.italic}
        title="Italic"
      />
      <ToolbarButton
        disabled={isPreviewing}
        icon={EditorQuoteIcon}
        onClick={() => onCommand('quote')}
        shortcutKey={SHORTCUT_KEYS.quote}
        title="Quote"
      />
      <ToolbarButton
        disabled={isPreviewing}
        icon={LinkIcon}
        onClick={() => onCommand('link')}
        shortcutKey={SHORTCUT_KEYS.link}
        title="Insert link"
      />
      <ToolbarButton
        disabled={isPreviewing}
        icon={ImageIcon}
        onClick={() => onCommand('image')}
        shortcutKey={SHORTCUT_KEYS.image}
        title="Insert image"
      />
      <ToolbarButton
        disabled={isPreviewing}
        icon={EditorLatexIcon}
        onClick={() => onCommand('math')}
        title="Insert math (LaTeX is supported)"
      />
      <ToolbarButton
        disabled={isPreviewing}
        icon={ListOrderedIcon}
        onClick={() => onCommand('numlist')}
        shortcutKey={SHORTCUT_KEYS.numlist}
        title="Numbered list"
      />
      <ToolbarButton
        disabled={isPreviewing}
        icon={ListUnorderedIcon}
        onClick={() => onCommand('list')}
        shortcutKey={SHORTCUT_KEYS.list}
        title="Bulleted list"
      />
      <div className="grow flex justify-end">
        {showHelpLink && (
          <Link
            classes="text-grey-7 hover:!text-grey-7"
            href="https://web.hypothes.is/help/formatting-annotations-with-markdown/"
            target="_blank"
            title="Formatting help"
            aria-label="Formatting help"
            underline="none"
            variant="custom"
          >
            <div
              className={classnames(
                'flex justify-center items-center',
                'touch:h-touch-minimum touch:w-touch-minimum',
                'px-2 py-2.5 touch:p-0',
              )}
            >
              <HelpIcon className="w-2.5 h-2.5" />
            </div>
          </Link>
        )}

        <ToolbarButton
          label={isPreviewing ? 'Write' : 'Preview'}
          onClick={onTogglePreview}
        />
      </div>
    </div>
  );
}

export type MarkdownEditorProps = {
  /**
   * Whether the at-mentions feature ir enabled or not.
   * Defaults to false.
   */
  mentionsEnabled?: boolean;

  /** An accessible label for the input field */
  label: string;

  /** Additional CSS properties to apply to the input field and rendered preview */
  textStyle?: Record<string, string>;

  /** The markdown text to edit */
  text: string;

  onEditText?: (text: string) => void;

  /** Whether to display the formatting help link in the toolbar. */
  showHelpLink?: boolean;

  /**
   * Base list of users used to populate the @mentions suggestions, when
   * `mentionsEnabled` is `true`.
   * The list will be filtered and narrowed down based on the partial mention.
   * The mention can still be set manually. It is not restricted to the items on
   * this list.
   */
  usersForMentions: UsersForMentions;

  /** List of mentions extracted from the annotation text. */
  mentions?: Mention[];
};

/**
 * Viewer/editor for the body of an annotation in markdown format.
 */
export default function MarkdownEditor({
  mentionsEnabled = false,
  label,
  onEditText = () => {},
  text,
  textStyle = {},
  showHelpLink = true,
  usersForMentions,
  mentions,
}: MarkdownEditorProps) {
  // Whether the preview mode is currently active.
  const [preview, setPreview] = useState(false);

  // The input element where the user inputs their comment.
  const input = useRef<HTMLTextAreaElement>(null);

  const textWithoutMentionTags = useMemo(() => unwrapMentions(text), [text]);

  useEffect(() => {
    if (!preview) {
      input.current?.focus();
    }
  }, [preview]);

  const togglePreview = () => setPreview(!preview);

  const handleCommand = (command: Command) => {
    if (input.current) {
      handleToolbarCommand(command, input.current);
      onEditText(input.current.value);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    for (const [command, key] of Object.entries(SHORTCUT_KEYS)) {
      if (key === event.key) {
        event.stopPropagation();
        event.preventDefault();
        handleCommand(command as Command);
      }
    }
  };

  return (
    <div className="leading-none">
      <Toolbar
        onCommand={handleCommand}
        isPreviewing={preview}
        onTogglePreview={togglePreview}
        showHelpLink={showHelpLink}
      />
      {preview ? (
        <MarkdownView
          markdown={text}
          classes="border bg-grey-1 p-2"
          style={textStyle}
          mentions={mentions}
          mentionsEnabled={mentionsEnabled}
        />
      ) : (
        <TextArea
          aria-label={label}
          placeholder={label}
          dir="auto"
          classes={classnames(
            'w-full min-h-[8em] resize-y',
            // Turn off border-radius on top edges to align with toolbar above
            'rounded-t-none',
            // Larger font on touch devices
            'text-base touch:text-touch-base',
          )}
          containerRef={input}
          onKeyDown={handleKeyDown}
          onEditText={onEditText}
          value={textWithoutMentionTags}
          style={textStyle}
          mentionsEnabled={mentionsEnabled}
          usersForMentions={usersForMentions}
        />
      )}
    </div>
  );
}
