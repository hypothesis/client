import type { IconButtonProps } from '@hypothesis/frontend-shared';

import PressableIconButton from './PressableIconButton';

/**
 * Toggle button for the top bar, with a background to indicate its "pressed"
 * state.
 */
export default function TopBarToggleButton(buttonProps: IconButtonProps) {
  return (
    <PressableIconButton
      // The containing form has a white background. The top bar is only
      // 40px high. If we allow standard touch-minimum height here (44px),
      // the visible white background exceeds the height of the top bar in
      // touch contexts. Disable touch sizing via `size="custom"`, then
      // add back the width rule and padding to keep horizontal spacing
      // consistent.
      size="custom"
      classes="touch:min-w-touch-minimum p-1"
      {...buttonProps}
    />
  );
}
