// @ts-nocheck - TS doesn't understand SVG imports.

import {
  arrowLeft,
  arrowRight,
  cancel,
  caretRight,
  caretUp,
  ccStd,
  ccZero,
  check,
  copy,
  edit,
  editorLatex,
  editorQuote,
  editorTextBold,
  editorTextItalic,
  email,
  external,
  flag,
  flagFilled,
  globe,
  groups,
  help,
  highlight,
  image,
  leave,
  link,
  listOrdered,
  listUnordered,
  logo,
  lock,
  plus,
  profile,
  refresh,
  restricted,
  search,
  share,
  socialFacebook,
  socialTwitter,
  trash,
} from '@hypothesis/frontend-shared/lib/icons';

// The following icons differ here from the shared-package versions
import annotateIcon from '../images/icons/annotate.svg';
import replyIcon from '../images/icons/reply.svg';
import sortIcon from '../images/icons/sort.svg';

// This is very similar to caretDown but is larger
import expandMenuIcon from '../images/icons/expand-menu.svg';

// Not in shared package
import pointerIcon from '../images/icons/pointer.svg';

/**
 * Set of icons used by the sidebar application via the `SvgIcon`
 * component.
 */
export default {
  add: plus,
  annotate: annotateIcon,
  'arrow-left': arrowLeft,
  'arrow-right': arrowRight,
  cancel,
  'caret-right': caretRight,
  'cc-std': ccStd,
  'cc-zero': ccZero,
  'collapse-menu': caretUp,
  collapsed: caretRight,
  copy,
  edit,
  email,
  'expand-menu': expandMenuIcon,
  error: cancel,
  external,
  facebook: socialFacebook,
  flag,
  'flag--active': flagFilled,
  'format-bold': editorTextBold,
  'format-functions': editorLatex,
  'format-italic': editorTextItalic,
  'format-list-numbered': listOrdered,
  'format-list-unordered': listUnordered,
  'format-quote': editorQuote,
  groups,
  help,
  highlight,
  image,
  leave,
  link,
  lock,
  logo,
  pointer: pointerIcon,
  profile,
  public: globe,
  refresh,
  restricted,
  reply: replyIcon,
  search,
  share,
  success: check,
  sort: sortIcon,
  trash,
  twitter: socialTwitter,
};
