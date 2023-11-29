import type { IconButtonProps } from '@hypothesis/frontend-shared';
import { IconButton } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

export type PressableIconButtonProps = IconButtonProps;

/**
 * An IconButton which can be used as a toggle with a more visible pressed state.
 * Appropriate when the pressed state is not otherwise obvious from the context.
 */
export default function PressableIconButton({
  classes,
  ...rest
}: PressableIconButtonProps) {
  return (
    <IconButton
      {...rest}
      classes={classnames(
        classes,
        'border border-transparent',
        'aria-pressed:border-grey-3 aria-pressed:bg-grey-1',
      )}
    />
  );
}
