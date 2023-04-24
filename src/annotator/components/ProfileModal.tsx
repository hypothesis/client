import { CancelIcon, IconButton } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useEffect, useRef, useState } from 'preact/hooks';

import type { Emitter, EventBus } from '../util/emitter';

export type ProfileConfig = { profileAppUrl: string } & Record<string, unknown>;

type ProfileModalProps = {
  eventBus: EventBus;
  config: ProfileConfig;
};

export default function ProfileModal({ eventBus, config }: ProfileModalProps) {
  const [isHidden, setIsHidden] = useState(true);
  const emitterRef = useRef<Emitter | null>(null);

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
    <div
      className="fixed z-max top-0 left-0 right-0 bottom-0 p-3 bg-black/50"
      data-testid="profile-outer"
    >
      <div className="relative w-full h-full" data-testid="profile-inner">
        <div className="absolute right-0 m-3">
          <IconButton
            title="Close the Profile"
            onClick={onClose}
            variant="dark"
            classes={classnames(
              // Remove the dark variant's background color to avoid
              // interfering with modal overlays. Re-activate the dark variant's
              // background color on hover.
              // See https://github.com/hypothesis/client/issues/3676
              '!bg-transparent enabled:hover:!bg-grey-3'
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
      </div>
    </div>
  );
}
