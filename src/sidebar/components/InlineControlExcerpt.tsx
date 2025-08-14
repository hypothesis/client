import type { ExcerptProps } from '@hypothesis/annotation-ui';
import { Excerpt } from '@hypothesis/annotation-ui';

import { applyTheme } from '../helpers/theme';
import { withServices } from '../service-context';

export type InlineControlExcerptProps = Omit<
  ExcerptProps,
  'inlineControl' | 'inlineControlStyle'
> & {
  // Injected
  settings: object;
};

/**
 * An `Excerpt` which implicitly has `inlineControls` set to `true` and the
 * inline control styles set based on currently configured theme
 */
function InlineControlExcerpt({
  settings,
  ...props
}: InlineControlExcerptProps) {
  return (
    <Excerpt
      {...props}
      inlineControl
      inlineControlStyle={applyTheme(['selectionFontFamily'], settings)}
    />
  );
}

export default withServices(InlineControlExcerpt, ['settings']);
