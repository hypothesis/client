import {
  Button,
  IconButton,
  Link,
  Popover,
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
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import { ListenerCollection } from '../../shared/listener-collection';
import { isMacOS } from '../../shared/user-agent';
import {
  LinkType,
  convertSelectionToLink,
  toggleBlockStyle,
  toggleSpanStyle,
} from '../markdown-commands';
import type { EditorState } from '../markdown-commands';
import MarkdownView from './MarkdownView';

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
};

function TextArea({
  classes,
  containerRef,
  ...restProps
}: TextAreaProps & JSX.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const textareaRef = useSyncedRef(containerRef);
  const anchorContainerRef = useRef<HTMLDivElement | null>(null);
  const preAnchorRef = useRef<HTMLSpanElement | null>(null);
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const postAnchorRef = useRef<HTMLSpanElement | null>(null);
  const [open, setPopoverOpen] = useState(false);

  useEffect(() => {
    const textarea = textareaRef.current!;
    const anchorContainer = anchorContainerRef.current!;
    const preAnchor = preAnchorRef.current!;
    const anchor = anchorRef.current!;
    const postAnchor = postAnchorRef.current!;
    const listenerCollection = new ListenerCollection();

    // Keep content in the anchor element in sync with the textarea
    const keepContentInSync = (e: KeyboardEvent) => {
      const typedKey = e.key;

      // TODO
      //  - When pressing backspace, check if we reach an at mention and open
      //    popover if so
      //  - When pressing backspace, check if we removed the at mention
      //    entirely, and close popover if so
      //  - Allow arrow-key navigation in suggestions, but without removing the
      //    focus from the textarea

      if (!open && typedKey === '@') {
        // When '@' is typed while the popover was closed, sync content with the
        // anchors and open popover
        const value = textarea.value;
        const atMentionStart = textarea.selectionStart - 1;
        const atMentionEnd = atMentionStart + 1;

        const contentBeforeAtMention = value.substring(0, atMentionStart - 1);
        const atMention = value.substring(atMentionStart, atMentionEnd);
        const contentAfterAtMention = value.substring(atMentionEnd + 1);

        preAnchor.textContent = contentBeforeAtMention;
        anchor.textContent = atMention;
        postAnchor.textContent = contentAfterAtMention;

        // Right before opening the popover, make scrolls match
        anchorContainer.scrollTop = textarea.scrollTop;
        setPopoverOpen(true);
      } else if (open && (typedKey === ' ' || typedKey === 'Enter')) {
        // Close popover as soon as an empty character is written
        setPopoverOpen(false);
      } else if (open) {
        // When the popover is open, append written characters to the anchor
        anchor.textContent = `${anchor.textContent}${typedKey}`;
      }
    };
    listenerCollection.add(textarea, 'keydown', keepContentInSync);

    return () => {
      listenerCollection.removeAll();
    };
  }, [anchorContainerRef, anchorRef, open, textareaRef]);

  return (
    <>
      <div className="relative">
        <div
          className={classnames(
            // Consistent dimensions, font size and line height with textarea
            'border p-2 text-base touch:text-touch-base',
            'invisible absolute top-0 left-0 right-0 h-[calc(100%-2px)] -z-1',
            'overflow-y-auto whitespace-pre-wrap break-words',
          )}
          ref={anchorContainerRef}
        >
          <span ref={preAnchorRef} />
          <span ref={anchorRef} />
          <span ref={postAnchorRef} />
        </div>
        <textarea
          className={classnames(
            'border rounded p-2',
            'text-color-text-light bg-grey-0',
            'focus:bg-white focus:outline-none focus:shadow-focus-inner',
            classes,
          )}
          {...restProps}
          ref={textareaRef}
        />
        <Popover
          open={open}
          anchorElementRef={anchorRef}
          onClose={() => setPopoverOpen(false)}
          classes="p-2"
        >
          Suggested users
        </Popover>
      </div>
    </>
  );
}

type ToolbarProps = {
  /** Editor's "Preview" mode is active */
  isPreviewing: boolean;

  /** Callback invoked when a toolbar button is clicked */
  onCommand: (command: Command) => void;

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
function Toolbar({ isPreviewing, onCommand, onTogglePreview }: ToolbarProps) {
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

        <ToolbarButton
          label={isPreviewing ? 'Write' : 'Preview'}
          onClick={onTogglePreview}
        />
      </div>
    </div>
  );
}

export type MarkdownEditorProps = {
  /** An accessible label for the input field */
  label: string;

  /** Additional CSS properties to apply to the input field and rendered preview */
  textStyle?: Record<string, string>;

  /** The markdown text to edit */
  text: string;

  onEditText?: (text: string) => void;
};

/**
 * Viewer/editor for the body of an annotation in markdown format.
 */
export default function MarkdownEditor({
  label,
  onEditText = () => {},
  text,
  textStyle = {},
}: MarkdownEditorProps) {
  // Whether the preview mode is currently active.
  const [preview, setPreview] = useState(false);

  // The input element where the user inputs their comment.
  const input = useRef<HTMLTextAreaElement>(null);

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
          onClick={(e: Event) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
          onInput={(e: Event) =>
            onEditText((e.target as HTMLInputElement).value)
          }
          value={text}
          style={textStyle}
        />
      )}
    </div>
  );
}
