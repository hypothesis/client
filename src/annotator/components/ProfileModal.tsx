import { CancelIcon, IconButton } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useEffect, useRef, useState } from 'preact/hooks';

import type { Events } from '../../types/annotator';
import type { Emitter, EventBus } from '../util/emitter';
import ModalDialog from './ModalDialog';

export type ProfileConfig = { profileAppUrl: string } & Record<string, unknown>;

type ProfileModalProps = {
  eventBus: EventBus<Events>;
  config: ProfileConfig;
};

export default function ProfileModal({ eventBus, config }: ProfileModalProps) {
  const [isHidden, setIsHidden] = useState(true);
  const emitterRef = useRef<Emitter<Events> | null>(null);

  useEffect(() => {
    const emitter = eventBus.createEmitter();
    emitter.subscribe('openProfile', () => {
      setIsHidden(false);
    });
    emitterRef.current = emitter;

    return () => {
      emitter.destroy();
    };
  }, [eventBus]);

  const onClose = () => {
    setIsHidden(true);
    emitterRef.current?.publish('closeProfile');
  };

  if (isHidden) {
    return null;
  }

  return (
    <ModalDialog
      closed={isHidden}
      onClose={onClose}
      data-testid="profile-outer"
      aria-label="Hypothesis profile"
    >
      <div className="absolute right-0 m-3">
        <IconButton
          title="Close profile dialog"
          onClick={onClose}
          variant="dark"
          classes={classnames(
            // Remove the dark variant's background color to avoid
            // interfering with modal overlays. Re-activate the dark variant's
            // background color on hover.
            // See https://github.com/hypothesis/client/issues/3676
            '!bg-transparent enabled:hover:!bg-grey-3',
          )}
        >
          <CancelIcon className="w-4 h-4" />
        </IconButton>
      </div>
      <iframe
        title={'Hypothesis profile'}
        className="h-full w-full border-0"
        src={config.profileAppUrl}
      />
    </ModalDialog>
  );
}
